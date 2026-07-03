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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-pet-chat-review-'));
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
    body: { deviceId: `pet-chat-review-${phone}`, phone },
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
    const userToken = await loginUser('19900007701');
    const adminToken = await loginAdmin();

    await request('/pets', {
      body: {
        birthday: '2023-05-12',
        breed: 'Corgi',
        gender: 'female',
        name: '桃桃',
        species: 'dog',
        weightKg: 8.2,
      },
      method: 'POST',
      token: userToken,
    });

    const aiReply = await request('/ai/pet-chat/messages', {
      body: { text: '桃桃今天呼吸困难，还站不起来，我该怎么办？' },
      method: 'POST',
      token: userToken,
    });
    const aiMessageId = aiReply.data?.id;
    assert.ok(aiMessageId, 'missing AI reply id');
    assert.ok(aiReply.data?.medicalAlert, 'medical alert reply should be generated');

    const initialQueue = await request('/admin/ai/pet-chat/quality-review', { token: adminToken });
    const queueItem = initialQueue.data.items.find((item) => item.id === aiMessageId);
    assert.ok(queueItem, 'AI reply should enter quality review queue');
    assert.equal(queueItem.hasMedicalAlert, true);
    assert.ok(queueItem.queueScore >= 60, 'medical sample should have high queue score');

    const reviewed = await request(`/admin/ai/pet-chat/messages/${encodeURIComponent(aiMessageId)}/quality-review`, {
      body: { reason: 'smoke marks reply as needs fix', reviewStatus: 'needs_fix' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(reviewed.data.row.adminQualityReviewStatus, 'needs_fix');
    assert.ok(reviewed.data.row.adminTags.includes('quality_issue'));
    assert.ok(reviewed.data.queue.summary.needsFix >= 1);

    await request(`/admin/ai/pet-chat/messages/${encodeURIComponent(aiMessageId)}/hide`, {
      body: { reason: 'smoke hides unsafe AI reply from mobile' },
      method: 'POST',
      token: adminToken,
    });

    const mobileMessages = await request('/ai/pet-chat/messages', { token: userToken });
    assert.equal(
      mobileMessages.data.some((message) => message.id === aiMessageId),
      false,
      'hidden AI reply must not be returned to mobile',
    );

    const hiddenRows = await request('/admin/ai/pet-chat/messages?flag=hidden', { token: adminToken });
    assert.ok(hiddenRows.data.some((row) => row.id === aiMessageId && row.adminHiddenAt), 'admin hidden list should include hidden AI reply');

    const audit = await request('/admin/audit-logs?action=ai.petChat.quality_review', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.targetId === aiMessageId), 'quality review audit log should be recorded');
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
