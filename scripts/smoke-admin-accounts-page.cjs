#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const artifactsDir = path.join(rootDir, 'artifacts', 'admin-accounts-page');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-accounts-page-'));
const statePath = path.join(tmpDir, 'state.json');
const lockedUserPhone = '13900007661';
let backendProcess = null;
let baseUrl = '';

function requirePlaywright() {
  const moduleNames = ['playwright-core', 'playwright'];
  const moduleDirs = [
    '',
    process.env.PLAYWRIGHT_MODULE_DIR || '',
    path.join(os.tmpdir(), 'lumii-playwright-core', 'node_modules'),
    'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules',
  ].filter(Boolean);
  for (const name of moduleNames) {
    try {
      return require(name);
    } catch {}
    for (const moduleDir of moduleDirs) {
      try {
        return require(path.join(moduleDir, name));
      } catch {}
    }
  }
  throw new Error('Playwright is not available. Install playwright or set PLAYWRIGHT_MODULE_DIR.');
}

function browserExecutablePath() {
  const candidates = [
    process.env.PLAYWRIGHT_BROWSER_EXECUTABLE,
    'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chromex.exe',
    'C:/Users/Administrator/AppData/Local/Microsoft/Edge/Bin/123.0.2420.97/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

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
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '1000',
      SMS_DEVICE_DAILY_LIMIT: '1000',
      SMS_IP_DAILY_LIMIT: '1000',
      SMS_LOGIN_ACCOUNT_MAX_FAILURES: '6',
      SMS_LOGIN_CLIENT_MAX_FAILURES: '3',
      SMS_LOGIN_FAILURE_WINDOW_MS: '60000',
      SMS_LOGIN_LOCK_MS: '60000',
      SMS_VERIFY_MAX_ATTEMPTS: '3',
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

async function loginAdmin() {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing admin token');
  return payload.data.token;
}

async function main() {
  fs.mkdirSync(artifactsDir, { recursive: true });
  const playwright = requirePlaywright();
  const executablePath = browserExecutablePath();
  if (!executablePath) throw new Error('No Chrome/Edge executable found. Set PLAYWRIGHT_BROWSER_EXECUTABLE.');

  const port = await getFreePort();
  await startBackend(port);
  const adminToken = await loginAdmin();

  let browser = null;
  try {
    const firstSms = await request('/auth/sms/send', {
      body: { deviceId: 'admin-visual-lock-device', phone: lockedUserPhone },
      method: 'POST',
    });
    await request('/auth/sms/verify', {
      body: { code: firstSms.data.code, deviceId: 'admin-visual-lock-device', phone: lockedUserPhone },
      method: 'POST',
    });
    await request('/auth/sms/send', {
      body: { deviceId: 'admin-visual-lock-device', phone: lockedUserPhone },
      method: 'POST',
    });
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const failed = await request('/auth/sms/verify', {
        body: { code: '000000', deviceId: 'admin-visual-lock-device', phone: lockedUserPhone },
        expectedStatus: attempt === 3 ? 429 : 400,
        method: 'POST',
      });
      assert.equal(failed.error.code, attempt === 3 ? 'SMS_LOGIN_LOCKED' : 'SMS_CODE_INVALID');
    }

    const activeAccount = await request('/admin/accounts', {
      body: {
        displayName: '视觉值班账号',
        password: 'VisualOps2026',
        reason: 'visual smoke creates active admin account',
        roleIds: ['support'],
        username: 'visual_ops',
      },
      method: 'POST',
      token: adminToken,
    });
    const departedAccount = await request('/admin/accounts', {
      body: {
        displayName: '视觉离职账号',
        password: 'VisualDeparted2026',
        reason: 'visual smoke creates departed admin account',
        roleIds: ['auditor'],
        username: 'visual_departed',
      },
      method: 'POST',
      token: adminToken,
    });
    await request(`/admin/accounts/${encodeURIComponent(departedAccount.data.account.id)}/offboard`, {
      body: { reason: 'visual smoke offboards departed admin account' },
      method: 'POST',
      token: adminToken,
    });
    const accounts = await request('/admin/accounts', { token: adminToken });
    assert.equal(accounts.data?.hardeningPlan?.complete, false, 'default temp backend should not be production-hardened');
    assert.equal(accounts.data.summary.offboardedAccounts, 1);

    browser = await playwright.chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ viewport: { height: 960, width: 1440 } });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/admin`, { timeout: 60_000, waitUntil: 'networkidle' });
    await page.locator('#passwordInput').fill('LumiiAdmin@2026');
    await page.locator('#loginBtn').click();
    await page.locator('#nav button[data-route="adminAccounts"]').click();
    await page.locator('button[data-action="admin-security-package-generate"]').waitFor({ timeout: 30_000 });
    await page.locator(`button[data-action="admin-account-offboard"][data-id="${activeAccount.data.account.id}"]`).waitFor({ timeout: 30_000 });
    await page.getByText('已离职停用；为保留审计边界，该账号不可恢复，请按需新建账号。').waitFor({ timeout: 30_000 });
    await page.getByText('离职停用', { exact: true }).first().waitFor({ timeout: 30_000 });

    let dialogIndex = 0;
    page.on('dialog', async (dialog) => {
      dialogIndex += 1;
      assert.equal(dialog.type(), 'prompt');
      await dialog.accept(dialogIndex === 1 ? 'admin' : 'visual smoke generates security package');
    });
    await page.locator('button[data-action="admin-security-package-generate"]').click();
    await page.locator('button[data-action="admin-security-package-clear"]').waitFor({ timeout: 30_000 });
    await page.locator('pre.prompt-preview').filter({ hasText: 'LUMII_ADMIN_PASSWORD=' }).waitFor({ timeout: 30_000 });
    await page.locator('pre.prompt-preview').filter({ hasText: 'otpauth://totp/' }).waitFor({ timeout: 30_000 });

    await page.locator('#nav button[data-route="users"]').click();
    const unlockButton = page.locator(`button[data-action="user-login-unlock"][data-phone="${lockedUserPhone}"]`);
    await unlockButton.waitFor({ timeout: 30_000 });
    await page.getByText('登录锁定', { exact: true }).first().waitFor({ timeout: 30_000 });
    await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'user-login-locked.png') });
    await unlockButton.click();
    await unlockButton.waitFor({ state: 'hidden', timeout: 30_000 });
    await page.getByText('短信登录限制已解除', { exact: true }).waitFor({ timeout: 30_000 });
    await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'user-login-unlocked.png') });
    const usersAfterUnlock = await request('/admin/users', { token: adminToken });
    assert.equal(usersAfterUnlock.data.find((item) => item.phone === lockedUserPhone)?.loginSecurity?.locked, false);

    console.log('admin accounts and user login lock page smoke passed');
  } finally {
    if (browser) await browser.close();
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
