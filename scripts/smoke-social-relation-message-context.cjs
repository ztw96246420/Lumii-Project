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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-social-relation-context-'));
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
    body: { deviceId: `social-relation-context-${phone}`, phone },
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

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const fromPhone = '19900007901';
    const targetPhone = '19900007902';
    const fromToken = await loginUser(fromPhone);
    const targetToken = await loginUser(targetPhone);
    const adminToken = await loginAdmin();

    const updatedConfig = await request('/admin/config', {
      body: {
        reason: 'smoke configures private message access policy',
        social: {
          messageAccess: {
            contextWindowLimit: 5,
            fullConversationSearchEnabled: false,
            requireReason: true,
            retentionDays: 30,
          },
        },
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(updatedConfig.data.social.messageAccess.contextWindowLimit, 5);
    assert.equal(updatedConfig.data.social.messageAccess.retentionDays, 30);

    await createPet(fromToken, 'MsgLucky');
    await createPet(targetToken, 'MsgMochi', 'cat');
    await refreshPresence(fromToken, 22.543096, 114.057865);
    await refreshPresence(targetToken, 22.5433, 114.058);

    await request('/social/greetings', {
      body: { message: 'hello from smoke', ownerId: `user-${targetPhone}` },
      method: 'POST',
      token: fromToken,
    });
    const requests = await request('/social/greeting-requests', { token: targetToken });
    assert.ok(requests.data.some((item) => item.id === `user-${fromPhone}`), 'target should receive greeting request');
    await request(`/social/greeting-requests/${encodeURIComponent(`user-${fromPhone}`)}/accept`, {
      body: {},
      method: 'POST',
      token: targetToken,
    });

    const fromConversationId = `c-${targetPhone}`;
    const targetConversationId = `c-${fromPhone}`;
    for (let index = 1; index <= 6; index += 1) {
      await request(`/conversations/${encodeURIComponent(fromConversationId)}/messages`, {
        body: { text: `smoke relation context filler ${index}` },
        method: 'POST',
        token: fromToken,
      });
    }
    const messageText = 'smoke relation message should be hidden';
    const sent = await request(`/conversations/${encodeURIComponent(fromConversationId)}/messages`, {
      body: { text: messageText },
      method: 'POST',
      token: fromToken,
    });
    assert.ok(sent.data?.id, 'message should be sent');

    const targetMessagesBefore = await request(`/conversations/${encodeURIComponent(targetConversationId)}/messages`, { token: targetToken });
    assert.ok(targetMessagesBefore.data.some((item) => item.text === messageText), 'target should see message before admin hide');

    const relations = await request(`/admin/social-relations?kind=conversation&q=${encodeURIComponent(fromPhone)}`, { token: adminToken });
    const row = relations.data.items.find(
      (item) =>
        (item.fromPhone === fromPhone && item.targetPhone === targetPhone) ||
        (item.fromPhone === targetPhone && item.targetPhone === fromPhone),
    );
    assert.ok(row?.id, 'admin social relations should include conversation row');
    assert.equal(row.messageCount >= 1, true);
    assert.equal(relations.data.messageAccessPolicy.contextWindowLimit, 5);
    assert.equal(relations.data.messageAccessPolicy.fullConversationSearchEnabled, false);

    await request(`/admin/social-relations/${encodeURIComponent(row.id)}/message-context`, {
      body: { reason: '' },
      expectedStatus: 400,
      method: 'POST',
      token: adminToken,
    });

    const context = await request(`/admin/social-relations/${encodeURIComponent(row.id)}/message-context`, {
      body: { limit: 50, reason: 'smoke reviews relation messages' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(context.data.policy.contextWindowLimit, 5);
    assert.equal(context.data.policy.retentionDays, 30);
    assert.equal(context.data.messages.length <= 5, true, 'context should be capped by configured message window');
    assert.ok(context.data.retentionExpiresAt, 'context should include retention marker');
    const contextMessage = context.data.messages.find((item) => item.text === messageText);
    assert.ok(contextMessage?.canHide, 'context should expose hideable message');
    assert.equal(contextMessage.authorPhone, fromPhone);
    assert.equal(contextMessage.ownerPhone, row.fromPhone);
    assert.equal(contextMessage.conversationId, row.conversationId);

    await request(`/admin/social-relations/messages/${encodeURIComponent(contextMessage.id)}/hide`, {
      body: {
        conversationId: contextMessage.conversationId,
        phone: contextMessage.ownerPhone,
        reason: 'smoke hides relation message',
      },
      method: 'POST',
      token: adminToken,
    });

    const fromMessagesAfter = await request(`/conversations/${encodeURIComponent(fromConversationId)}/messages`, { token: fromToken });
    const targetMessagesAfter = await request(`/conversations/${encodeURIComponent(targetConversationId)}/messages`, { token: targetToken });
    assert.equal(fromMessagesAfter.data.some((item) => item.text === messageText), false, 'sender should no longer see hidden message');
    assert.equal(targetMessagesAfter.data.some((item) => item.text === messageText), false, 'target should no longer see hidden message');

    const fromConversations = await request('/conversations', { token: fromToken });
    const targetConversations = await request('/conversations', { token: targetToken });
    assert.equal(fromConversations.data.some((item) => item.lastMessage === messageText), false, 'sender list summary should not leak hidden message');
    assert.equal(targetConversations.data.some((item) => item.lastMessage === messageText), false, 'target list summary should not leak hidden message');

    const contextAfter = await request(`/admin/social-relations/${encodeURIComponent(row.id)}/message-context`, {
      body: { reason: 'smoke confirms hidden relation message' },
      method: 'POST',
      token: adminToken,
    });
    const hiddenContextMessage = contextAfter.data.messages.find((item) => item.text === messageText);
    assert.equal(hiddenContextMessage.status, 'hidden');
    assert.equal(hiddenContextMessage.canHide, false);

    const audit = await request('/admin/audit-logs?limit=80', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'social.relation.message_context.view' && item.targetId === row.conversationId));
    assert.ok(audit.data.items.some((item) => item.action === 'social.relation.message.hide' && item.targetId === contextMessage.id));

    console.log('social relation message context smoke passed');
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
