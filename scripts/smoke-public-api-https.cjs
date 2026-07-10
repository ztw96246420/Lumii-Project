#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-public-api-https-'));
const statePath = path.join(tmpDir, 'state.json');
let backendProcess = null;
let baseUrl = '';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    method: options.method || 'GET',
  });
  const payload = await response.json();
  assert.equal(response.status, options.expectedStatus || 200, `${pathname}: ${JSON.stringify(payload)}`);
  return payload;
}

async function waitForBackend() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('backend start timeout');
}

async function startBackend(envOverrides = {}) {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      LUMII_BACKEND_STATE_PATH: statePath,
      LUMII_PUBLIC_API_BASE_URL: 'http://api.lumiiapp.cn',
      LUMII_PUBLIC_API_PROBE_CONNECT_ADDRESS: '',
      LUMII_PUBLIC_API_PROBE_TIMEOUT_MS: '1000',
      STATE_BACKUP_ENABLED: 'false',
      ...envOverrides,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  backendProcess.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  backendProcess.once('exit', (code) => {
    if (code && stderr) process.stderr.write(stderr);
  });
  await waitForBackend();
}

async function stopBackend() {
  const child = backendProcess;
  backendProcess = null;
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
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
    const login = await request('/admin/auth/login', {
      body: { password: 'LumiiAdmin@2026', username: 'admin' },
      method: 'POST',
    });
    const token = login.data.token;
    const health = await request('/admin/system/health', { token });
    assert.equal(health.data.publicApiProbe.status, 'bad');
    assert.match(health.data.publicApiProbe.detail, /must use HTTPS/);
    assert.ok(health.data.checks.some((item) => item.key === 'public_api_https' && item.status === 'bad'));

    const readiness = await request('/admin/launch/readiness', { token });
    const gap = readiness.data.gaps.find((item) => item.key === 'api_https');
    assert.ok(gap, 'launch readiness should include API HTTPS gap');
    assert.equal(gap.severity, 'P0');
    assert.equal(gap.status, 'blocked');
    assert.match(gap.requiredAction, /TCP 443/);
  } finally {
    await stopBackend();
  }

  const closedPort = await getFreePort();
  await startBackend({
    LUMII_PUBLIC_API_BASE_URL: `https://api.lumiiapp.cn:${closedPort}`,
    LUMII_PUBLIC_API_PROBE_CONNECT_ADDRESS: '127.0.0.1',
  });
  try {
    const login = await request('/admin/auth/login', {
      body: { password: 'LumiiAdmin@2026', username: 'admin' },
      method: 'POST',
    });
    const health = await request('/admin/system/health', { token: login.data.token });
    assert.equal(health.data.publicApiProbe.probeMode, 'local_tls_sni');
    assert.equal(health.data.publicApiProbe.connectAddress, '127.0.0.1');
    assert.equal(health.data.publicApiProbe.status, 'bad');
    assert.match(health.data.publicApiProbe.evidence, /via 127\.0\.0\.1 with SNI api\.lumiiapp\.cn/);
    assert.ok(health.data.checks.some((item) => item.key === 'public_api_https' && item.status === 'bad'));
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
  console.log('public API HTTPS readiness smoke passed');
}

main().catch(async (error) => {
  await stopBackend();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
