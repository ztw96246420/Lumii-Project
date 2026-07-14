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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-pet-merge-'));
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
      PET_AVATAR_ANIMATION_PROVIDER: 'disabled',
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
    body: { deviceId: `admin-pet-merge-${phone}`, phone },
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

async function createPet(token, overrides = {}) {
  const payload = await request('/pets', {
    body: {
      birthday: '2022-05',
      breed: 'Golden',
      gender: 'male',
      name: 'Lucky',
      species: 'dog',
      weightKg: 16.8,
      ...overrides,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, 'missing created pet id');
  return payload.data;
}

async function createAdminCalendarRecords(adminToken, phone, petId) {
  const weight = await request('/admin/pet-calendar', {
    body: {
      petId,
      phone,
      reason: 'smoke creates source pet weight before merge',
      record: { kg: 19.4, note: 'merge source weight', recordedAt: '2026-07-04' },
      type: 'weight',
    },
    method: 'POST',
    token: adminToken,
  });
  const vaccine = await request('/admin/pet-calendar', {
    body: {
      petId,
      phone,
      reason: 'smoke creates source pet vaccine before merge',
      record: { dueAt: '2026-08-01', name: '狂犬疫苗', reminderEnabled: true, status: 'due' },
      type: 'vaccine',
    },
    method: 'POST',
    token: adminToken,
  });
  const memo = await request('/admin/pet-calendar', {
    body: {
      petId,
      phone,
      reason: 'smoke creates source pet memo before merge',
      record: { content: '合并迁移备忘内容', reminderEnabled: false, repeat: 'none', title: '合并迁移备忘' },
      type: 'memo',
    },
    method: 'POST',
    token: adminToken,
  });
  return [weight.data.recordId, vaccine.data.recordId, memo.data.recordId];
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const phone = '19900008401';
    const userToken = await loginUser(phone);
    const adminToken = await loginAdmin();

    const targetPet = await createPet(userToken, {
      breed: 'Golden',
      name: 'Lucky主档',
      weightKg: '',
    });
    const sourcePet = await createPet(userToken, {
      birthday: '2021-03-02',
      breed: 'Golden Retriever',
      coatColor: '浅金色',
      name: 'Lucky副档',
      sterilizationStatus: 'sterilized',
      weightKg: 18.2,
    });
    await request(`/pets/${encodeURIComponent(sourcePet.id)}/set-default`, { method: 'POST', token: userToken });

    const sourceAiAvatarUrl = 'https://example.com/storage/objects/source-ai-avatar.png';
    const aiAvatarResult = await request(`/admin/pets/${encodeURIComponent(sourcePet.id)}/media/ai-avatar/replace`, {
      body: {
        imageUrl: sourceAiAvatarUrl,
        reason: 'smoke applies source duplicate AI avatar',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(aiAvatarResult.data.item.avatarStatusKey, 'ai');

    await request('/social/discover?lat=22.5431&lng=114.0579&radiusKm=3&accuracy=25', { token: userToken });
    await request('/social/moments', {
      body: { content: '合并前源宠物发布的小事', photoCount: 0, visibility: 'nearby' },
      method: 'POST',
      token: userToken,
    });

    await request('/ai/pet-chat/messages', {
      body: { text: '今天我体重 19.4kg，帮我记一下。' },
      method: 'POST',
      token: userToken,
    });

    await createAdminCalendarRecords(adminToken, phone, sourcePet.id);

    const rejectedCrossUserToken = await loginUser('19900008402');
    const otherPet = await createPet(rejectedCrossUserToken, { name: 'Other Pet' });
    const rejected = await request(`/admin/pets/${encodeURIComponent(sourcePet.id)}/merge`, {
      body: {
        confirmation: sourcePet.id,
        reason: 'smoke rejects cross user merge',
        targetPetId: otherPet.id,
      },
      expectedStatus: 400,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(rejected.error?.code, 'ADMIN_PET_PROFILE_MERGE_INVALID');

    const merged = await request(`/admin/pets/${encodeURIComponent(sourcePet.id)}/merge`, {
      body: {
        confirmation: sourcePet.id,
        reason: 'smoke merges duplicate pet profile',
        targetPetId: targetPet.id,
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(merged.data.removedPetId, sourcePet.id);
    assert.equal(merged.data.targetPetId, targetPet.id);
    assert.ok(merged.data.summary.socialMoments >= 1, 'source pet social moments should move');
    assert.ok(merged.data.summary.petChatMessages >= 2, 'source pet AI chat messages should move');
    assert.ok(merged.data.summary.avatarJobs >= 1, 'source pet AI avatar jobs should move');
    assert.ok(merged.data.summary.calendar.weights >= 1, 'source pet weight records should move');
    assert.ok(merged.data.summary.calendar.vaccines >= 1, 'source pet vaccine records should move');
    assert.ok(merged.data.summary.calendar.memos >= 1, 'source pet memo records should move');

    const mobilePets = await request('/pets', { token: userToken });
    assert.equal(mobilePets.data.some((pet) => pet.id === sourcePet.id), false, 'source pet should be removed from mobile list');
    const mergedTargetPet = mobilePets.data.find((pet) => pet.id === targetPet.id);
    assert.ok(mergedTargetPet, 'target pet should remain in mobile list');
    assert.equal(mergedTargetPet.avatarUrl, sourceAiAvatarUrl, 'target pet should inherit source AI avatar because it had no avatar');
    assert.equal(mergedTargetPet.coatColor, '浅金色', 'target pet should inherit a missing source coat color');
    assert.equal(mergedTargetPet.sterilizationStatus, 'sterilized', 'known source sterilization status should replace unknown target status');
    assert.equal(mergedTargetPet.weightKg, 19.4, 'target pet should reflect latest merged weight record');

    const me = await request('/me', { token: userToken });
    assert.equal(me.data.activePet.id, targetPet.id, 'active pet should switch to target when source was active');

    const profile = await request('/social/pet-circle/profiles/me/posts', { token: userToken });
    assert.equal(profile.data.profile.petName, 'Lucky主档');
    assert.equal(profile.data.profile.avatarUrl, sourceAiAvatarUrl);
    assert.ok(profile.data.items.some((post) => post.id && String(post.text || '').includes('合并前源宠物')), 'profile posts should include moved source moment');

    const mobileChatMessages = await request('/ai/pet-chat/messages', { token: userToken });
    assert.ok(mobileChatMessages.data.some((message) => String(message.text || '').includes('19.4')), 'target pet chat should include moved source chat');

    const adminCalendar = await request(`/admin/pet-calendar?q=${encodeURIComponent(targetPet.id)}&recordState=all`, { token: adminToken });
    assert.ok(adminCalendar.data.records.some((record) => record.type === 'weight' && record.petId === targetPet.id));
    assert.ok(adminCalendar.data.records.some((record) => record.type === 'vaccine' && record.petId === targetPet.id));
    assert.ok(adminCalendar.data.records.some((record) => record.type === 'memo' && record.petId === targetPet.id));
    assert.equal(adminCalendar.data.records.some((record) => record.petId === sourcePet.id), false, 'admin calendar should not expose source pet rows after merge');

    const avatarJobs = await request('/admin/ai/avatar-jobs', { token: adminToken });
    const sourceJob = avatarJobs.data.find((job) => job.resultUrl === sourceAiAvatarUrl);
    assert.equal(sourceJob?.petId, targetPet.id);
    assert.equal(sourceJob?.acceptedPetId, targetPet.id);

    const notifications = await request('/notifications', { token: userToken });
    assert.ok(notifications.data.some((item) => item.petId === targetPet.id && item.id.includes('pet-merge')), 'merge notification should target merged pet');
    assert.equal(notifications.data.some((item) => item.petId === sourcePet.id), false, 'mobile notifications should not keep source pet id');

    const audit = await request('/admin/audit-logs?action=pet.profile.merge', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.targetId === targetPet.id), 'pet profile merge audit should be recorded');

    console.log('admin pet profile merge smoke passed');
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
