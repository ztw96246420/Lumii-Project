#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-legal-page-'));
const statePath = path.join(tmpDir, 'state.json');
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
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
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

async function loginAdmin() {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing admin token');
  return payload.data.token;
}

async function main() {
  const playwright = requirePlaywright();
  const executablePath = browserExecutablePath();
  if (!executablePath) throw new Error('No Chrome/Edge executable found. Set PLAYWRIGHT_BROWSER_EXECUTABLE.');

  const port = await getFreePort();
  await startBackend(port);
  const adminToken = await loginAdmin();

  let browser = null;
  try {
    const legal = await request('/admin/legal-documents', { token: adminToken });
    assert.equal(legal.data?.summary?.total, 4, 'admin legal document API should expose 4 documents');

    browser = await playwright.chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ viewport: { height: 900, width: 1440 } });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/admin`, { timeout: 60_000, waitUntil: 'networkidle' });
    await page.locator('#passwordInput').fill('LumiiAdmin@2026');
    await page.locator('#loginBtn').click();
    await page.locator('button[data-route="legalDocuments"]').click();
    await page.locator('button[data-action="legal-doc-edit"]').first().waitFor({ timeout: 30_000 });
    await page.locator('button[data-action="legal-doc-approve"]').first().waitFor({ timeout: 30_000 });
    await page.locator('button[data-action="legal-doc-reset"]').first().waitFor({ timeout: 30_000 });

    assert.equal(await page.locator('button[data-action="legal-doc-edit"]').count(), 4);
    assert.equal(await page.locator('button[data-action="legal-doc-approve"]').count(), 4);
    assert.equal(await page.locator('button[data-action="legal-doc-reset"]').count(), 4);

    console.log('admin legal documents page smoke passed');
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
