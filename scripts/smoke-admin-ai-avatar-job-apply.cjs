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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-ai-avatar-job-apply-'));
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
    body: { deviceId: `admin-ai-avatar-job-apply-${phone}`, phone },
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

async function createPet(token, name, avatarUrl) {
  const created = await request('/pets', {
    body: {
      avatarUrl,
      birthday: '2022',
      breed: 'Golden',
      gender: 'male',
      name,
      species: 'dog',
      weightKg: 18,
    },
    method: 'POST',
    token,
  });
  assert.ok(created.data?.id, `missing created pet id for ${name}`);
  return created.data;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const phone = '19900008321';
    const userToken = await loginUser(phone);
    const adminToken = await loginAdmin();

    const sourcePet = await createPet(userToken, 'ApplySource', 'https://example.com/storage/objects/source-avatar.png');
    const targetPet = await createPet(userToken, 'ApplyTarget', 'https://example.com/storage/objects/target-avatar.png');
    const resultUrl = 'https://example.com/storage/objects/admin-ready-ai-avatar.png';

    const replaceResult = await request(`/admin/pets/${encodeURIComponent(sourcePet.id)}/media/ai-avatar/replace`, {
      body: {
        imageUrl: resultUrl,
        reason: 'smoke creates a ready avatar job',
      },
      method: 'POST',
      token: adminToken,
    });
    const jobId = replaceResult.data.avatarJobId || replaceResult.data.item?.avatarJobId;
    assert.ok(jobId, 'missing admin avatar job id');

    const beforeJobs = await request('/admin/ai/avatar-jobs', { token: adminToken });
    const beforeJob = beforeJobs.data.find((item) => item.id === jobId);
    assert.equal(beforeJob?.status, 'ready');
    assert.equal(beforeJob?.acceptedPetId, sourcePet.id);
    assert.equal(beforeJob?.acceptedPetName, 'ApplySource');

    await request(`/admin/ai/avatar-jobs/${encodeURIComponent(jobId)}/apply`, {
      body: { petId: targetPet.id },
      expectedStatus: 400,
      method: 'POST',
      token: adminToken,
    });

    const applyResult = await request(`/admin/ai/avatar-jobs/${encodeURIComponent(jobId)}/apply`, {
      body: {
        petId: targetPet.id,
        reason: 'smoke applies ready avatar job to target pet',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(applyResult.data.imageUrl, resultUrl);
    assert.equal(applyResult.data.item.id, jobId);
    assert.equal(applyResult.data.item.acceptedPetId, targetPet.id);
    assert.equal(applyResult.data.item.acceptedPetName, 'ApplyTarget');
    assert.equal(applyResult.data.pet.id, targetPet.id);
    assert.equal(applyResult.data.pet.avatarUrl, resultUrl);
    assert.equal(applyResult.data.pet.avatarStatusKey, 'ai');

    const adminPets = await request('/admin/pets?q=Apply', { token: adminToken });
    const adminSourcePet = adminPets.data.items.find((item) => item.id === sourcePet.id);
    const adminTargetPet = adminPets.data.items.find((item) => item.id === targetPet.id);
    assert.equal(adminSourcePet?.avatarStatusKey, 'basic');
    assert.equal(adminTargetPet?.avatarStatusKey, 'ai');
    assert.equal(adminTargetPet?.avatarJobId, jobId);

    const mobilePets = await request('/pets', { token: userToken });
    const mobileTargetPet = mobilePets.data.find((item) => item.id === targetPet.id);
    assert.equal(mobileTargetPet.avatarUrl, resultUrl);
    assert.equal(mobileTargetPet.avatarAnimationUrl || '', '', 'admin apply should clear stale animation URL');

    const afterJobs = await request('/admin/ai/avatar-jobs', { token: adminToken });
    const afterJob = afterJobs.data.find((item) => item.id === jobId);
    assert.equal(afterJob?.acceptedPetId, targetPet.id);
    assert.equal(afterJob?.petId, targetPet.id);
    assert.ok(afterJob?.adminAppliedAt, 'missing adminAppliedAt');

    const notifications = await request('/notifications', { token: userToken });
    assert.ok(
      notifications.data.some((item) => item.petId === targetPet.id && item.id.includes('pet-media-replace') && item.title),
      'mobile notification should mention admin AI avatar apply',
    );

    const audit = await request('/admin/audit-logs?limit=80', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'ai.avatar.apply_to_pet' && item.targetId === jobId));

    console.log('admin ai avatar job apply smoke passed');
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
