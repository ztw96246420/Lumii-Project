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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-social-relation-repair-'));
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
    body: { deviceId: `social-relation-repair-${phone}`, phone },
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

async function createPet(token, name, species = 'dog') {
  const payload = await request('/pets', {
    body: {
      birthday: '2024-01-05',
      breed: species === 'cat' ? 'British Shorthair' : 'Golden',
      gender: species === 'cat' ? 'female' : 'male',
      name,
      species,
      weightKg: species === 'cat' ? 4.8 : 18.6,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `missing pet id for ${name}`);
  return payload.data;
}

async function refreshPresence(token, lat, lng) {
  const query = new URLSearchParams({
    accuracy: '25',
    lat: String(lat),
    lng: String(lng),
    radiusKm: '3',
  });
  await request(`/social/discover?${query}`, { token });
}

async function setupPair(fromPhone, targetPhone, fromName, targetName) {
  const fromToken = await loginUser(fromPhone);
  const targetToken = await loginUser(targetPhone);
  await createPet(fromToken, fromName);
  await createPet(targetToken, targetName, 'cat');
  await refreshPresence(fromToken, 22.543096, 114.057865);
  await refreshPresence(targetToken, 22.5433, 114.058);
  return { fromToken, targetToken };
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();

    const greetingFromPhone = '19900008101';
    const greetingTargetPhone = '19900008102';
    const greetingPair = await setupPair(greetingFromPhone, greetingTargetPhone, 'RepairLucky', 'RepairMochi');
    await request('/social/greetings', {
      body: { message: 'please repair pending greeting', ownerId: `user-${greetingTargetPhone}` },
      method: 'POST',
      token: greetingPair.fromToken,
    });

    const greetingRequestsBefore = await request('/social/greeting-requests', { token: greetingPair.targetToken });
    assert.ok(greetingRequestsBefore.data.some((item) => item.id === `user-${greetingFromPhone}`), 'target should have pending greeting before repair');

    const greetingRelations = await request(`/admin/social-relations?kind=greeting&q=${encodeURIComponent(greetingFromPhone)}`, { token: adminToken });
    const greetingRow = greetingRelations.data.items.find((item) => item.fromPhone === greetingFromPhone && item.targetPhone === greetingTargetPhone);
    assert.equal(greetingRow?.status, 'pending', 'admin should see pending greeting');

    await request(`/admin/social-relations/${encodeURIComponent(greetingRow.id)}/repair`, {
      body: { action: 'accept', reason: 'smoke repairs abnormal pending greeting' },
      method: 'POST',
      token: adminToken,
    });

    const greetingRequestsAfter = await request('/social/greeting-requests', { token: greetingPair.targetToken });
    assert.equal(greetingRequestsAfter.data.some((item) => item.id === `user-${greetingFromPhone}`), false, 'pending greeting should be cleared after repair');
    const senderConversations = await request('/conversations', { token: greetingPair.fromToken });
    const targetConversations = await request('/conversations', { token: greetingPair.targetToken });
    assert.ok(senderConversations.data.some((item) => item.id === `c-${greetingTargetPhone}` && item.canSendMessage), 'sender should be able to message after repair');
    assert.ok(targetConversations.data.some((item) => item.id === `c-${greetingFromPhone}` && item.canSendMessage), 'target should be able to message after repair');
    const repairedMessage = 'message after admin repaired greeting';
    await request(`/conversations/${encodeURIComponent(`c-${greetingTargetPhone}`)}/messages`, {
      body: { text: repairedMessage },
      method: 'POST',
      token: greetingPair.fromToken,
    });
    const targetMessages = await request(`/conversations/${encodeURIComponent(`c-${greetingFromPhone}`)}/messages`, { token: greetingPair.targetToken });
    assert.ok(targetMessages.data.some((item) => item.text === repairedMessage), 'target should receive message after repair');

    const walkFromPhone = '19900008103';
    const walkTargetPhone = '19900008104';
    const walkPair = await setupPair(walkFromPhone, walkTargetPhone, 'WalkLucky', 'WalkMochi');
    await request('/social/walk-invites', {
      body: { ownerId: `user-${walkTargetPhone}`, place: 'Smoke Park', time: 'tomorrow morning' },
      method: 'POST',
      token: walkPair.fromToken,
    });
    const walkRelations = await request(`/admin/social-relations?kind=walk_invite&q=${encodeURIComponent(walkFromPhone)}`, { token: adminToken });
    const walkRow = walkRelations.data.items.find((item) => item.fromPhone === walkFromPhone && item.targetPhone === walkTargetPhone);
    assert.equal(walkRow?.status, 'pending', 'admin should see pending walk invite');

    await request(`/admin/social-relations/${encodeURIComponent(walkRow.id)}/repair`, {
      body: { action: 'close', reason: 'smoke closes abnormal pending walk invite' },
      method: 'POST',
      token: adminToken,
    });

    const walkRelationsAfter = await request(`/admin/social-relations?kind=walk_invite&q=${encodeURIComponent(walkFromPhone)}`, { token: adminToken });
    const walkRowAfter = walkRelationsAfter.data.items.find((item) => item.id === walkRow.id);
    assert.equal(walkRowAfter.status, 'rejected', 'walk invite should be closed as rejected');
    await request(`/conversations/${encodeURIComponent(`c-${walkFromPhone}`)}/messages`, {
      body: { text: 'reply after closed invite should fail' },
      expectedStatus: 403,
      method: 'POST',
      token: walkPair.targetToken,
    });
    const targetNotifications = await request('/notifications', { token: walkPair.targetToken });
    assert.equal(
      targetNotifications.data.some((item) => item.kind === 'walk_invite' && item.ownerId === `user-${walkFromPhone}` && !item.read),
      false,
      'closed walk invite notification should not remain unread',
    );

    const audit = await request('/admin/audit-logs?limit=80', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'social.relation.repair.accept' && item.targetId === greetingRow.id));
    assert.ok(audit.data.items.some((item) => item.action === 'social.relation.repair.close' && item.targetId === walkRow.id));

    console.log('social relation repair smoke passed');
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
