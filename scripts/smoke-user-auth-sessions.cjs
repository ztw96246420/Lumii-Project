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

async function loginUserDevice({ deviceId, sendIp, userAgent, verifyIp }) {
  await request('/auth/sms/send', {
    body: { deviceId, phone: PHONE },
    headers: {
      'user-agent': userAgent,
      'x-forwarded-for': sendIp,
      'x-lumii-device-id': deviceId,
    },
    method: 'POST',
  });
  const login = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone: PHONE },
    headers: {
      'user-agent': userAgent,
      'x-forwarded-for': verifyIp,
      'x-lumii-device-id': deviceId,
    },
    method: 'POST',
  });
  assert.ok(login.data?.token, `missing user token for ${deviceId}`);
  return login.data.token;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const firstDeviceId = 'android-auth-device-1';
    const secondDeviceId = 'ios-auth-device-2';
    const firstDeviceHeaders = {
      'user-agent': 'Lumii Android/1.0 okhttp',
      'x-forwarded-for': '203.0.113.12',
      'x-lumii-device-id': firstDeviceId,
    };
    const userToken = await loginUserDevice({
      deviceId: firstDeviceId,
      sendIp: '203.0.113.8',
      userAgent: firstDeviceHeaders['user-agent'],
      verifyIp: '203.0.113.9',
    });

    const adminToken = await loginAdmin();
    const users = await request('/admin/users', { token: adminToken });
    const userRow = users.data.find((item) => item.phone === PHONE);
    assert.ok(userRow, 'admin users should include SMS login user');
    assert.equal(userRow.authSessionSummary?.total, 1);
    assert.equal(userRow.authSessionSummary?.latest?.lastIp, '203.0.113.9');
    assert.equal(userRow.authSessionSummary?.latest?.deviceIdTail, 'device-1');
    assert.ok(userRow.authSessionSummary?.latest?.deviceIdHash, 'latest session should expose device hash');

    const secondDeviceToken = await loginUserDevice({
      deviceId: secondDeviceId,
      sendIp: '203.0.113.20',
      userAgent: 'Lumii iOS/1.0 iPhone',
      verifyIp: '203.0.113.21',
    });
    const deviceSessions = await request('/auth/sessions', {
      headers: firstDeviceHeaders,
      token: userToken,
    });
    assert.equal(deviceSessions.data.length, 2, 'two active devices should be listed');
    assert.equal(deviceSessions.data.filter((session) => session.current).length, 1, 'exactly one device should be current');
    assert.equal(deviceSessions.data.find((session) => session.current)?.platform, 'android');
    const otherSession = deviceSessions.data.find((session) => !session.current);
    assert.ok(otherSession?.id, 'other device should expose a revocable public session id');
    assert.equal(otherSession.platform, 'ios');
    for (const session of deviceSessions.data) {
      assert.deepEqual(
        Object.keys(session).sort(),
        ['current', 'deviceLabel', 'expiresAt', 'id', 'lastActiveAt', 'loginAt', 'platform'],
        'public session list must not expose token, IP, or raw device identifiers',
      );
    }
    const serializedSessions = JSON.stringify(deviceSessions.data);
    assert.ok(!serializedSessions.includes(secondDeviceId), 'raw device id must not be exposed');
    assert.ok(!serializedSessions.includes('tokenDigest'), 'token digest must not be exposed');
    assert.ok(!serializedSessions.includes('lastIp'), 'IP address must not be exposed');

    const revokeSingle = await request(`/auth/sessions/${encodeURIComponent(otherSession.id)}`, {
      headers: firstDeviceHeaders,
      method: 'DELETE',
      token: userToken,
    });
    assert.equal(revokeSingle.data.currentRevoked, false);
    assert.equal(revokeSingle.data.revoked, 1);
    assert.equal(revokeSingle.data.sessions.length, 1);
    assert.equal(revokeSingle.data.sessions[0].current, true);
    const revokedSecondDevice = await request('/me', { expectedStatus: 401, token: secondDeviceToken });
    assert.equal(revokedSecondDevice.error?.code, 'AUTH_REQUIRED');
    await request('/me', { headers: firstDeviceHeaders, token: userToken });

    const secondDeviceTokenAgain = await loginUserDevice({
      deviceId: secondDeviceId,
      sendIp: '203.0.113.22',
      userAgent: 'Lumii iOS/1.0 iPhone',
      verifyIp: '203.0.113.23',
    });
    const revokeOthers = await request('/auth/sessions/revoke-others', {
      headers: firstDeviceHeaders,
      method: 'POST',
      token: userToken,
    });
    assert.equal(revokeOthers.data.currentRevoked, false);
    assert.equal(revokeOthers.data.revoked, 1);
    assert.equal(revokeOthers.data.sessions.length, 1);
    assert.equal(revokeOthers.data.sessions[0].current, true);
    const revokedSecondDeviceAgain = await request('/me', { expectedStatus: 401, token: secondDeviceTokenAgain });
    assert.equal(revokedSecondDeviceAgain.error?.code, 'AUTH_REQUIRED');
    await request('/me', { headers: firstDeviceHeaders, token: userToken });

    const refresh = await request('/auth/token/refresh', {
      headers: { ...firstDeviceHeaders, 'x-forwarded-for': '203.0.113.10' },
      method: 'POST',
      token: userToken,
    });
    const refreshedToken = refresh.data?.token;
    assert.ok(refreshedToken, 'missing refreshed token');
    assert.notEqual(refreshedToken, userToken, 'refresh should issue a new token');

    const beforeLogout = await request(`/admin/users/${encodeURIComponent(PHONE)}`, { token: adminToken });
    assert.equal(beforeLogout.data.authSessions.length, 4);
    const activeBeforeLogout = beforeLogout.data.authSessions.filter((session) => session.status === 'active' || session.status === 'refreshed');
    const revokedSecondDeviceSessions = beforeLogout.data.authSessions.filter((session) => session.deviceIdTail === 'device-2');
    assert.equal(activeBeforeLogout.length, 2, 'only the current device refresh chain should remain active');
    assert.equal(activeBeforeLogout[0].deviceIdHash, activeBeforeLogout[1].deviceIdHash, 'refresh must preserve the device identity');
    assert.equal(activeBeforeLogout[0].deviceIdTail, 'device-1');
    assert.equal(revokedSecondDeviceSessions.length, 2);
    assert.ok(revokedSecondDeviceSessions.every((session) => session.status === 'revoked'));
    assert.ok(revokedSecondDeviceSessions.every((session) => /iPhone/i.test(session.lastUserAgent)), 'target device activity evidence must remain intact');
    assert.ok(revokedSecondDeviceSessions.every((session) => /Android/i.test(session.revokedUserAgent)), 'revocation evidence must identify the acting device');

    await request('/auth/logout', {
      headers: {
        'user-agent': 'LumiiAuthSmoke/1.0 logout',
        'x-forwarded-for': '203.0.113.11',
      },
      method: 'POST',
      token: refreshedToken,
    });

    const detail = await request(`/admin/users/${encodeURIComponent(PHONE)}`, { token: adminToken });
    assert.equal(detail.data.authSessionSummary?.total, 4);
    assert.equal(detail.data.authSessionSummary?.active, 0);
    assert.equal(detail.data.authSessions.length, 4);
    assert.ok(detail.data.authSessions.every((session) => session.status === 'revoked'));
    assert.equal(detail.data.authSessions.filter((session) => session.revokedIp === '203.0.113.11').length, 2);
    const oldTokenAfterLogout = await request('/me', { expectedStatus: 401, token: userToken });
    assert.equal(oldTokenAfterLogout.error?.code, 'AUTH_REQUIRED');
    const refreshedTokenAfterLogout = await request('/me', { expectedStatus: 401, token: refreshedToken });
    assert.equal(refreshedTokenAfterLogout.error?.code, 'AUTH_REQUIRED');

    const timeline = await request(`/admin/users/${encodeURIComponent(PHONE)}/timeline?kind=account`, { token: adminToken });
    assert.ok(timeline.data.items.some((item) => item.targetType === 'auth_session'), 'account timeline should include auth sessions');

    const sessionCountBeforeClear = detail.data.authSessions.length;
    const beforeSummary = await request(`/admin/users/${encodeURIComponent(PHONE)}/business-data-summary`, { token: adminToken });
    assert.equal(beforeSummary.data.summary.authSessions, sessionCountBeforeClear);

    const approval = await request('/admin/data-clear-approvals', {
      body: { confirmation: PHONE, phone: PHONE, reason: 'smoke clear auth sessions' },
      method: 'POST',
      token: adminToken,
    });
    const approvalId = approval.data?.approval?.id;
    assert.ok(approvalId, 'missing data clear approval id');
    assert.equal(approval.data.approval.beforeSummary?.authSessions, sessionCountBeforeClear);

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
