#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-http-access-logging-'));
const statePath = path.join(tmpDir, 'state.json');
const ADMIN_USERNAME = 'logging-admin';
const ADMIN_PASSWORD = 'LoggingProductionAdmin@2026';
const SENSITIVE_PHONE = '13900001111';
const SENSITIVE_QUERY = 'secret-query-value';
const SENSITIVE_AUTHORIZATION = 'Bearer client-private-token';
const CLIENT_REQUEST_ID = 'client-controlled-request-id';

let backendProcess = null;
let baseUrl = '';
let stdoutText = '';
let stderrText = '';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function accessEvents() {
  return stdoutText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{') && line.includes('"event":"lumii.http.access"'))
    .map((line) => JSON.parse(line));
}

async function waitForAccessEvents(count, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (accessEvents().length >= count) return;
    await delay(25);
  }
  assert.fail(`expected ${count} structured access events, received ${accessEvents().length}\n${stdoutText}\n${stderrText}`);
}

async function request(pathname, { body, expectedStatus = 200, headers = {}, method = 'GET', token } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    method,
  });
  const text = await response.text();
  const payload = text && response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : text;
  assert.equal(response.status, expectedStatus, `${method} ${pathname} expected ${expectedStatus}, got ${response.status}: ${text}`);
  const requestId = response.headers.get('x-request-id');
  assert.match(requestId || '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(requestId, CLIENT_REQUEST_ID, 'the server must not trust a caller-supplied request ID');
  assert.match(response.headers.get('access-control-expose-headers') || '', /X-Request-Id/i);
  return { payload, requestId };
}

async function rawMethodRequest(method, pathname, expectedStatus) {
  const target = new URL(baseUrl);
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: target.hostname, port: Number(target.port) });
    const chunks = [];
    socket.once('error', reject);
    socket.on('data', (chunk) => chunks.push(chunk));
    socket.once('connect', () => {
      socket.write(`${method} ${pathname} HTTP/1.1\r\nHost: ${target.host}\r\nAccept: application/json\r\nConnection: close\r\n\r\n`);
    });
    socket.once('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const [head, body = ''] = raw.split('\r\n\r\n');
      const status = Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0);
      assert.equal(status, expectedStatus, `raw ${method} ${pathname} expected ${expectedStatus}, got ${status}: ${raw}`);
      const requestId = head.match(/^x-request-id:\s*(.+)$/im)?.[1]?.trim() || '';
      assert.match(requestId, /^[0-9a-f-]{36}$/i);
      resolve({ payload: body, requestId });
    });
  });
}

async function waitForBackend() {
  const deadline = Date.now() + 15_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await request('/health');
      if (response.payload.state === 'success') return;
    } catch (error) {
      lastError = error;
      await delay(100);
    }
  }
  throw lastError || new Error('backend did not become ready');
}

async function startBackend() {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    AMAP_WEB_SERVICE_KEY: '',
    AUTH_TOKEN_SECRET: 'production-access-log-token-secret-at-least-thirty-two-characters',
    EXPO_PUSH_ENABLED: 'false',
    LUMII_ADMIN_IP_ALLOWLIST: '127.0.0.1',
    LUMII_ADMIN_PASSWORD: ADMIN_PASSWORD,
    LUMII_ADMIN_USERNAME: ADMIN_USERNAME,
    LUMII_BACKEND_HOST: '127.0.0.1',
    LUMII_BACKEND_STATE_PATH: statePath,
    LUMII_HTTP_ACCESS_LOG_INCLUDE_HEALTH: 'false',
    LUMII_HTTP_ACCESS_LOG_SLOW_MS: '100',
    LUMII_PUBLIC_API_BASE_URL: '',
    LUMII_SMS_PROVIDER: 'disabled',
    MEDIA_PUBLIC_PROBE_BASE_URL: '',
    NODE_ENV: 'production',
    STATE_BACKUP_ENABLED: 'false',
    TENCENTCLOUD_SECRET_ID: '',
    TENCENTCLOUD_SECRET_KEY: '',
    TENCENT_CLOUD_SECRET_ID: '',
    TENCENT_CLOUD_SECRET_KEY: '',
  };
  delete env.LUMII_HTTP_ACCESS_LOG_ENABLED;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backendProcess.stdout.on('data', (chunk) => { stdoutText += chunk.toString(); });
  backendProcess.stderr.on('data', (chunk) => { stderrText += chunk.toString(); });
  await waitForBackend();
}

async function stopBackend() {
  const child = backendProcess;
  backendProcess = null;
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolve();
    }, 3000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill();
  });
}

async function main() {
  await startBackend();
  try {
    const responses = [];
    responses.push(await request(`/legal/privacy?token=${SENSITIVE_QUERY}`, {
      headers: {
        Authorization: SENSITIVE_AUTHORIZATION,
        'User-Agent': `private-agent-${SENSITIVE_PHONE}`,
        'X-Request-Id': CLIENT_REQUEST_ID,
      },
    }));
    responses.push(await request(`/admin/users/${SENSITIVE_PHONE}?token=${SENSITIVE_QUERY}`, { expectedStatus: 401 }));
    responses.push(await request(`/pets/private-pet-${SENSITIVE_PHONE}?authorization=${SENSITIVE_QUERY}`, { expectedStatus: 401 }));
    responses.push(await request(`/${SENSITIVE_PHONE}/private-path?secret=${SENSITIVE_QUERY}`, { expectedStatus: 401 }));
    responses.push(await rawMethodRequest('PROPFIND', `/legal/privacy?secret=${SENSITIVE_QUERY}`, 401));

    const login = await request('/admin/auth/login', {
      body: { password: ADMIN_PASSWORD, username: ADMIN_USERNAME },
      method: 'POST',
    });
    responses.push(login);
    const health = await request('/admin/system/health', { token: login.payload.data.token });
    responses.push(health);

    assert.equal(new Set(responses.map((item) => item.requestId)).size, responses.length, 'every response must have a unique request ID');
    assert.equal(health.payload.data.httpAccessLogging.enabled, true, 'production must enable access logging by default');
    assert.equal(health.payload.data.httpAccessLogging.includeHealth, false);
    assert.equal(health.payload.data.httpAccessLogging.privacyProfile, 'route_bucket_no_identity_v1');
    assert.ok(health.payload.data.httpAccessLogging.totalRequests >= 7);
    assert.ok(health.payload.data.httpAccessLogging.clientErrors >= 4);
    assert.ok(health.payload.data.httpAccessLogging.skippedHealthRequests >= 1);
    assert.ok(health.payload.data.checks.some((item) => item.key === 'http_access_logging' && item.status === 'ok'));
    assert.ok(health.payload.data.dependencies.some((item) => item.key === 'http_access_logging' && item.status === 'ok'));

    await waitForAccessEvents(7);
    const events = accessEvents();
    const allowedFields = ['at', 'durationMs', 'event', 'method', 'outcome', 'requestId', 'routeBucket', 'schemaVersion', 'slow', 'statusCode'].sort();
    events.forEach((event) => {
      assert.deepEqual(Object.keys(event).sort(), allowedFields);
      assert.equal(event.event, 'lumii.http.access');
      assert.match(event.requestId, /^[0-9a-f-]{36}$/i);
    });
    assert.equal(events.some((event) => event.routeBucket === '/health'), false, 'successful health probes must be excluded by default');
    assert.ok(events.some((event) => event.routeBucket === '/legal' && event.statusCode === 200));
    assert.ok(events.some((event) => event.routeBucket === '/admin' && event.statusCode === 401));
    assert.ok(events.some((event) => event.routeBucket === '/pets' && event.statusCode === 401));
    assert.ok(events.some((event) => event.routeBucket === '/other' && event.statusCode === 401));
    assert.ok(events.some((event) => event.method === 'OTHER'), 'unknown client-controlled methods must be bucketed');
    const serializedEvents = events.map((event) => JSON.stringify(event)).join('\n').toLowerCase();
    [
      SENSITIVE_PHONE,
      SENSITIVE_QUERY.toLowerCase(),
      SENSITIVE_AUTHORIZATION.toLowerCase(),
      CLIENT_REQUEST_ID.toLowerCase(),
      ADMIN_PASSWORD.toLowerCase(),
      ADMIN_USERNAME.toLowerCase(),
      'authorization',
      'user-agent',
      '127.0.0.1',
    ].forEach((secret) => assert.equal(serializedEvents.includes(secret), false, `structured access logs leaked ${secret}`));
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  try { fs.rmSync(tmpDir, { force: true, recursive: true }); } catch {}
  console.error(error);
  if (stderrText) process.stderr.write(stderrText);
  process.exit(1);
});
