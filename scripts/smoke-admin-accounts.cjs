#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-accounts-'));
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
      LUMII_ADMIN_PASSWORD_MIN_LENGTH: '10',
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

async function loginAdmin(username = 'admin', password = 'LumiiAdmin@2026', expectedStatus = 200) {
  const payload = await request('/admin/auth/login', {
    body: { password, username },
    expectedStatus,
    method: 'POST',
  });
  return payload.data?.token || '';
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const envToken = await loginAdmin();
    const initial = await request('/admin/accounts', { token: envToken });
    assert.equal(initial.data.summary.activeAccounts, 1);
    assert.equal(initial.data.summary.stateAccounts, 0);

    const created = await request('/admin/accounts', {
      body: {
        displayName: '值班管理员',
        password: 'OpsAdmin2026',
        reason: 'smoke 创建后台管理员账号',
        roleIds: ['support'],
        username: 'ops_admin_01',
      },
      method: 'POST',
      token: envToken,
    });
    const account = created.data.account;
    assert.ok(account.id, 'created account id missing');
    assert.equal(account.username, 'ops_admin_01');
    assert.equal(account.status, 'active');
    assert.equal(account.source, 'state');
    assert.deepEqual(account.roleIds, ['support']);
    assert.equal(account.permissionKeys.includes('support.ticket.process'), true);
    assert.equal(account.permissionKeys.includes('user.clear_data'), false);
    assert.equal(account.passwordHash, undefined);

    const rawState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const stored = rawState.adminAccounts[account.id];
    assert.ok(stored.passwordHash, 'password hash should be persisted');
    assert.notEqual(stored.passwordHash, 'OpsAdmin2026');

    const opsToken = await loginAdmin('ops_admin_01', 'OpsAdmin2026');
    const me = await request('/admin/me', { token: opsToken });
    assert.equal(me.data.username, 'ops_admin_01');
    assert.deepEqual(me.data.roleIds, ['support']);
    await request('/admin/tickets', { token: opsToken });
    const deniedAccounts = await request('/admin/accounts', { expectedStatus: 403, token: opsToken });
    assert.equal(deniedAccounts.error.code, 'ADMIN_PERMISSION_DENIED');
    assert.equal(deniedAccounts.data.permission, 'admin.manage_roles');
    const deniedClear = await request('/admin/data-clear-approvals', { expectedStatus: 403, token: opsToken });
    assert.equal(deniedClear.data.permission, 'user.clear_data');
    const deniedExport = await request('/admin/exports/history', { expectedStatus: 403, token: opsToken });
    assert.equal(deniedExport.data.permission, 'data.export.download');

    await request(`/admin/accounts/${encodeURIComponent(account.id)}/disable`, {
      body: { reason: 'smoke 禁用后台管理员账号' },
      method: 'POST',
      token: envToken,
    });
    await request('/admin/me', { expectedStatus: 401, token: opsToken });
    const disabledLogin = await request('/admin/auth/login', {
      body: { password: 'OpsAdmin2026', username: 'ops_admin_01' },
      expectedStatus: 403,
      method: 'POST',
    });
    assert.equal(disabledLogin.error.code, 'ADMIN_ACCOUNT_DISABLED');

    await request(`/admin/accounts/${encodeURIComponent(account.id)}/enable`, {
      body: { reason: 'smoke 重新启用后台管理员账号' },
      method: 'POST',
      token: envToken,
    });
    const enabledToken = await loginAdmin('ops_admin_01', 'OpsAdmin2026');
    const maxAttempts = Number(initial.data.loginSecurity?.maxAttempts || 5);
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await loginAdmin('ops_admin_01', `WrongPassword${attempt}`, attempt >= maxAttempts ? 429 : 401);
    }
    const envStillLogsIn = await loginAdmin();
    assert.ok(envStillLogsIn, 'env admin should still login while support account is locked');
    await loginAdmin('ops_admin_01', 'OpsAdmin2026', 429);
    const lockedAccounts = await request('/admin/accounts', { token: envToken });
    const lockedSupport = lockedAccounts.data.accounts.find((item) => item.username === 'ops_admin_01');
    const envAccount = lockedAccounts.data.accounts.find((item) => item.username === 'admin');
    assert.equal(lockedSupport.status, 'locked');
    assert.equal(envAccount.status, 'active');
    assert.equal(lockedAccounts.data.loginSecurity.lockedAccountCount, 1);

    await request(`/admin/accounts/${encodeURIComponent(account.id)}/reset-password`, {
      body: { password: 'OpsAdmin2027', reason: 'smoke 重置后台管理员密码' },
      method: 'POST',
      token: envToken,
    });
    await request('/admin/me', { expectedStatus: 401, token: enabledToken });
    await loginAdmin('ops_admin_01', 'OpsAdmin2026', 401);
    const resetToken = await loginAdmin('ops_admin_01', 'OpsAdmin2027');
    assert.ok(resetToken, 'new password should login');

    const audit = await request('/admin/audit-logs?q=admin.account', { token: envToken });
    const actions = audit.data.items.map((item) => item.action);
    assert.equal(actions.includes('admin.account.create'), true);
    assert.equal(actions.includes('admin.account.disable'), true);
    assert.equal(actions.includes('admin.account.enable'), true);
    assert.equal(actions.includes('admin.account.reset_password'), true);

    const finalAccounts = await request('/admin/accounts', { token: envToken });
    assert.equal(finalAccounts.data.summary.stateAccounts, 1);
    assert.equal(finalAccounts.data.accounts.some((item) => item.username === 'ops_admin_01' && item.status === 'active'), true);
    assert.equal(finalAccounts.data.loginSecurity.lockedAccountCount, 0);
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
