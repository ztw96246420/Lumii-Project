#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-pet-media-replace-page-'));
const statePath = path.join(tmpDir, 'state.json');
const artifactsDir = path.join(rootDir, 'artifacts', 'admin-pet-media-replace');
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
      DEEPSEEK_API_KEY: '',
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
    }, 3000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill();
  });
}

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `admin-pet-media-page-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing token for ${phone}`);
  return payload.data.token;
}

async function main() {
  const playwright = requirePlaywright();
  const executablePath = browserExecutablePath();
  if (!executablePath) throw new Error('No Chrome/Edge executable found. Set PLAYWRIGHT_BROWSER_EXECUTABLE.');

  const port = await getFreePort();
  await startBackend(port);
  fs.mkdirSync(artifactsDir, { recursive: true });

  let browser = null;
  try {
    const phone = '19900008302';
    const userToken = await loginUser(phone);
    const created = await request('/pets', {
      body: {
        avatarUrl: 'https://example.com/storage/objects/page-original-avatar.png',
        birthday: '2021-05',
        breed: 'Westie',
        gender: 'female',
        name: 'PageLucky',
        species: 'dog',
        weightKg: 7.5,
      },
      method: 'POST',
      token: userToken,
    });
    const petId = created.data?.id;
    assert.ok(petId, 'missing created pet id');

    const nextAvatarUrl = 'https://example.com/storage/objects/page-replaced-avatar.png';
    const nextCoverUrl = 'https://example.com/storage/objects/page-replaced-cover.png';
    const dialogAnswers = [
      nextAvatarUrl,
      'page smoke replaces avatar',
      true,
      nextCoverUrl,
      'page smoke replaces cover',
      true,
    ];

    browser = await playwright.chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ viewport: { height: 900, width: 1440 } });
    const page = await context.newPage();
    page.on('dialog', async (dialog) => {
      const answer = dialogAnswers.shift();
      if (dialog.type() === 'confirm') {
        await (answer === false ? dialog.dismiss() : dialog.accept());
        return;
      }
      await dialog.accept(String(answer || ''));
    });

    await page.goto(`${baseUrl}/admin`, { timeout: 60_000, waitUntil: 'networkidle' });
    await page.locator('#passwordInput').fill('LumiiAdmin@2026');
    await page.locator('#loginBtn').click();
    await page.getByRole('button', { name: '宠物档案' }).click();
    await page.getByText('媒体治理动作').waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByText('PageLucky').waitFor({ state: 'visible', timeout: 30_000 });
    await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'pet-media-replace-before.png') });

    await page.locator(`button[data-action="pet-media-replace"][data-kind="avatar"][data-id="${petId}"]`).click();
    await page.getByText('宠物头像已替换').waitFor({ state: 'visible', timeout: 30_000 });
    await page.locator(`button[data-action="pet-media-replace"][data-kind="cover"][data-id="${petId}"]`).click();
    await page.getByText('宠友圈封面已替换').waitFor({ state: 'visible', timeout: 30_000 });
    await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'pet-media-replace-after.png') });

    const mobilePets = await request('/pets', { token: userToken });
    const mobilePet = mobilePets.data.find((item) => item.id === petId);
    assert.equal(mobilePet.avatarUrl, nextAvatarUrl);
    assert.equal(mobilePet.petCircleCoverImageUrl, nextCoverUrl);
    assert.equal(dialogAnswers.length, 0, 'not all expected dialogs were consumed');

    console.log('admin pet media replace page smoke passed');
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
