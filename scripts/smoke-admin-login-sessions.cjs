#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-login-sessions-'));
const statePath = path.join(tmpDir, 'state.json');
const passwordRotatedAt = new Date().toISOString();
const tokenSecret = 'smoke-admin-login-session-secret-2026';
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
      const payload = await request('/health');
      if (payload.state === 'success') return;
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
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      AMAP_WEB_SERVICE_KEY: '',
      LUMII_ADMIN_LOGIN_SESSION_RETAIN: '40',
      LUMII_ADMIN_PASSWORD: 'LumiiAdmin@2026',
      LUMII_ADMIN_PASSWORD_ROTATED_AT: passwordRotatedAt,
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      LUMII_TOKEN_SECRET: tokenSecret,
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
    child.kill();
  });
}

async function login(userAgent) {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    headers: { 'User-Agent': userAgent },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing token for ${userAgent}`);
  return payload.data.token;
}

function legacyAdminToken() {
  const payloadPart = Buffer.from(JSON.stringify({
    adminId: 'admin-env',
    exp: Date.now() + 60_000,
    iat: Date.now(),
    jti: 'legacy-admin-session-smoke',
    role: 'admin',
    roleIds: ['admin'],
    username: 'admin',
    version: 2,
  }), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', tokenSecret).update(payloadPart).digest('base64url');
  return `lumii-admin-v1.${payloadPart}.${signature}`;
}

async function main() {
  await startBackend();
  try {
    await request('/admin/me', { expectedStatus: 401, token: legacyAdminToken() });
    const tokenA = await login('Mozilla/5.0 (Windows NT 10.0) Chrome/126.0 Device-A');
    const tokenB = await login('Mozilla/5.0 (Macintosh) Safari/17.5 Device-B');

    const sessionsA = await request('/admin/auth/sessions', { token: tokenA });
    assert.equal(sessionsA.data.summary.active, 2);
    assert.equal(sessionsA.data.sessions.length, 2);
    assert.equal(sessionsA.data.sessions.filter((item) => item.current).length, 1);
    assert.equal(sessionsA.data.sessions.some((item) => item.deviceLabel.includes('Chrome') && item.deviceLabel.includes('Windows')), true);
    assert.equal(sessionsA.data.sessions.some((item) => item.deviceLabel.includes('Safari') && item.deviceLabel.includes('macOS')), true);
    assert.equal(JSON.stringify(sessionsA.data).includes('tokenJti'), false, 'session API must not expose token JTI');

    const sessionsB = await request('/admin/auth/sessions', { token: tokenB });
    const sessionB = sessionsB.data.sessions.find((item) => item.current);
    assert.ok(sessionB?.id, 'missing current session B');
    const revokeB = await request(`/admin/auth/sessions/${encodeURIComponent(sessionB.id)}/revoke`, {
      body: { reason: 'Smoke remotely revokes the second admin device' },
      method: 'POST',
      token: tokenA,
    });
    assert.equal(revokeB.data.revoked, true);
    assert.equal(revokeB.data.session.status, 'revoked');
    await request('/admin/me', { expectedStatus: 401, token: tokenB });
    await request('/admin/me', { token: tokenA });

    await stopBackend();
    await startBackend();
    await request('/admin/me', { token: tokenA });
    const persisted = await request('/admin/auth/sessions', { token: tokenA });
    assert.equal(persisted.data.sessions.some((item) => item.id === sessionB.id && item.status === 'revoked'), true);
    assert.equal(persisted.data.summary.active, 1);

    const tokenC = await login('Mozilla/5.0 (X11; Linux x86_64) Firefox/128.0 Device-C');
    const revokeOthers = await request('/admin/auth/sessions/revoke-others', {
      body: { reason: 'Smoke keeps current device and exits every other device' },
      method: 'POST',
      token: tokenA,
    });
    assert.equal(revokeOthers.data.revoked, 1);
    assert.equal(revokeOthers.data.summary.active, 1);
    assert.equal(revokeOthers.data.sessions.find((item) => item.current)?.status, 'active');
    await request('/admin/me', { expectedStatus: 401, token: tokenC });
    await request('/admin/me', { token: tokenA });

    const missing = await request('/admin/auth/sessions/not-a-session/revoke', {
      body: { reason: 'Smoke rejects an unknown admin login session' },
      expectedStatus: 404,
      method: 'POST',
      token: tokenA,
    });
    assert.equal(missing.error.code, 'ADMIN_LOGIN_SESSION_NOT_FOUND');

    const logout = await request('/admin/auth/logout', { body: {}, method: 'POST', token: tokenA });
    assert.equal(logout.data.revoked, true);
    await request('/admin/me', { expectedStatus: 401, token: tokenA });

    const auditToken = await login('Mozilla/5.0 (Windows NT 10.0) Edg/126.0 Audit-Device');
    const audit = await request('/admin/audit-logs?q=admin.session', { token: auditToken });
    const actions = audit.data.items.map((item) => item.action);
    assert.equal(actions.includes('admin.session.revoke'), true);
    assert.equal(actions.includes('admin.session.revoke_others'), true);
    assert.equal(actions.includes('admin.session.logout'), true);

    const accounts = await request('/admin/accounts', { token: auditToken });
    assert.equal(accounts.data.security.checks.some((item) => item.key === 'login_session_management' && item.status === 'ok'), true);
    assert.equal(accounts.data.loginSessionSummary.active, 1);
    assert.equal(accounts.data.loginSessions.some((item) => item.current), true);

    const rawState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.ok(Array.isArray(rawState.adminLoginSessions));
    assert.ok(rawState.adminLoginSessions.length >= 4);
    assert.equal(JSON.stringify(rawState.adminLoginSessions).includes(tokenA), false, 'state must not persist full admin bearer tokens');

    console.log('admin login sessions smoke passed');
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
