#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_PHONE = '13900007777';
const PET_ID = 'pet-stuck-reaper';
const AVATAR_JOB_ID = 'avatar-stuck-reaper';
const ANIMATION_JOB_ID = 'animation-stuck-reaper';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-ai-stuck-reaper-'));
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

function todayUsageKey() {
  return new Date().toISOString().slice(0, 10);
}

function writeStuckState() {
  const now = Date.now();
  const oldAvatarAt = now - 10 * 60 * 1000;
  const oldAnimationAt = now - 25 * 60 * 1000;
  fs.writeFileSync(statePath, JSON.stringify({
    aiUsage: {
      avatarAnimation: {
        failed: 0,
        requests: 1,
        succeeded: 0,
      },
      gptImage2: {
        cost: 0,
        creditsCost: 0,
        failed: 0,
        requests: 1,
        succeeded: 0,
      },
    },
    avatarAnimationJobs: {
      [ANIMATION_JOB_ID]: {
        avatarJobId: AVATAR_JOB_ID,
        createdAt: oldAnimationAt,
        duration: 4,
        id: ANIMATION_JOB_ID,
        ownerPhone: TEST_PHONE,
        petId: PET_ID,
        petName: 'Lucky',
        progress: 54,
        provider: 'doubao-seedance-1-5-pro',
        providerJobId: 'seedance-stuck-task',
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
        mediaId: 'media-stuck-reaper',
        ownerPhone: TEST_PHONE,
        petId: PET_ID,
        petName: 'Lucky',
        progress: 58,
        provider: 'gpt-image-2',
        providerJobId: 'gpt-image2-stuck-task',
        providerStatus: 'processing',
        quotaConsumed: true,
        status: 'processing',
        updatedAt: oldAvatarAt,
      },
    },
    petAvatarDailyUsage: {
      [TEST_PHONE]: {
        count: 1,
        day: todayUsageKey(),
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
            avatarAnimationUrl: 'https://example.com/old-animation.mp4',
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
      AI_STUCK_JOB_REAPER_INTERVAL_MS: '250',
      AMAP_WEB_SERVICE_KEY: '',
      APIMART_API_KEY: '',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
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

async function waitForReapedJobs(adminToken) {
  const deadline = Date.now() + 10_000;
  let avatarRow = null;
  let animationRow = null;
  while (Date.now() < deadline) {
    const avatarJobs = await request('/admin/ai/avatar-jobs', { token: adminToken });
    const animationJobs = await request('/admin/ai/avatar-animation-jobs', { token: adminToken });
    avatarRow = avatarJobs.data.find((item) => item.id === AVATAR_JOB_ID);
    animationRow = animationJobs.data.find((item) => item.id === ANIMATION_JOB_ID);
    if (avatarRow?.status === 'failed' && animationRow?.status === 'failed') {
      return { animationRow, avatarRow };
    }
    await delay(150);
  }
  throw new Error(`stuck jobs were not reaped: ${JSON.stringify({ animationRow, avatarRow })}`);
}

async function main() {
  writeStuckState();
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const { animationRow, avatarRow } = await waitForReapedJobs(adminToken);

    assert.equal(avatarRow.errorCode, 'AVATAR_PROVIDER_TIMEOUT');
    assert.equal(avatarRow.quotaConsumed, true);
    assert.equal(avatarRow.quotaRefunded, true);
    assert.equal(avatarRow.quotaRefundSource, 'auto');
    assert.ok(String(avatarRow.quotaRefundReason || '').includes('stuck_job_reaper'));

    assert.equal(animationRow.errorCode, 'AVATAR_ANIMATION_PROVIDER_TIMEOUT');
    assert.equal(animationRow.petAvatarAnimationStatus, 'failed');
    assert.equal(animationRow.petAvatarAnimationUrl, '');

    const auditAvatar = await request(`/admin/audit-logs?action=ai.avatar.auto_mark_failed&targetType=avatar_job&q=${encodeURIComponent(AVATAR_JOB_ID)}`, { token: adminToken });
    assert.equal(auditAvatar.data.items.some((item) => item.targetId === AVATAR_JOB_ID), true);
    const auditAnimation = await request(`/admin/audit-logs?action=ai.avatar_animation.auto_mark_failed&targetType=avatar_animation_job&q=${encodeURIComponent(ANIMATION_JOB_ID)}`, { token: adminToken });
    assert.equal(auditAnimation.data.items.some((item) => item.targetId === ANIMATION_JOB_ID), true);

    const savedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(savedState.petAvatarDailyUsage[TEST_PHONE].count, 0);
    assert.equal(savedState.avatarJobs[AVATAR_JOB_ID].quotaRefunded, true);
    assert.equal(savedState.aiUsage.gptImage2.failed, 1);
    assert.equal(savedState.aiUsage.avatarAnimation.failed, 1);
    assert.equal(savedState.users[TEST_PHONE].pets[0].avatarAnimationStatus, 'failed');

    console.log('AI stuck job reaper smoke passed');
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
