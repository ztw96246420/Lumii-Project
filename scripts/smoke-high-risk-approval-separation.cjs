#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const CONFIRM_TEXT = '\u786e\u8ba4\u53d1\u5e03\u9ad8\u98ce\u9669\u914d\u7f6e';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-high-risk-approval-'));
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
  if (process.env.SMOKE_VERBOSE) console.log(`${method} ${pathname}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`${method} ${pathname} timed out`)), 10_000);
  let response;
  try {
    response = await fetch(`${baseUrl}${pathname}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      method,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
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
      GPT_IMAGE2_API_KEY: '',
      LUMII_ADMIN_PASSWORD_MIN_LENGTH: '10',
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

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `high-risk-approval-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing token for ${phone}`);
  return payload.data.token;
}

async function loginAdmin(username = 'admin', password = 'LumiiAdmin@2026') {
  const payload = await request('/admin/auth/login', {
    body: { password, username },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing admin token for ${username}`);
  return payload.data.token;
}

async function createReviewer(adminToken) {
  const created = await request('/admin/accounts', {
    body: {
      displayName: 'Reviewer',
      password: 'Reviewer2026',
      reason: 'create reviewer for high risk approval separation smoke',
      username: 'reviewer_01',
    },
    method: 'POST',
    token: adminToken,
  });
  assert.equal(created.data?.account?.username, 'reviewer_01');
  return loginAdmin('reviewer_01', 'Reviewer2026');
}

async function createPet(token, name) {
  const payload = await request('/pets', {
    body: {
      birthday: '2024-01-05',
      breed: 'dog',
      gender: 'male',
      name,
      species: 'dog',
      weightKg: 18.6,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `missing pet id for ${name}`);
  return payload.data;
}

async function expectSelfApprovalBlocked(pathname, adminToken) {
  const blocked = await request(pathname, {
    body: { reason: 'self approval should be blocked' },
    expectedStatus: 409,
    method: 'POST',
    token: adminToken,
  });
  assert.equal(blocked.error?.code, 'ADMIN_APPROVAL_SELF_APPROVAL_BLOCKED');
  return blocked;
}

async function enableHighRiskSeparation(adminToken) {
  const config = await request('/admin/config', {
    body: {
      configApproval: { approvalExpiresHours: 24, requireApproval: true },
      exports: { approvalExpiresHours: 12, maxDownloadsPerApproval: 1, requireApproval: true },
      highRiskApproval: { requireDifferentAdmin: true },
      notifications: { requireApproval: true },
      reason: 'enable high risk approval separation smoke',
      riskAcknowledged: true,
      riskConfirmText: CONFIRM_TEXT,
      support: {
        batchReply: { enabled: true, maxTickets: 5, requireApproval: true },
      },
    },
    method: 'PATCH',
    token: adminToken,
  });
  assert.equal(config.data?.highRiskApproval?.requireDifferentAdmin, true);
  assert.equal(config.data?.configApproval?.requireApproval, true);
  assert.equal(config.data?.exports?.requireApproval, true);
  assert.equal(config.data?.notifications?.requireApproval, true);
}

async function testConfigApproval(adminToken, reviewerToken) {
  const draft = await request('/admin/config/approvals', {
    body: {
      action: 'publish',
      reason: 'config separation approval smoke',
      social: { discoverRadiusKm: 8 },
    },
    method: 'POST',
    token: adminToken,
  });
  const approvalId = draft.data?.approval?.id;
  assert.ok(approvalId, 'missing config approval id');
  await expectSelfApprovalBlocked(`/admin/config/approvals/${encodeURIComponent(approvalId)}/approve`, adminToken);
  const approved = await request(`/admin/config/approvals/${encodeURIComponent(approvalId)}/approve`, {
    body: { reason: 'reviewer approves config separation smoke' },
    method: 'POST',
    token: reviewerToken,
  });
  assert.equal(approved.data?.approval?.status, 'approved');
  assert.equal(approved.data?.approval?.approvedBy, 'reviewer_01');
  assert.equal(approved.data?.social?.discoverRadiusKm, 8);
}

async function testExportApproval(adminToken, reviewerToken) {
  await loginUser('19900008501');
  const draft = await request('/admin/exports/approvals', {
    body: {
      filters: { status: 'all' },
      reason: 'export separation approval smoke',
      type: 'users',
    },
    method: 'POST',
    token: adminToken,
  });
  const approvalId = draft.data?.approval?.id;
  assert.ok(approvalId, 'missing export approval id');
  await expectSelfApprovalBlocked(`/admin/exports/approvals/${encodeURIComponent(approvalId)}/approve`, adminToken);
  const approved = await request(`/admin/exports/approvals/${encodeURIComponent(approvalId)}/approve`, {
    body: { reason: 'reviewer approves export separation smoke' },
    method: 'POST',
    token: reviewerToken,
  });
  assert.equal(approved.data?.approval?.status, 'approved');
  assert.equal(approved.data?.approval?.approvedBy, 'reviewer_01');
}

async function testNotificationApproval(adminToken, reviewerToken) {
  const phone = '19900008502';
  const userToken = await loginUser(phone);
  const draft = await request('/admin/notifications/system', {
    body: {
      mode: 'approval',
      phones: phone,
      reason: 'notification separation approval smoke',
      respectUserSettings: false,
      target: 'phones',
      text: 'This notification should only be sent after reviewer approval.',
      title: 'Approval separation smoke',
    },
    method: 'POST',
    token: adminToken,
  });
  const notificationId = draft.data?.notification?.id;
  assert.ok(notificationId, 'missing notification approval id');
  await expectSelfApprovalBlocked(`/admin/notifications/${encodeURIComponent(notificationId)}/approve`, adminToken);
  const approved = await request(`/admin/notifications/${encodeURIComponent(notificationId)}/approve`, {
    body: { reason: 'reviewer approves notification separation smoke' },
    method: 'POST',
    token: reviewerToken,
  });
  assert.equal(approved.data?.notification?.status, 'sent');
  assert.equal(approved.data?.notification?.approvedBy, 'reviewer_01');
  const inbox = await request('/notifications', { token: userToken });
  assert.ok(inbox.data.some((item) => item.campaignId === notificationId), 'approved notification should reach user inbox');
}

async function testSanctionApproval(adminToken, reviewerToken) {
  const phone = '19900008503';
  const userToken = await loginUser(phone);
  await createPet(userToken, 'BanSmoke');
  const draft = await request('/admin/sanction-approvals', {
    body: {
      durationHours: 0,
      phone,
      reason: 'sanction separation approval smoke',
      templateId: 'severe_violation_ban',
      type: 'ban',
    },
    method: 'POST',
    token: adminToken,
  });
  const approvalId = draft.data?.approval?.id;
  assert.ok(approvalId, 'missing sanction approval id');
  await expectSelfApprovalBlocked(`/admin/sanction-approvals/${encodeURIComponent(approvalId)}/approve`, adminToken);
  const approved = await request(`/admin/sanction-approvals/${encodeURIComponent(approvalId)}/approve`, {
    body: { reason: 'reviewer approves sanction separation smoke' },
    method: 'POST',
    token: reviewerToken,
  });
  assert.equal(approved.data?.approval?.status, 'approved');
  assert.equal(approved.data?.approval?.approvedBy, 'reviewer_01');
  assert.equal(approved.data?.sanction?.type, 'ban');
}

async function testDataClearApproval(adminToken, reviewerToken) {
  const phone = '19900008504';
  const userToken = await loginUser(phone);
  await createPet(userToken, 'ClearSmoke');
  const draft = await request('/admin/data-clear-approvals', {
    body: {
      confirmation: phone,
      phone,
      reason: 'data clear separation approval smoke',
    },
    method: 'POST',
    token: adminToken,
  });
  const approvalId = draft.data?.approval?.id;
  assert.ok(approvalId, 'missing data clear approval id');
  await expectSelfApprovalBlocked(`/admin/data-clear-approvals/${encodeURIComponent(approvalId)}/approve`, adminToken);
  const approved = await request(`/admin/data-clear-approvals/${encodeURIComponent(approvalId)}/approve`, {
    body: { reason: 'reviewer approves data clear separation smoke' },
    method: 'POST',
    token: reviewerToken,
  });
  assert.equal(approved.data?.approval?.status, 'approved');
  assert.equal(approved.data?.approval?.approvedBy, 'reviewer_01');
  assert.equal(approved.data?.clearResult?.after?.pets, 0);
}

async function testBatchReplyApproval(adminToken, reviewerToken) {
  const phone = '19900008505';
  const userToken = await loginUser(phone);
  const feedback = await request('/feedback', {
    body: {
      category: 'bug',
      contact: 'batch-smoke@example.com',
      content: 'Please check this support issue from the approval separation smoke.',
    },
    method: 'POST',
    token: userToken,
  });
  const ticketId = feedback.data?.supportTicketId;
  assert.ok(ticketId, 'missing support ticket id');
  const draft = await request('/admin/tickets/batch-replies', {
    body: {
      content: 'Support has received this issue and will keep following up.',
      nextStatus: 'waiting_user',
      notifyUser: true,
      reason: 'ticket batch reply separation approval smoke',
      ticketIds: [ticketId],
    },
    method: 'POST',
    token: adminToken,
  });
  const approvalId = draft.data?.approval?.id;
  assert.ok(approvalId, 'missing batch reply approval id');
  await expectSelfApprovalBlocked(`/admin/tickets/batch-replies/${encodeURIComponent(approvalId)}/approve`, adminToken);
  const approved = await request(`/admin/tickets/batch-replies/${encodeURIComponent(approvalId)}/approve`, {
    body: { reason: 'reviewer approves ticket batch reply separation smoke' },
    method: 'POST',
    token: reviewerToken,
  });
  assert.equal(approved.data?.approval?.status, 'sent');
  assert.equal(approved.data?.approval?.approvedBy, 'reviewer_01');
  assert.equal(approved.data?.successCount, 1);
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const reviewerToken = await createReviewer(adminToken);
    await enableHighRiskSeparation(adminToken);

    await testConfigApproval(adminToken, reviewerToken);
    await testExportApproval(adminToken, reviewerToken);
    await testNotificationApproval(adminToken, reviewerToken);
    await testSanctionApproval(adminToken, reviewerToken);
    await testDataClearApproval(adminToken, reviewerToken);
    await testBatchReplyApproval(adminToken, reviewerToken);

    const readiness = await request('/admin/launch/readiness', { token: adminToken });
    const gap = readiness.data?.gaps?.find((item) => item.key === 'high_risk_approval');
    assert.equal(gap?.status, 'partial');
    assert.ok(gap.requiredAction.includes('highRiskApproval.requireDifferentAdmin'));

    console.log('high risk approval separation smoke passed');
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
