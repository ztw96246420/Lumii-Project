#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-conversation-message-reports-'));
const statePath = path.join(tmpDir, 'state.json');
const TEST_CODE = '962464';
let baseUrl = '';
let backendProcess = null;

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
    body: { deviceId: `conversation-message-report-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing user token for ${phone}`);
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

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const senderPhone = '19900005001';
    const reporterPhone = '19900005002';
    const senderToken = await loginUser(senderPhone);
    const reporterToken = await loginUser(reporterPhone);
    const adminToken = await loginAdmin();

    await createPet(senderToken, 'Lucky');
    await createPet(reporterToken, 'Mochi', 'cat');
    await refreshPresence(senderToken, 22.543096, 114.057865);
    await refreshPresence(reporterToken, 22.5433, 114.058);

    await request('/social/greetings', {
      body: { ownerId: `user-${reporterPhone}` },
      method: 'POST',
      token: senderToken,
    });
    await request(`/social/greeting-requests/${encodeURIComponent(`user-${senderPhone}`)}/accept`, {
      method: 'POST',
      token: reporterToken,
    });

    const text = 'Smoke conversation message report target.';
    const sent = await request(`/conversations/${encodeURIComponent(`c-${reporterPhone}`)}/messages`, {
      body: { text },
      method: 'POST',
      token: senderToken,
    });
    assert.equal(sent.data.text, text);
    assert.ok(sent.data.threadMessageId, 'sent message should include threadMessageId');

    const reporterMessages = await request(`/conversations/${encodeURIComponent(`c-${senderPhone}`)}/messages`, { token: reporterToken });
    const incoming = reporterMessages.data.find((message) => message.author === 'other' && message.text === text);
    assert.ok(incoming, 'reporter should see sender message');
    assert.equal(incoming.threadMessageId, sent.data.threadMessageId, 'sender and receiver messages should share threadMessageId');

    const report = await request(`/conversations/${encodeURIComponent(`c-${senderPhone}`)}/messages/${encodeURIComponent(incoming.id)}/report`, {
      body: { content: 'Smoke report conversation message' },
      method: 'POST',
      token: reporterToken,
    });
    assert.equal(report.data.reported, true);
    assert.equal(report.data.targetType, 'message');

    const hiddenForReporter = await request(`/conversations/${encodeURIComponent(`c-${senderPhone}`)}/messages`, { token: reporterToken });
    assert.equal(hiddenForReporter.data.some((message) => message.id === incoming.id), false, 'reported message should be hidden for reporter');

    const stillVisibleForSender = await request(`/conversations/${encodeURIComponent(`c-${reporterPhone}`)}/messages`, { token: senderToken });
    assert.equal(stillVisibleForSender.data.some((message) => message.id === sent.data.id), true, 'sender copy should remain visible before admin action');

    const reports = await request('/admin/social/reports', { token: adminToken });
    const adminReport = reports.data.find((item) => item.id === report.data.id);
    assert.equal(adminReport?.targetType, 'message');
    assert.equal(adminReport?.evidenceSnapshot?.targetType, 'message');
    assert.equal(adminReport?.evidenceSnapshot?.contentText, text);

    const taskId = `report:${report.data.id}`;
    const tasks = await request('/admin/moderation/tasks?status=all', { token: adminToken });
    const task = tasks.data.tasks.find((item) => item.id === taskId);
    assert.ok(task, 'message report should enter moderation tasks');
    assert.ok(task.actions.some((item) => item.action === 'hide'), 'message report task should allow hide action');

    await request(`/admin/moderation/tasks/${encodeURIComponent(taskId)}/hide`, {
      body: { reason: 'Smoke hide reported private message' },
      method: 'POST',
      token: adminToken,
    });

    const hiddenForSender = await request(`/conversations/${encodeURIComponent(`c-${reporterPhone}`)}/messages`, { token: senderToken });
    assert.equal(hiddenForSender.data.some((message) => message.id === sent.data.id), false, 'admin hidden message should be removed from sender view');

    console.log('conversation message report smoke passed');
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
