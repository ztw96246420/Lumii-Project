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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-pet-media-replace-'));
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
    body: { deviceId: `admin-pet-media-replace-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing token for ${phone}`);
  return payload.data.token;
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
    const phone = '19900008301';
    const userToken = await loginUser(phone);
    const adminToken = await loginAdmin();

    const created = await request('/pets', {
      body: {
        avatarUrl: 'https://example.com/storage/objects/original-avatar.png',
        birthday: '2022',
        breed: 'Golden',
        gender: 'male',
        name: 'MediaLucky',
        species: 'dog',
        weightKg: 18,
      },
      method: 'POST',
      token: userToken,
    });
    const petId = created.data?.id;
    assert.ok(petId, 'missing created pet id');

    const nextAvatarUrl = 'https://example.com/storage/objects/admin-replaced-avatar.png';
    const nextAiAvatarUrl = 'https://example.com/storage/objects/admin-replaced-ai-avatar.png';
    const nextCoverUrl = 'https://example.com/storage/objects/admin-replaced-cover.png';
    const finalAvatarUrl = 'https://example.com/storage/objects/admin-replaced-final-avatar.png';

    const avatarResult = await request(`/admin/pets/${encodeURIComponent(petId)}/media/avatar/replace`, {
      body: {
        imageUrl: nextAvatarUrl,
        reason: 'smoke replaces pet avatar',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(avatarResult.data.imageUrl, nextAvatarUrl);
    assert.equal(avatarResult.data.item.avatarUrl, nextAvatarUrl);
    assert.equal(avatarResult.data.item.avatarStatusKey, 'basic');

    const coverResult = await request(`/admin/pets/${encodeURIComponent(petId)}/media/cover/replace`, {
      body: {
        imageUrl: nextCoverUrl,
        reason: 'smoke replaces pet circle cover',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(coverResult.data.imageUrl, nextCoverUrl);
    assert.equal(coverResult.data.item.petCircleCoverImageUrl, nextCoverUrl);
    assert.equal(coverResult.data.item.hasPetCircleCover, true);

    const aiAvatarResult = await request(`/admin/pets/${encodeURIComponent(petId)}/media/ai-avatar/replace`, {
      body: {
        imageUrl: nextAiAvatarUrl,
        reason: 'smoke replaces ai companion avatar',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(aiAvatarResult.data.imageUrl, nextAiAvatarUrl);
    assert.equal(aiAvatarResult.data.item.avatarUrl, nextAiAvatarUrl);
    assert.equal(aiAvatarResult.data.item.avatarStatusKey, 'ai');
    assert.ok(aiAvatarResult.data.avatarJobId || aiAvatarResult.data.item.avatarJobId, 'missing admin ai avatar job id');

    const avatarJobs = await request('/admin/ai/avatar-jobs', { token: adminToken });
    const adminAvatarJobId = aiAvatarResult.data.avatarJobId || aiAvatarResult.data.item.avatarJobId;
    const adminAvatarJob = avatarJobs.data.find((item) => item.id === adminAvatarJobId);
    assert.equal(adminAvatarJob?.status, 'ready');
    assert.equal(adminAvatarJob?.provider, 'admin');
    assert.equal(adminAvatarJob?.resultUrl, nextAiAvatarUrl);

    const mobilePetsAfterAi = await request('/pets', { token: userToken });
    const mobilePetAfterAi = mobilePetsAfterAi.data.find((item) => item.id === petId);
    assert.equal(mobilePetAfterAi.avatarUrl, nextAiAvatarUrl);
    assert.equal(mobilePetAfterAi.petCircleCoverImageUrl, nextCoverUrl);
    assert.equal(mobilePetAfterAi.avatarAnimationUrl || '', '', 'ai avatar replacement should clear stale animation URL');

    const finalAvatarResult = await request(`/admin/pets/${encodeURIComponent(petId)}/media/avatar/replace`, {
      body: {
        imageUrl: finalAvatarUrl,
        reason: 'smoke replaces ai companion with normal avatar',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(finalAvatarResult.data.imageUrl, finalAvatarUrl);
    assert.equal(finalAvatarResult.data.item.avatarUrl, finalAvatarUrl);
    assert.equal(finalAvatarResult.data.item.avatarStatusKey, 'basic');

    const profile = await request('/social/pet-circle/profiles/me/posts', { token: userToken });
    assert.equal(profile.data.profile.avatarUrl, finalAvatarUrl);
    assert.equal(profile.data.profile.coverImageUrl, nextCoverUrl);

    const mobilePets = await request('/pets', { token: userToken });
    const mobilePet = mobilePets.data.find((item) => item.id === petId);
    assert.equal(mobilePet.avatarUrl, finalAvatarUrl);
    assert.equal(mobilePet.petCircleCoverImageUrl, nextCoverUrl);
    assert.equal(mobilePet.avatarAnimationUrl || '', '', 'avatar replacement should clear stale animation URL');

    const notifications = await request('/notifications', { token: userToken });
    assert.ok(
      notifications.data.some((item) => item.petId === petId && item.id.includes('pet-media-replace') && item.title),
      'mobile notification should mention admin pet media replacement',
    );

    const audit = await request('/admin/audit-logs?limit=80', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'pet.media.replace_avatar' && item.targetId === petId));
    assert.ok(audit.data.items.some((item) => item.action === 'pet.media.replace_ai_avatar' && item.targetId === petId));
    assert.ok(audit.data.items.some((item) => item.action === 'pet.media.replace_cover' && item.targetId === petId));

    console.log('admin pet media replace smoke passed');
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {
    // ignore cleanup errors
  }
  console.error(error);
  process.exit(1);
});
