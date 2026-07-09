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

async function request(pathname, { body, expectedStatus = 200, method = 'GET', raw = false, token } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: raw ? '*/*' : 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    method,
  });
  const text = await response.text();
  const payload = raw ? text : text ? JSON.parse(text) : undefined;
  assert.equal(
    response.status,
    expectedStatus,
    `${method} ${pathname} expected ${expectedStatus}, got ${response.status}: ${text}`,
  );
  return raw ? { data: payload, headers: response.headers } : payload;
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
    assert.equal(aiReply.data?.adminAiTrace, undefined, 'mobile pet chat response must not expose admin AI trace');

    const initialQueue = await request('/admin/ai/pet-chat/quality-review', { token: adminToken });
    const queueItem = initialQueue.data.items.find((item) => item.id === aiMessageId);
    assert.ok(queueItem, 'AI reply should enter quality review queue');
    assert.equal(queueItem.hasMedicalAlert, true);
    assert.ok(queueItem.queueScore >= 60, 'medical sample should have high queue score');
    assert.equal(queueItem.provider, 'rule_guard');
    assert.equal(queueItem.model, 'rule-based-medical-gate');
    assert.equal(queueItem.source, 'safety_guard');
    assert.ok(queueItem.promptHash, 'admin pet chat row should include prompt hash');

    const medicalDetail = await request(`/admin/ai/pet-chat/messages/${encodeURIComponent(aiMessageId)}/view`, {
      body: { reason: 'smoke verifies AI trace snapshot' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(medicalDetail.data.aiTrace.provider, 'rule_guard');
    assert.equal(medicalDetail.data.aiTrace.model, 'rule-based-medical-gate');
    assert.equal(medicalDetail.data.aiTrace.petSnapshot.name, '桃桃');
    assert.ok(medicalDetail.data.aiTrace.basePrompt.hash, 'AI trace should include base prompt hash');

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

    const unhidden = await request(`/admin/ai/pet-chat/messages/${encodeURIComponent(aiMessageId)}/unhide`, {
      body: { reason: 'smoke restores an operator-hidden AI reply' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(unhidden.data.row.adminHiddenAt, '', 'operator-hidden AI reply should be restored');
    const mobileMessagesAfterUnhide = await request('/ai/pet-chat/messages', { token: userToken });
    assert.equal(
      mobileMessagesAfterUnhide.data.some((message) => message.id === aiMessageId),
      true,
      'unhidden AI reply must return to mobile',
    );
    const restoredMobileReply = mobileMessagesAfterUnhide.data.find((message) => message.id === aiMessageId);
    assert.equal(restoredMobileReply.adminAiTrace, undefined, 'mobile message list must not expose admin AI trace');
    assert.equal(restoredMobileReply.adminModeratedOriginalText, undefined, 'mobile message list must not expose moderated original text');

    const audit = await request('/admin/audit-logs?action=ai.petChat.quality_review', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.targetId === aiMessageId), 'quality review audit log should be recorded');
    const unhideAudit = await request('/admin/audit-logs?action=ai.petChat.unhide', { token: adminToken });
    assert.ok(unhideAudit.data.items.some((item) => item.targetId === aiMessageId), 'unhide audit log should be recorded');

    const exportCatalog = await request('/admin/exports?phone=19900007701', { token: adminToken });
    const petChatExportDataset = exportCatalog.data.find((item) => item.type === 'pet_chat_messages');
    assert.ok(petChatExportDataset, 'pet chat export dataset should be listed');
    assert.ok(petChatExportDataset.columns.includes('医疗风险'), 'pet chat export should expose medical risk column');
    assert.ok(petChatExportDataset.columns.includes('模型'), 'pet chat export should expose model column');
    assert.ok(petChatExportDataset.columns.includes('System Prompt Hash'), 'pet chat export should expose prompt hash column');
    assert.ok(petChatExportDataset.columns.includes('复核状态'), 'pet chat export should expose review status column');
    assert.ok(petChatExportDataset.rowCount >= 1, 'pet chat export should match the smoke user');
    assert.ok(petChatExportDataset.sensitiveColumnCount >= 1, 'pet chat export should declare sensitive columns');
    const petChatCsv = await request('/admin/exports/pet_chat_messages.csv?reason=pet%20chat%20medical%20sample%20export&phone=19900007701', {
      raw: true,
      token: adminToken,
    });
    assert.ok(petChatCsv.data.includes(aiMessageId), 'pet chat export should include the AI reply id');
    assert.ok(petChatCsv.data.includes('rule_guard'), 'pet chat export should include provider trace');
    assert.ok(petChatCsv.data.includes('rule-based-medical-gate'), 'pet chat export should include model trace');
    assert.ok(petChatCsv.data.includes('199****7701'), 'pet chat export should mask owner phone by default');
    assert.equal(petChatCsv.data.includes('19900007701'), false, 'pet chat export must not expose full phone by default');
    assert.ok(petChatCsv.data.includes('[redacted]'), 'pet chat export should redact sensitive text by default');

    await request('/admin/config', {
      body: {
        moderation: {
          enabled: true,
          reviewKeywords: ['主人'],
          reviewMessage: 'AI 回复命中安全复核规则',
          textRulesEnabled: true,
        },
        reason: 'smoke enables AI reply output moderation',
        riskAcknowledged: true,
        riskConfirmText: '确认发布高风险配置',
      },
      method: 'PATCH',
      token: adminToken,
    });

    const interceptedReply = await request('/ai/pet-chat/messages', {
      body: { text: '我们今天去公园散步吗？' },
      method: 'POST',
      token: userToken,
    });
    const interceptedId = interceptedReply.data?.id;
    assert.ok(interceptedId, 'missing intercepted AI reply id');
    assert.ok(interceptedReply.data?.adminHiddenAt, 'intercepted AI reply should be auto hidden');
    assert.match(interceptedReply.data?.text || '', /安全复核/, 'mobile response should only contain safety fallback text');
    assert.equal(interceptedReply.data?.adminModeratedOriginalText, undefined, 'mobile response must not expose moderated original text');

    const mobileMessagesAfterIntercept = await request('/ai/pet-chat/messages', { token: userToken });
    assert.equal(
      mobileMessagesAfterIntercept.data.some((message) => message.id === interceptedId),
      false,
      'auto-hidden AI reply must not be returned to mobile message list',
    );

    const safetyRows = await request('/admin/ai/pet-chat/messages?flag=safety', { token: adminToken });
    const safetyRow = safetyRows.data.find((row) => row.id === interceptedId);
    assert.ok(safetyRow, 'admin safety filter should include auto-hidden AI reply');
    assert.equal(safetyRow.contentSafetyAction, 'review');
    assert.ok(safetyRow.adminHiddenAt, 'admin safety row should be hidden from mobile');
    assert.ok(safetyRow.adminTags.includes('content_safety'));
    assert.ok(safetyRow.adminTags.includes('safety_review'));

    const safetyQueue = await request('/admin/ai/pet-chat/quality-review', { token: adminToken });
    assert.ok(safetyQueue.data.summary.safetyIntercepted >= 1, 'quality review summary should count safety interceptions');

    const blockedUnhide = await request(`/admin/ai/pet-chat/messages/${encodeURIComponent(interceptedId)}/unhide`, {
      body: { reason: 'smoke should not restore safety-intercepted reply before safe review' },
      expectedStatus: 400,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(blockedUnhide.error?.code, 'ADMIN_PET_CHAT_UNHIDE_INVALID');

    await request(`/admin/ai/pet-chat/messages/${encodeURIComponent(interceptedId)}/quality-review`, {
      body: { reason: 'smoke marks safety-intercepted reply as safe after review', reviewStatus: 'safe' },
      method: 'POST',
      token: adminToken,
    });
    const restoredSafetyReply = await request(`/admin/ai/pet-chat/messages/${encodeURIComponent(interceptedId)}/unhide`, {
      body: { reason: 'smoke restores safety-intercepted reply after safe review' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(restoredSafetyReply.data.row.adminHiddenAt, '', 'safe-reviewed AI reply should be restored');
    const mobileMessagesAfterSafetyRestore = await request('/ai/pet-chat/messages', { token: userToken });
    assert.equal(
      mobileMessagesAfterSafetyRestore.data.some((message) => message.id === interceptedId),
      true,
      'safe-reviewed restored AI reply must return to mobile',
    );

    const safetyDetail = await request(`/admin/ai/pet-chat/messages/${encodeURIComponent(interceptedId)}/view`, {
      body: { reason: 'smoke verifies moderated original text' },
      method: 'POST',
      token: adminToken,
    });
    assert.match(safetyDetail.data.moderatedOriginalText || '', /主人/, 'admin detail should keep moderated original text for review');
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
