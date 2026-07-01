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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-config-experiments-'));
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

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing user token');
  return payload.data.token;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const initial = await request('/admin/config', { token: adminToken });
    assert.equal(initial.data.experiments.homeAiEntry.enabled, false);
    assert.ok(initial.data.linkage.items.some((item) => item.key === 'experiments.homeAiEntry.enabled' && item.status === 'mobile_only'));
    assert.equal(initial.data.linkage.summary.reserved, 0);

    const published = await request('/admin/config', {
      body: {
        experiments: {
          homeAiEntry: {
            controlSubtitle: 'A 组和 {petName} 聊一点轻松日常',
            controlTitle: '灵伴聊天',
            enabled: true,
            id: 'home_ai_entry_copy_smoke',
            name: 'Smoke 首页 AI 入口文案',
            rolloutPercent: 100,
            treatmentSubtitle: 'B 组问问 {petName} 的小心情',
            treatmentTitle: '问问小心情',
            variantBPercent: 100,
          },
        },
        reason: 'smoke publish home ai entry experiment',
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(published.data.experiments.homeAiEntry.enabled, true);
    assert.equal(published.data.experiments.homeAiEntry.id, 'home_ai_entry_copy_smoke');
    assert.ok(published.data.revisions[0].changeSummary.some((item) => item.key === 'experiments.homeAiEntry.enabled'));

    const appConfig = await request('/app/config');
    assert.equal(appConfig.data.experiments.homeAiEntry.enabled, true);
    assert.equal(appConfig.data.experiments.homeAiEntry.variantBPercent, 100);
    assert.equal(appConfig.data.experiments.homeAiEntry.treatmentTitle, '问问小心情');

    const userToken = await loginUser('13531850966');
    const exposure = await request('/analytics/events', {
      body: {
        appBuild: 1,
        appVersion: '1.0.0',
        name: 'config.experiment_exposure',
        occurredAt: new Date().toISOString(),
        platform: 'ios',
        properties: {
          experimentId: 'home_ai_entry_copy_smoke',
          source: 'home_ai_entry',
          variant: 'treatment',
        },
        route: 'home',
        source: 'mobile',
      },
      method: 'POST',
      token: userToken,
    });
    assert.equal(exposure.data.accepted, true);

    const click = await request('/analytics/events', {
      body: {
        appBuild: 1,
        appVersion: '1.0.0',
        name: 'pet_chat.entry_click',
        occurredAt: new Date().toISOString(),
        platform: 'ios',
        properties: {
          experimentId: 'home_ai_entry_copy_smoke',
          source: 'home_header',
          variant: 'treatment',
        },
        route: 'home',
        source: 'mobile',
      },
      method: 'POST',
      token: userToken,
    });
    assert.equal(click.data.accepted, true);
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
