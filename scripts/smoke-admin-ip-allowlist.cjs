#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-ip-allowlist-'));
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
  assert.equal(
    response.status,
    expectedStatus,
    `${method} ${pathname} expected ${expectedStatus}, got ${response.status}: ${text}`,
  );
  return payload;
}

async function waitForBackend() {
  const deadline = Date.now() + 10_000;
  let lastError = null;
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
      AMAP_WEB_SERVICE_KEY: '',
      LUMII_ADMIN_IP_ALLOWLIST: '127.0.0.1,10.0.0.0/24',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '1000',
      SMS_DEVICE_DAILY_LIMIT: '1000',
      SMS_IP_DAILY_LIMIT: '1000',
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
    if (child.exitCode === null) child.kill();
  });
}

async function loginAdmin(headers = {}) {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    headers,
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing admin token');
  return payload.data.token;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminHtml = await request('/admin', { headers: { 'x-forwarded-for': '127.0.0.1' } });
    assert.ok(String(adminHtml).includes('Lumii'), 'admin HTML should be served for allowlisted IP');

    const blockedPage = await request('/admin', {
      expectedStatus: 403,
      headers: { 'x-forwarded-for': '203.0.113.9' },
    });
    assert.equal(blockedPage.error?.code, 'ADMIN_IP_NOT_ALLOWED');

    const blockedLogin = await request('/admin/auth/login', {
      body: { password: 'LumiiAdmin@2026', username: 'admin' },
      expectedStatus: 403,
      headers: { 'x-forwarded-for': '203.0.113.9' },
      method: 'POST',
    });
    assert.equal(blockedLogin.error?.code, 'ADMIN_IP_NOT_ALLOWED');

    const cidrToken = await loginAdmin({ 'x-forwarded-for': '10.0.0.42' });
    const accounts = await request('/admin/accounts', {
      headers: { 'x-forwarded-for': '10.0.0.42' },
      token: cidrToken,
    });
    assert.equal(accounts.data.security.ipAllowlist.configured, true);
    assert.equal(accounts.data.security.ipAllowlist.allowed, true);
    assert.equal(accounts.data.security.checks.some((item) => item.key === 'ip_allowlist' && item.status === 'ok'), true);

    const blockedAudit = await request('/admin/audit-logs?q=ip_allowlist', {
      headers: { 'x-forwarded-for': '10.0.0.42' },
      token: cidrToken,
    });
    assert.equal(blockedAudit.data.items.some((item) => item.action === 'admin.ip_allowlist.blocked'), true);
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
