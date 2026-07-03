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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-calendar-edit-'));
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
    body: { deviceId: `admin-calendar-edit-${phone}`, phone },
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
    const phone = '19900007821';
    const userToken = await loginUser(phone);
    const adminToken = await loginAdmin();

    const createdPet = await request('/pets', {
      body: {
        birthday: '2023-04-01',
        breed: 'Corgi',
        gender: 'female',
        name: 'Lucky',
        species: 'dog',
        weightKg: 6.2,
      },
      method: 'POST',
      token: userToken,
    });
    assert.ok(createdPet.data?.id, 'missing created pet id');

    const createdWeight = await request('/health/weights', {
      body: { kg: 6.5, note: 'mobile initial weight', recordedAt: '2026-07-01' },
      method: 'POST',
      token: userToken,
    });
    const createdVaccine = await request('/health/vaccines', {
      body: { dueAt: '2030-01-10', name: 'Rabies' },
      method: 'POST',
      token: userToken,
    });
    await request(`/health/vaccine-reminders/${encodeURIComponent(createdVaccine.data.id)}`, {
      body: { enabled: true },
      method: 'PATCH',
      token: userToken,
    });
    const createdMemo = await request('/health/memos', {
      body: { content: 'mobile memo content', reminderEnabled: false, repeat: 'none', title: 'Mobile memo' },
      method: 'POST',
      token: userToken,
    });

    const calendar = await request(`/admin/pet-calendar?q=${encodeURIComponent(phone)}`, { token: adminToken });
    const weightRow = calendar.data.records.find((item) => item.type === 'weight' && item.sourceId === createdWeight.data.id);
    const vaccineRow = calendar.data.records.find((item) => item.type === 'vaccine' && item.sourceId === createdVaccine.data.id);
    const memoRow = calendar.data.records.find((item) => item.type === 'memo' && item.sourceId === createdMemo.data.id);
    assert.ok(weightRow?.id, 'admin weight calendar row should exist');
    assert.ok(vaccineRow?.id, 'admin vaccine calendar row should exist');
    assert.ok(memoRow?.id, 'admin memo calendar row should exist');

    const weightPatch = await request(`/admin/pet-calendar/${encodeURIComponent(weightRow.id)}`, {
      body: {
        reason: 'smoke corrects calendar weight',
        record: { kg: 7.1, note: 'admin corrected weight', recordedAt: '2026-07-02' },
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.deepEqual(new Set(weightPatch.data.changedFields), new Set(['kg', 'note', 'recordedAt']));
    assert.equal(weightPatch.data.item.kg, 7.1);

    const vaccinePatch = await request(`/admin/pet-calendar/${encodeURIComponent(vaccineRow.id)}`, {
      body: {
        reason: 'smoke corrects vaccine plan',
        record: { dueAt: '2030-02-01', name: 'Rabies booster', reminderEnabled: false, status: 'done' },
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.ok(vaccinePatch.data.changedFields.includes('status'));
    assert.equal(vaccinePatch.data.item.status, 'done');
    assert.equal(vaccinePatch.data.item.reminderEnabled, false);

    const memoPatch = await request(`/admin/pet-calendar/${encodeURIComponent(memoRow.id)}`, {
      body: {
        reason: 'smoke corrects calendar memo',
        record: {
          content: 'admin corrected memo content',
          reminderAt: '2030-02-01 10:15',
          reminderEnabled: true,
          repeat: 'monthly',
          title: 'Admin memo',
        },
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(memoPatch.data.item.title, 'Admin memo');
    assert.equal(memoPatch.data.item.reminderEnabled, true);

    const mobileWeights = await request('/health/weights', { token: userToken });
    assert.ok(mobileWeights.data.some((item) => item.id === createdWeight.data.id && item.kg === 7.1 && item.note === 'admin corrected weight'));

    const mobileVaccines = await request('/health/vaccines', { token: userToken });
    assert.ok(mobileVaccines.data.some((item) => item.id === createdVaccine.data.id && item.name === 'Rabies booster' && item.status === 'done'));
    const reminders = await request('/health/vaccine-reminders', { token: userToken });
    assert.equal(reminders.data.includes(createdVaccine.data.id), false, 'done vaccine reminder should be disabled');

    const mobileMemos = await request('/health/memos', { token: userToken });
    assert.ok(mobileMemos.data.some((item) => item.id === createdMemo.data.id && item.title === 'Admin memo' && item.reminderAt === '2030-02-01 10:15'));

    const notifications = await request('/notifications', { token: userToken });
    assert.ok(
      notifications.data.some((item) => item.title === '宠物日历记录已修正'),
      'mobile notification should mention admin calendar correction',
    );

    const audit = await request('/admin/audit-logs?action=calendar.record.update', { token: adminToken });
    const touchedIds = new Set(audit.data.items.map((item) => item.targetId));
    assert.ok(touchedIds.has(weightRow.id), 'weight edit audit should be recorded');
    assert.ok(touchedIds.has(vaccineRow.id), 'vaccine edit audit should be recorded');
    assert.ok(touchedIds.has(memoRow.id), 'memo edit audit should be recorded');
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
