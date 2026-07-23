#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const TEST_PHONE = '13900008888';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-avatar-animation-'));
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
      PET_AVATAR_ANIMATION_PROVIDER: 'mock',
      PET_AVATAR_PROVIDER: 'mock',
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

function readSavedState() {
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function writeSavedState(value) {
  fs.writeFileSync(statePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function restartBackendWithStateMutation(mutate) {
  await stopBackend();
  const savedState = readSavedState();
  mutate(savedState);
  writeSavedState(savedState);
  await startBackend(await getFreePort());
}

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `avatar-animation-smoke-${phone}`, phone },
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

async function createPet(token) {
  const payload = await request('/pets', {
    body: {
      birthday: '2024-01-05',
      breed: 'dog',
      gender: 'male',
      name: 'Lucky',
      species: 'dog',
      weightKg: 18.6,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, 'missing pet id');
  return payload.data;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser(TEST_PHONE);
    const adminToken = await loginAdmin();
    const pet = await createPet(userToken);

    const savedPet = await request(`/pets/${encodeURIComponent(pet.id)}/avatar`, {
      body: { avatarUrl: 'https://example.com/lumii-static-avatar.png' },
      method: 'POST',
      token: userToken,
    });
    assert.equal(savedPet.data.avatarAnimationStatus, 'ready');
    assert.ok(savedPet.data.avatarAnimationJobId, 'missing animation job id on saved pet');
    assert.equal(savedPet.data.avatarAnimationAiGenerated, true);
    assert.equal(savedPet.data.avatarAnimationAiContentId, savedPet.data.avatarAnimationJobId);

    const latest = await request(`/ai/pet-avatar/animation/latest?petId=${encodeURIComponent(pet.id)}`, { token: userToken });
    assert.equal(latest.data.status, 'ready');
    assert.equal(latest.data.progress, 100);
    assert.equal(latest.data.provider, 'mock');
    assert.equal(latest.data.aiGenerated, true);
    assert.equal(latest.data.aiContentId, latest.data.id);
    assert.equal(latest.data.aiLabelVersion, 'cn-generated-content-v1');
    const firstAnimationJobId = latest.data.id;
    const firstAnimationUrl = latest.data.videoUrl;
    const newerUnboundFailedJobId = 'anim-newer-unbound-failed-regression';

    await restartBackendWithStateMutation((savedState) => {
      const staleJob = savedState.avatarAnimationJobs[firstAnimationJobId];
      const savedPetProfile = savedState.users[TEST_PHONE].pets.find((item) => item.id === pet.id);
      assert.ok(staleJob, 'missing ready animation job before lifecycle aging');
      assert.ok(savedPetProfile, 'missing pet before lifecycle aging');
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      staleJob.createdAt = eightDaysAgo;
      staleJob.updatedAt = eightDaysAgo;
      staleJob.requestSignature = 'retired-animation-policy-signature';
      staleJob.stageBackground = '#010203';
      savedState.avatarAnimationJobs[newerUnboundFailedJobId] = {
        createdAt: Date.now() - 1000,
        errorCode: 'AVATAR_ANIMATION_PROVIDER_TIMEOUT',
        errorMessage: 'newer failed job must not replace the pet-bound ready result',
        id: newerUnboundFailedJobId,
        ownerPhone: TEST_PHONE,
        petId: pet.id,
        progress: 20,
        provider: 'mock',
        providerStatus: 'failed',
        status: 'failed',
        updatedAt: Date.now() - 1000,
      };
      assert.equal(savedPetProfile.avatarAnimationJobId, firstAnimationJobId);
      assert.equal(savedPetProfile.avatarAnimationUrl, firstAnimationUrl);
    });

    const beforeStaleLatest = readSavedState();
    const beforeStaleJobCount = Object.keys(beforeStaleLatest.avatarAnimationJobs || {}).length;
    const staleReadyLatest = await request(`/ai/pet-avatar/animation/latest?petId=${encodeURIComponent(pet.id)}`, { token: userToken });
    assert.equal(staleReadyLatest.data.id, firstAnimationJobId, 'GET latest must prefer the pet-bound ready job after recovery TTL');
    assert.equal(staleReadyLatest.data.status, 'ready');
    assert.equal(staleReadyLatest.data.videoUrl, firstAnimationUrl);
    const afterStaleLatest = readSavedState();
    const afterStalePet = afterStaleLatest.users[TEST_PHONE].pets.find((item) => item.id === pet.id);
    assert.equal(Object.keys(afterStaleLatest.avatarAnimationJobs || {}).length, beforeStaleJobCount, 'GET latest must not create a replacement for an old policy signature');
    assert.equal(afterStalePet.avatarAnimationJobId, firstAnimationJobId);
    assert.equal(afterStalePet.avatarAnimationUrl, firstAnimationUrl, 'GET latest must not clear an existing animation URL');

    const storedOnlyPet = await createPet(userToken);
    const savedStoredOnlyPet = await request(`/pets/${encodeURIComponent(storedOnlyPet.id)}/avatar`, {
      body: { avatarUrl: 'https://example.com/lumii-stored-only-static-avatar.png' },
      method: 'POST',
      token: userToken,
    });
    const storedOnlyAnimationJobId = savedStoredOnlyPet.data.avatarAnimationJobId;
    const storedOnlyAnimationUrl = savedStoredOnlyPet.data.avatarAnimationUrl;
    const storedOnlyOrphanJobId = 'anim-stored-only-orphan-processing';
    assert.ok(storedOnlyAnimationJobId, 'missing animation job for stored-only lifecycle setup');
    assert.ok(storedOnlyAnimationUrl, 'missing animation URL for stored-only lifecycle setup');

    let storedOnlyJobCount = 0;
    await restartBackendWithStateMutation((savedState) => {
      const savedPetProfile = savedState.users[TEST_PHONE].pets.find((item) => item.id === storedOnlyPet.id);
      assert.ok(savedPetProfile, 'missing stored-only pet before deleting its historical job');
      assert.equal(savedPetProfile.avatarAnimationUrl, storedOnlyAnimationUrl);
      delete savedState.avatarAnimationJobs[storedOnlyAnimationJobId];
      delete savedState.avatarAnimationJobs[newerUnboundFailedJobId];
      savedState.avatarAnimationJobs[storedOnlyOrphanJobId] = {
        createdAt: Date.now() - 1000,
        id: storedOnlyOrphanJobId,
        ownerPhone: TEST_PHONE,
        petId: storedOnlyPet.id,
        progress: 30,
        provider: 'mock',
        providerStatus: 'processing',
        sourceAvatarUrl: savedPetProfile.avatarUrl,
        status: 'processing',
        updatedAt: Date.now() - 1000,
      };
      storedOnlyJobCount = Object.keys(savedState.avatarAnimationJobs || {}).length;
    });

    const storedOnlyLatest = await request(`/ai/pet-avatar/animation/latest?petId=${encodeURIComponent(storedOnlyPet.id)}`, { token: userToken });
    assert.equal(storedOnlyLatest.data.id, storedOnlyAnimationJobId);
    assert.equal(storedOnlyLatest.data.provider, 'stored');
    assert.equal(storedOnlyLatest.data.status, 'ready');
    assert.equal(storedOnlyLatest.data.videoUrl, storedOnlyAnimationUrl);
    const afterStoredOnlyLatest = readSavedState();
    const afterStoredOnlyPet = afterStoredOnlyLatest.users[TEST_PHONE].pets.find((item) => item.id === storedOnlyPet.id);
    assert.equal(Object.keys(afterStoredOnlyLatest.avatarAnimationJobs || {}).length, storedOnlyJobCount, 'GET latest must not create a job when the pet already has a stored animation URL');
    assert.equal(afterStoredOnlyLatest.avatarAnimationJobs[storedOnlyOrphanJobId].status, 'processing', 'GET latest must not attach or refresh an unrelated orphan job');
    assert.equal(afterStoredOnlyPet.avatarAnimationUrl, storedOnlyAnimationUrl);

    const adminAnimationJobs = await request('/admin/ai/avatar-animation-jobs', { token: adminToken });
    assert.equal(Array.isArray(adminAnimationJobs.data), true);
    assert.equal(adminAnimationJobs.data.some((job) => job.id === firstAnimationJobId && job.status === 'ready'), true);

    await request(`/admin/ai/avatar-animation-jobs/${encodeURIComponent(firstAnimationJobId)}/mark-failed`, {
      body: { reason: 'smoke mark animation failed' },
      method: 'POST',
      token: adminToken,
    });
    await restartBackendWithStateMutation((savedState) => {
      const savedPetProfile = savedState.users[TEST_PHONE].pets.find((item) => item.id === pet.id);
      assert.ok(savedPetProfile, 'missing pet before failed-job profile resync');
      savedPetProfile.avatarAnimationStatus = 'processing';
    });
    const failedLatest = await request(`/ai/pet-avatar/animation/latest?petId=${encodeURIComponent(pet.id)}`, { token: userToken });
    assert.equal(failedLatest.data.status, 'failed');
    assert.equal(failedLatest.data.errorCode, 'ADMIN_MARKED_FAILED');
    const afterFailedLatest = readSavedState();
    const failedPetProfile = afterFailedLatest.users[TEST_PHONE].pets.find((item) => item.id === pet.id);
    assert.equal(failedPetProfile.avatarAnimationStatus, 'failed', 'GET latest must repair a stale pet status from its bound terminal job');

    const retried = await request(`/admin/ai/avatar-animation-jobs/${encodeURIComponent(firstAnimationJobId)}/retry`, {
      body: { reason: 'smoke retry animation after failure' },
      method: 'POST',
      token: adminToken,
    });
    assert.notEqual(retried.data.id, firstAnimationJobId);
    assert.equal(retried.data.status, 'ready');
    const retriedLatest = await request(`/ai/pet-avatar/animation/latest?petId=${encodeURIComponent(pet.id)}`, { token: userToken });
    assert.equal(retriedLatest.data.id, retried.data.id);
    assert.equal(retriedLatest.data.status, 'ready');

    const beforeClear = await request(`/admin/users/${encodeURIComponent(TEST_PHONE)}/business-data-summary`, { token: adminToken });
    assert.equal(beforeClear.data.summary.avatarAnimationJobs, 3);

    const clearApproval = await request('/admin/data-clear-approvals', {
      body: { confirmation: TEST_PHONE, phone: TEST_PHONE, reason: 'smoke clear avatar animation data' },
      method: 'POST',
      token: adminToken,
    });
    await request(`/admin/data-clear-approvals/${encodeURIComponent(clearApproval.data.approval.id)}/approve`, {
      body: { reason: 'smoke approve avatar animation data clear' },
      method: 'POST',
      token: adminToken,
    });
    const afterClear = await request(`/admin/users/${encodeURIComponent(TEST_PHONE)}/business-data-summary`, { token: adminToken });
    assert.equal(afterClear.data.summary.avatarAnimationJobs, 0);
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
