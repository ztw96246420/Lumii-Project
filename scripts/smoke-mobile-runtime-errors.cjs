#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const PHONE = '19900006413';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-mobile-runtime-errors-'));
const statePath = path.join(tmpDir, 'state.json');
let backendProcess = null;
let baseUrl = '';

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

async function request(pathname, { body, expectedStatus = 200, method = 'GET', token } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    method,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;
  assert.equal(response.status, expectedStatus, `${method} ${pathname} expected ${expectedStatus}, got ${response.status}: ${text}`);
  return payload;
}

async function waitForBackend() {
  const deadline = Date.now() + 10_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const payload = await request('/legal/privacy');
      if (payload.state === 'success') return;
    } catch (error) {
      lastError = error;
      await delay(100);
    }
  }
  throw lastError || new Error('backend did not become ready');
}

async function startBackend(port) {
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      LUMII_RUNTIME_ENV: 'test',
      LUMII_SMS_PROVIDER: 'mock',
      LUMII_SMS_TEST_CODE: TEST_CODE,
      LUMII_STATE_STORAGE_DRIVER: 'json',
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '1000',
      SMS_DEVICE_DAILY_LIMIT: '1000',
      SMS_IP_DAILY_LIMIT: '1000',
      SPUG_SMS_KEY: '',
      SPUG_SMS_TEMPLATE_ID: '',
      TENCENTCLOUD_SECRET_ID: '',
      TENCENTCLOUD_SECRET_KEY: '',
      TENCENT_CLOUD_SECRET_ID: '',
      TENCENT_CLOUD_SECRET_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backendProcess.stderr.on('data', (chunk) => process.stderr.write(chunk));
  await waitForBackend();
}

async function stopBackend() {
  if (!backendProcess) return;
  const child = backendProcess;
  backendProcess = null;
  if (child.exitCode !== null) return;
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

async function loginUser() {
  await request('/auth/sms/send', {
    body: { deviceId: 'runtime-error-smoke-login', phone: PHONE },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 300_000, phone: PHONE },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing user token');
  return payload.data.token;
}

async function loginAdmin() {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing admin token');
  return payload.data.token;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser();
    const adminToken = await loginAdmin();

    const healthBefore = await request('/admin/system/health', { token: adminToken });
    const runtimeBefore = healthBefore.data.checks.find((item) => item.key === 'mobile_runtime_errors');
    assert.equal(runtimeBefore?.status, 'ok');

    const accepted = await request('/analytics/events', {
      body: {
        appBuild: 18,
        appVersion: '1.0.0',
        name: 'app.runtime_error',
        occurredAt: new Date().toISOString(),
        platform: 'android',
        properties: {
          componentStack: 'must never be stored',
          error: 'must never be stored',
          errorName: 'TypeError',
          exception: 'must never be stored',
          fatal: true,
          fingerprint: 'a1b2c3d4',
          kind: 'render',
          message: 'private user text must never be stored',
          occurrenceCount: 3,
          petName: 'must never be stored through an arbitrary key',
          phone: PHONE,
          stack: 'must never be stored',
          text: 'must never be stored',
          token: 'must-never-be-stored-token',
        },
        route: 'home',
        source: 'runtime_error',
      },
      method: 'POST',
      token: userToken,
    });
    assert.equal(accepted.data?.accepted, true);

    const analytics = await request('/admin/analytics?days=7&eventName=app.runtime_error', { token: adminToken });
    assert.equal(analytics.data.eventDetail.summary.matched, 1);
    const event = analytics.data.eventDetail.items[0];
    assert.equal(event.name, 'app.runtime_error');
    assert.deepEqual(event.properties, {
      errorName: 'TypeError',
      fatal: true,
      fingerprint: 'a1b2c3d4',
      kind: 'render',
      occurrenceCount: 3,
    });
    const storedState = fs.readFileSync(statePath, 'utf8');
    assert.doesNotMatch(storedState, /private user text|must never be stored|must-never-be-stored-token/);

    const healthAfter = await request('/admin/system/health', { token: adminToken });
    const runtimeAfter = healthAfter.data.checks.find((item) => item.key === 'mobile_runtime_errors');
    assert.equal(runtimeAfter?.status, 'warn');
    assert.match(runtimeAfter.detail, /3 次/);
    assert.match(runtimeAfter.evidence, /客户端自报仅作观测/);

    const alerts = await request('/admin/dashboard/alerts', { token: adminToken });
    const runtimeAlert = alerts.data.items.find((item) => item.key === 'mobile_runtime_errors');
    assert.equal(runtimeAlert?.severity, 'medium');
    assert.match(runtimeAlert.detail, /3 次脱敏运行异常/);

    const appSource = fs.readFileSync(path.join(rootDir, 'mobile', 'App.tsx'), 'utf8');
    const reporterSource = fs.readFileSync(path.join(rootDir, 'mobile', 'src', 'services', 'runtimeErrors.ts'), 'utf8');
    assert.match(appSource, /<LumiiErrorBoundary>/);
    assert.match(reporterSource, /RUNTIME_ERROR_QUEUE_LIMIT = 20/);
    assert.match(reporterSource, /name: 'app\.runtime_error'/);
    assert.doesNotMatch(reporterSource, /properties:\s*\{[^}]*message:/s);
    assert.doesNotMatch(reporterSource, /properties:\s*\{[^}]*stack:/s);

    console.log('mobile runtime error recovery and telemetry smoke passed');
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
