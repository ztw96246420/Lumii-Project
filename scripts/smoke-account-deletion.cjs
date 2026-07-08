#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const TEST_PHONE = '13900007771';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-account-deletion-'));
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
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      PET_AVATAR_ANIMATION_PROVIDER: 'mock',
      PET_AVATAR_PROVIDER: 'mock',
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

async function login(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `account-deletion-smoke-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.equal(payload.state, 'success');
  assert.ok(payload.data?.token);
  return payload.data;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const session = await login(TEST_PHONE);
    assert.equal(session.account.accountStatus, 'active');

    const requestPayload = await request('/account/delete/request', {
      method: 'POST',
      token: session.token,
    });
    assert.equal(requestPayload.state, 'success');
    assert.equal(requestPayload.data.requested, true);
    assert.ok(requestPayload.data.expiresAt > Date.now());

    const wrongCodePayload = await request('/account/delete/confirm', {
      body: { code: '000000' },
      expectedStatus: 400,
      method: 'POST',
      token: session.token,
    });
    assert.equal(wrongCodePayload.error.code, 'ACCOUNT_DELETE_CODE_INVALID');

    const confirmed = await request('/account/delete/confirm', {
      body: { code: TEST_CODE },
      method: 'POST',
      token: session.token,
    });
    assert.equal(confirmed.state, 'success');
    assert.equal(confirmed.data.status, 'deletion_pending');
    assert.equal(confirmed.data.account.accountStatus, 'deletion_pending');
    assert.equal(confirmed.data.account.accountDeletion.status, 'pending');
    assert.ok(Date.parse(confirmed.data.scheduledDeletionAt) > Date.now());

    const revokedPayload = await request('/me', {
      expectedStatus: 401,
      token: session.token,
    });
    assert.equal(revokedPayload.state, 'error');

    const resumed = await login(TEST_PHONE);
    assert.equal(resumed.account.accountStatus, 'active');
    assert.equal(resumed.account.accountDeletion, null);

    console.log('account deletion smoke passed');
  } finally {
    await stopBackend();
  }
}

main().catch(async (error) => {
  await stopBackend();
  console.error(error);
  process.exit(1);
});
