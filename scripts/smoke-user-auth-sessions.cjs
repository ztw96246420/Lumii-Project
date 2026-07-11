#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const PHONE = '19900006601';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-user-auth-sessions-'));
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
  backendProcess.stdout.on('data', (chunk) => {
    if (process.env.SMOKE_VERBOSE) process.stdout.write(chunk);
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
    await request('/auth/sms/send', {
      body: { deviceId: 'android-auth-device-1', phone: PHONE },
      headers: {
        'user-agent': 'LumiiAuthSmoke/1.0 send',
        'x-forwarded-for': '203.0.113.8',
        'x-lumii-device-id': 'android-auth-device-1',
      },
      method: 'POST',
    });

    const login = await request('/auth/sms/verify', {
      body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone: PHONE },
      headers: {
        'user-agent': 'LumiiAuthSmoke/1.0 verify',
        'x-forwarded-for': '203.0.113.9',
      },
      method: 'POST',
    });
    const userToken = login.data?.token;
    assert.ok(userToken, 'missing user token after SMS verify');

    const adminToken = await loginAdmin();
    const users = await request('/admin/users', { token: adminToken });
    const userRow = users.data.find((item) => item.phone === PHONE);
    assert.ok(userRow, 'admin users should include SMS login user');
    assert.equal(userRow.authSessionSummary?.total, 1);
    assert.equal(userRow.authSessionSummary?.latest?.lastIp, '203.0.113.9');
    assert.equal(userRow.authSessionSummary?.latest?.deviceIdTail, 'device-1');
    assert.ok(userRow.authSessionSummary?.latest?.deviceIdHash, 'latest session should expose device hash');

    const refresh = await request('/auth/token/refresh', {
      headers: {
        'user-agent': 'LumiiAuthSmoke/1.0 refresh',
        'x-forwarded-for': '203.0.113.10',
      },
      method: 'POST',
      token: userToken,
    });
    const refreshedToken = refresh.data?.token;
    assert.ok(refreshedToken, 'missing refreshed token');
    assert.notEqual(refreshedToken, userToken, 'refresh should issue a new token');

    const beforeLogout = await request(`/admin/users/${encodeURIComponent(PHONE)}`, { token: adminToken });
    assert.equal(beforeLogout.data.authSessions.length, 2);
    assert.equal(beforeLogout.data.authSessions[0].deviceIdHash, beforeLogout.data.authSessions[1].deviceIdHash, 'refresh must preserve the device identity');
    assert.equal(beforeLogout.data.authSessions[0].deviceIdTail, 'device-1');

    await request('/auth/logout', {
      headers: {
        'user-agent': 'LumiiAuthSmoke/1.0 logout',
        'x-forwarded-for': '203.0.113.11',
      },
      method: 'POST',
      token: refreshedToken,
    });

    const detail = await request(`/admin/users/${encodeURIComponent(PHONE)}`, { token: adminToken });
    assert.equal(detail.data.authSessionSummary?.total, 2);
    assert.equal(detail.data.authSessions.length, 2);
    assert.equal(detail.data.authSessions[0].status, 'revoked');
    assert.equal(detail.data.authSessions[0].revokedIp, '203.0.113.11');
    assert.equal(detail.data.authSessions[1].status, 'revoked');
    assert.equal(detail.data.authSessions[1].lastIp, '203.0.113.10');
    assert.equal(detail.data.authSessions[1].revokedIp, '203.0.113.11');
    const oldTokenAfterLogout = await request('/me', { expectedStatus: 401, token: userToken });
    assert.equal(oldTokenAfterLogout.error?.code, 'AUTH_REQUIRED');
    const refreshedTokenAfterLogout = await request('/me', { expectedStatus: 401, token: refreshedToken });
    assert.equal(refreshedTokenAfterLogout.error?.code, 'AUTH_REQUIRED');

    const timeline = await request(`/admin/users/${encodeURIComponent(PHONE)}/timeline?kind=account`, { token: adminToken });
    assert.ok(timeline.data.items.some((item) => item.targetType === 'auth_session'), 'account timeline should include auth sessions');

    const beforeSummary = await request(`/admin/users/${encodeURIComponent(PHONE)}/business-data-summary`, { token: adminToken });
    assert.equal(beforeSummary.data.summary.authSessions, 2);

    const approval = await request('/admin/data-clear-approvals', {
      body: { confirmation: PHONE, phone: PHONE, reason: 'smoke clear auth sessions' },
      method: 'POST',
      token: adminToken,
    });
    const approvalId = approval.data?.approval?.id;
    assert.ok(approvalId, 'missing data clear approval id');
    assert.equal(approval.data.approval.beforeSummary?.authSessions, 2);

    const approved = await request(`/admin/data-clear-approvals/${encodeURIComponent(approvalId)}/approve`, {
      body: { reason: 'smoke approve auth session clear' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approved.data.clearResult.after.authSessions, 0);

    const afterSummary = await request(`/admin/users/${encodeURIComponent(PHONE)}/business-data-summary`, { token: adminToken });
    assert.equal(afterSummary.data.summary.authSessions, 0);

    console.log('user auth sessions smoke passed');
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  fs.rmSync(tmpDir, { force: true, recursive: true });
  console.error(error);
  process.exit(1);
});
