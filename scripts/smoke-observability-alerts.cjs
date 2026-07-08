#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_PHONE = '13900008888';
const PET_ID = 'pet-observability-alerts';
const AVATAR_JOB_ID = 'avatar-observability-alerts';
const ANIMATION_JOB_ID = 'animation-observability-alerts';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-observability-alerts-'));
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

function writeAlertState() {
  const now = Date.now();
  const oldAvatarAt = now - 8 * 60 * 1000;
  const oldAnimationAt = now - 18 * 60 * 1000;
  fs.writeFileSync(statePath, JSON.stringify({
    avatarAnimationJobs: {
      [ANIMATION_JOB_ID]: {
        avatarJobId: AVATAR_JOB_ID,
        createdAt: oldAnimationAt,
        duration: 4,
        id: ANIMATION_JOB_ID,
        ownerPhone: TEST_PHONE,
        petId: PET_ID,
        petName: 'Lucky',
        progress: 51,
        provider: 'doubao-seedance-1-5-pro',
        providerJobId: 'seedance-observability-alerts',
        providerStatus: 'processing',
        resolution: '480p',
        sourceAvatarUrl: 'https://example.com/lumii/avatar.png',
        status: 'processing',
        updatedAt: oldAnimationAt,
      },
    },
    avatarJobs: {
      [AVATAR_JOB_ID]: {
        createdAt: oldAvatarAt,
        id: AVATAR_JOB_ID,
        mediaId: 'media-observability-alerts',
        ownerPhone: TEST_PHONE,
        petId: PET_ID,
        petName: 'Lucky',
        progress: 52,
        provider: 'gpt-image-2',
        providerJobId: 'gpt-image2-observability-alerts',
        providerStatus: 'processing',
        quotaConsumed: true,
        status: 'processing',
        updatedAt: oldAvatarAt,
      },
    },
    users: {
      [TEST_PHONE]: {
        activePetId: PET_ID,
        createdAt: now - 24 * 60 * 60 * 1000,
        favoritePlaceIds: [],
        ownerName: 'Smoke Owner',
        permissionsOnboardingCompleted: true,
        pets: [
          {
            avatarAnimationJobId: ANIMATION_JOB_ID,
            avatarAnimationStatus: 'processing',
            birthday: '2024-01-05',
            breed: 'dog',
            gender: 'male',
            id: PET_ID,
            name: 'Lucky',
            species: 'dog',
          },
        ],
        phone: TEST_PHONE,
      },
    },
  }, null, 2));
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
      AI_STUCK_JOB_REAPER_INTERVAL_MS: '60000',
      AMAP_WEB_SERVICE_KEY: '',
      APIMART_API_KEY: '',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_ADMIN_IP_ALLOWLIST: '',
      LUMII_ADMIN_IP_WHITELIST: '',
      LUMII_ADMIN_PASSWORD: '',
      LUMII_ADMIN_USERNAME: '',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      PET_AVATAR_ANIMATION_PROVIDER: 'doubao-seedance-1-5-pro',
      PET_AVATAR_PROVIDER: 'gpt-image-2',
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

function assertAlertKeys(alerts, keys) {
  const actual = new Set((alerts.items || []).map((item) => item.key));
  keys.forEach((key) => {
    assert.equal(actual.has(key), true, `missing alert key: ${key}`);
  });
}

async function main() {
  writeAlertState();
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const alerts = await request('/admin/dashboard/alerts', { token: adminToken });
    assert.ok(alerts.data.summary.total >= 4, 'alerts summary should include operational alerts');
    assert.ok(alerts.data.summary.needsAction >= 4, 'alerts should surface high-priority action count');
    assertAlertKeys(alerts.data, ['admin_credentials', 'admin_ip_allowlist', 'avatar_queue', 'avatar_animation_queue']);

    const summary = await request('/admin/dashboard/summary', { token: adminToken });
    assert.ok(summary.data.alerts.total >= alerts.data.summary.total, 'dashboard summary should expose alert totals');
    assert.ok(summary.data.alerts.needsAction >= 4, 'dashboard summary should expose high-priority alert count');

    const health = await request('/admin/system/health', { token: adminToken });
    assertAlertKeys(health.data.alerts, ['admin_credentials', 'admin_ip_allowlist', 'avatar_queue', 'avatar_animation_queue']);

    const readiness = await request('/admin/launch/readiness', { token: adminToken });
    const observabilityGap = readiness.data.gaps.find((item) => item.key === 'observability');
    assert.ok(observabilityGap, 'readiness should include observability gap');
    assert.match(observabilityGap.evidence || '', /dashboard\/alerts/);

    console.log('observability alerts smoke passed');
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
