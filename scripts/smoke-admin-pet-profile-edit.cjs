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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-pet-edit-'));
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
    body: { deviceId: `admin-pet-edit-${phone}`, phone },
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
    const phone = '19900007801';
    const userToken = await loginUser(phone);
    const adminToken = await loginAdmin();

    const created = await request('/pets', {
      body: {
        birthday: '2022',
        breed: 'Golden',
        coatColor: '金黄色',
        gender: 'male',
        name: '旧名字',
        species: 'dog',
        sterilizationStatus: 'unknown',
        weightKg: 18,
      },
      method: 'POST',
      token: userToken,
    });
    const petId = created.data?.id;
    assert.ok(petId, 'missing created pet id');

    const blocked = await request(`/admin/pets/${encodeURIComponent(petId)}`, {
      body: { profile: { name: '后台修正名' } },
      expectedStatus: 400,
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(blocked.error?.code, 'ADMIN_PET_PROFILE_INVALID');

    const updated = await request(`/admin/pets/${encodeURIComponent(petId)}`, {
      body: {
        profile: {
          birthday: '2023-05',
          breed: 'Corgi',
          coatColor: '黄白相间',
          gender: 'female',
          name: '桃桃',
          species: 'dog',
          sterilizationStatus: 'sterilized',
          weightKg: 9.4,
        },
        reason: 'smoke admin corrects pet profile',
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.deepEqual(new Set(updated.data.changedFields), new Set(['birthday', 'breed', 'coatColor', 'gender', 'name', 'sterilizationStatus', 'weightKg']));
    assert.equal(updated.data.item.name, '桃桃');
    assert.equal(updated.data.item.breed, 'Corgi');
    assert.equal(updated.data.item.birthday, '2023-05');
    assert.equal(updated.data.item.coatColor, '黄白相间');
    assert.equal(updated.data.item.sterilizationStatus, 'sterilized');
    assert.equal(updated.data.item.sterilizationStatusLabel, '已绝育');
    assert.equal(updated.data.item.weightKg, 9.4);

    const mobilePets = await request('/pets', { token: userToken });
    const mobilePet = mobilePets.data.find((item) => item.id === petId);
    assert.equal(mobilePet.name, '桃桃');
    assert.equal(mobilePet.breed, 'Corgi');
    assert.equal(mobilePet.gender, 'female');
    assert.equal(mobilePet.birthday, '2023-05');
    assert.equal(mobilePet.coatColor, '黄白相间');
    assert.equal(mobilePet.sterilizationStatus, 'sterilized');
    assert.equal(mobilePet.weightKg, 9.4);

    const notifications = await request('/notifications', { token: userToken });
    assert.ok(
      notifications.data.some((item) => item.petId === petId && item.title === '宠物资料已修正'),
      'mobile notification should mention admin pet profile correction',
    );
    assert.ok(
      notifications.data.some((item) => item.petId === petId && item.text.includes('毛色') && item.text.includes('绝育状态')),
      'mobile notification should identify coat color and sterilization corrections',
    );

    const audit = await request('/admin/audit-logs?action=pet.profile.update', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.targetId === petId), 'pet profile update audit should be recorded');

    const exportCatalog = await request(`/admin/exports?phone=${encodeURIComponent(phone)}`, { token: adminToken });
    const petExport = exportCatalog.data.find((item) => item.type === 'pets');
    assert.ok(petExport, 'pet profile export dataset should be listed');
    assert.ok(petExport.columns.includes('毛色'), 'pet profile export should include coat color');
    assert.ok(petExport.columns.includes('绝育状态'), 'pet profile export should include sterilization status');

    const detail = await request(`/admin/pets/${encodeURIComponent(petId)}`, { token: adminToken });
    assert.equal(detail.data.pet.name, '桃桃');
    assert.equal(detail.data.owner.phone, phone);
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  fs.rmSync(tmpDir, { force: true, recursive: true });
  console.error(error);
  process.exit(1);
});
