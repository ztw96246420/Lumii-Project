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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-high-risk-countersign-'));
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
    body: { deviceId: `high-risk-countersign-${phone}`, phone },
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

async function createReviewer(adminToken, username, password) {
  const created = await request('/admin/accounts', {
    body: {
      displayName: username,
      password,
      reason: 'create reviewer for high risk approval countersign smoke',
      roleIds: ['super_admin'],
      username,
    },
    method: 'POST',
    token: adminToken,
  });
  assert.equal(created.data?.account?.username, username);
  return loginAdmin(username, password);
}

async function expectSelfApprovalBlocked(pathname, adminToken) {
  const blocked = await request(pathname, {
    body: { reason: 'self approval should be blocked' },
    expectedStatus: 409,
    method: 'POST',
    token: adminToken,
  });
  assert.equal(blocked.error?.code, 'ADMIN_APPROVAL_SELF_APPROVAL_BLOCKED');
}

async function expectDuplicateApprovalBlocked(pathname, reviewerToken) {
  const blocked = await request(pathname, {
    body: { reason: 'duplicate approval should be blocked' },
    expectedStatus: 409,
    method: 'POST',
    token: reviewerToken,
  });
  assert.equal(blocked.error?.code, 'ADMIN_APPROVAL_DUPLICATE');
}

async function enableHighRiskCountersign(adminToken) {
  const config = await request('/admin/config', {
    body: {
      configApproval: { approvalExpiresHours: 24, requireApproval: true },
      highRiskApproval: { pendingExpiresHours: 24, requireDifferentAdmin: true, requiredApprovals: 2 },
      notifications: { requireApproval: true },
      reason: 'enable high risk approval countersign smoke',
      riskAcknowledged: true,
      riskConfirmText: CONFIRM_TEXT,
    },
    method: 'PATCH',
    token: adminToken,
  });
  assert.equal(config.data?.highRiskApproval?.requireDifferentAdmin, true);
  assert.equal(config.data?.highRiskApproval?.requiredApprovals, 2);
  assert.equal(config.data?.configApproval?.requireApproval, true);
  assert.equal(config.data?.notifications?.requireApproval, true);
}

async function testConfigCountersign(adminToken, reviewerOneToken, reviewerTwoToken) {
  const current = await request('/admin/config', { token: adminToken });
  const previousRadius = Number(current.data?.social?.discoverRadiusKm || 3);
  const nextRadius = previousRadius === 8 ? 9 : 8;
  const draft = await request('/admin/config/approvals', {
    body: {
      action: 'publish',
      reason: 'config countersign smoke',
      social: { discoverRadiusKm: nextRadius },
    },
    method: 'POST',
    token: adminToken,
  });
  const approvalId = draft.data?.approval?.id;
  assert.ok(approvalId, 'missing config approval id');
  const approvePath = `/admin/config/approvals/${encodeURIComponent(approvalId)}/approve`;
  await expectSelfApprovalBlocked(approvePath, adminToken);

  const firstVote = await request(approvePath, {
    body: { reason: 'first reviewer signs config countersign smoke' },
    method: 'POST',
    token: reviewerOneToken,
  });
  assert.equal(firstVote.data?.approval?.status, 'pending_approval');
  assert.equal(firstVote.data?.approval?.approvalCount, 1);
  assert.equal(firstVote.data?.approval?.remainingApprovals, 1);
  assert.equal(firstVote.data?.approval?.requiredApprovals, 2);
  assert.equal(firstVote.data?.social?.discoverRadiusKm, previousRadius);
  await expectDuplicateApprovalBlocked(approvePath, reviewerOneToken);

  const approved = await request(approvePath, {
    body: { reason: 'second reviewer approves config countersign smoke' },
    method: 'POST',
    token: reviewerTwoToken,
  });
  assert.equal(approved.data?.approval?.status, 'approved');
  assert.equal(approved.data?.approval?.approvalCount, 2);
  assert.equal(approved.data?.approval?.approvedBy, 'reviewer_02');
  assert.equal(approved.data?.social?.discoverRadiusKm, nextRadius);
}

async function testNotificationCountersign(adminToken, reviewerOneToken, reviewerTwoToken) {
  const phone = '19900008601';
  const userToken = await loginUser(phone);
  const draft = await request('/admin/notifications/system', {
    body: {
      mode: 'approval',
      phones: phone,
      reason: 'notification countersign smoke',
      respectUserSettings: false,
      target: 'phones',
      text: 'This notification should be sent only after two reviewer approvals.',
      title: 'Approval countersign smoke',
    },
    method: 'POST',
    token: adminToken,
  });
  const notificationId = draft.data?.notification?.id;
  assert.ok(notificationId, 'missing notification approval id');
  const approvePath = `/admin/notifications/${encodeURIComponent(notificationId)}/approve`;
  await expectSelfApprovalBlocked(approvePath, adminToken);

  const firstVote = await request(approvePath, {
    body: { reason: 'first reviewer signs notification countersign smoke' },
    method: 'POST',
    token: reviewerOneToken,
  });
  assert.equal(firstVote.data?.notification?.status, 'pending_approval');
  assert.equal(firstVote.data?.notification?.approvalCount, 1);
  assert.equal(firstVote.data?.notification?.remainingApprovals, 1);
  const emptyInbox = await request('/notifications', { token: userToken });
  assert.ok(!emptyInbox.data.some((item) => item.campaignId === notificationId), 'notification should not reach inbox before final countersign');
  await expectDuplicateApprovalBlocked(approvePath, reviewerOneToken);

  const approved = await request(approvePath, {
    body: { reason: 'second reviewer approves notification countersign smoke' },
    method: 'POST',
    token: reviewerTwoToken,
  });
  assert.equal(approved.data?.notification?.status, 'sent');
  assert.equal(approved.data?.notification?.approvalCount, 2);
  assert.equal(approved.data?.notification?.approvedBy, 'reviewer_02');
  const inbox = await request('/notifications', { token: userToken });
  assert.ok(inbox.data.some((item) => item.campaignId === notificationId), 'notification should reach inbox after final countersign');
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const reviewerOneToken = await createReviewer(adminToken, 'reviewer_01', 'Reviewer2026A');
    const reviewerTwoToken = await createReviewer(adminToken, 'reviewer_02', 'Reviewer2026B');
    await enableHighRiskCountersign(adminToken);

    await testConfigCountersign(adminToken, reviewerOneToken, reviewerTwoToken);
    await testNotificationCountersign(adminToken, reviewerOneToken, reviewerTwoToken);

    const readiness = await request('/admin/launch/readiness', { token: adminToken });
    const gap = readiness.data?.gaps?.find((item) => item.key === 'high_risk_approval');
    assert.equal(gap?.status, 'partial');
    assert.ok(gap.requiredAction.includes('highRiskApproval.requiredApprovals'));

    console.log('high risk approval countersign smoke passed');
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
