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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-high-risk-expiry-'));
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
    body: { deviceId: `high-risk-expiry-${phone}`, phone },
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

async function enableApprovalPolicies(adminToken) {
  await request('/admin/config', {
    body: {
      configApproval: { approvalExpiresHours: 24, requireApproval: true },
      exports: { approvalExpiresHours: 12, maxDownloadsPerApproval: 1, requireApproval: true },
      highRiskApproval: { pendingExpiresHours: 1, requireDifferentAdmin: false },
      notifications: { requireApproval: true },
      reason: 'enable high risk approval expiry smoke',
      riskAcknowledged: true,
      riskConfirmText: CONFIRM_TEXT,
      support: {
        batchReply: { enabled: true, maxTickets: 5, requireApproval: true },
      },
    },
    method: 'PATCH',
    token: adminToken,
  });
}

async function createApprovals(adminToken) {
  const ids = {};
  const notifyPhone = '19900008602';
  const sanctionPhone = '19900008603';
  const clearPhone = '19900008604';
  const ticketPhone = '19900008605';

  await loginUser('19900008601');
  const notifyUserToken = await loginUser(notifyPhone);
  const sanctionUserToken = await loginUser(sanctionPhone);
  const clearUserToken = await loginUser(clearPhone);
  const ticketUserToken = await loginUser(ticketPhone);
  await createPet(sanctionUserToken, 'BanExpiry');
  await createPet(clearUserToken, 'ClearExpiry');

  const configDraft = await request('/admin/config/approvals', {
    body: { action: 'publish', reason: 'config approval expiry smoke', social: { discoverRadiusKm: 9 } },
    method: 'POST',
    token: adminToken,
  });
  ids.config = configDraft.data.approval.id;

  const exportDraft = await request('/admin/exports/approvals', {
    body: { filters: { status: 'all' }, reason: 'export approval expiry smoke', type: 'users' },
    method: 'POST',
    token: adminToken,
  });
  ids.export = exportDraft.data.approval.id;

  const notificationDraft = await request('/admin/notifications/system', {
    body: {
      mode: 'approval',
      phones: notifyPhone,
      reason: 'notification approval expiry smoke',
      respectUserSettings: false,
      target: 'phones',
      text: 'This notification approval should expire in smoke.',
      title: 'Approval expiry smoke',
    },
    method: 'POST',
    token: adminToken,
  });
  ids.notification = notificationDraft.data.notification.id;

  const sanctionDraft = await request('/admin/sanction-approvals', {
    body: {
      durationHours: 0,
      phone: sanctionPhone,
      reason: 'sanction approval expiry smoke',
      templateId: 'severe_violation_ban',
      type: 'ban',
    },
    method: 'POST',
    token: adminToken,
  });
  ids.sanction = sanctionDraft.data.approval.id;

  const dataClearDraft = await request('/admin/data-clear-approvals', {
    body: { confirmation: clearPhone, phone: clearPhone, reason: 'data clear approval expiry smoke' },
    method: 'POST',
    token: adminToken,
  });
  ids.dataClear = dataClearDraft.data.approval.id;

  const feedback = await request('/feedback', {
    body: {
      category: 'bug',
      contact: 'expiry-smoke@example.com',
      content: 'Please check this support issue from the approval expiry smoke.',
    },
    method: 'POST',
    token: ticketUserToken,
  });
  const ticketId = feedback.data.supportTicketId;
  const batchDraft = await request('/admin/tickets/batch-replies', {
    body: {
      content: 'Support has received this issue and will keep following up.',
      nextStatus: 'waiting_user',
      notifyUser: true,
      reason: 'ticket batch reply approval expiry smoke',
      ticketIds: [ticketId],
    },
    method: 'POST',
    token: adminToken,
  });
  ids.batchReply = batchDraft.data.approval.id;

  const beforeInbox = await request('/notifications', { token: notifyUserToken });
  assert.ok(!beforeInbox.data.some((item) => item.campaignId === ids.notification), 'pending notification must not reach inbox');
  return ids;
}

function expireApprovalsInState(ids) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const past = new Date(Date.now() - 60_000).toISOString();
  const setExpiry = (items, id, field) => {
    const item = (items || []).find((row) => row.id === id);
    assert.ok(item, `missing state item ${id}`);
    item[field] = past;
  };
  setExpiry(state.opsConfigApprovals, ids.config, 'expiresAt');
  setExpiry(state.adminExportApprovals, ids.export, 'requestExpiresAt');
  setExpiry(state.systemNotifications, ids.notification, 'approvalExpiresAt');
  setExpiry(state.adminSanctionApprovals, ids.sanction, 'approvalExpiresAt');
  setExpiry(state.adminDataClearApprovals, ids.dataClear, 'approvalExpiresAt');
  setExpiry(state.supportTicketBatchReplyApprovals, ids.batchReply, 'approvalExpiresAt');
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

async function expectExpired(pathname, adminToken) {
  const blocked = await request(pathname, {
    body: { reason: 'approval expiry smoke should block approval' },
    expectedStatus: 409,
    method: 'POST',
    token: adminToken,
  });
  assert.equal(blocked.error?.code, 'ADMIN_APPROVAL_EXPIRED');
}

function assertItemExpired(items, id, label) {
  const item = (items || []).find((row) => row.id === id);
  assert.equal(item?.status, 'expired', `${label} should be expired`);
  assert.ok(item.expiredAt || item.expiresAt || item.approvalExpiresAt || item.requestExpiresAt, `${label} should expose expiry fields`);
}

async function assertExpiredLists(adminToken, ids) {
  const config = await request('/admin/config/approvals?status=all', { token: adminToken });
  assertItemExpired(config.data.items, ids.config, 'config approval');

  const exports = await request('/admin/exports/approvals?status=all&type=all', { token: adminToken });
  assertItemExpired(exports.data.items, ids.export, 'export approval');

  const notifications = await request('/admin/notifications', { token: adminToken });
  assertItemExpired(notifications.data.campaigns, ids.notification, 'notification approval');

  const sanctions = await request('/admin/sanction-approvals?status=all', { token: adminToken });
  assertItemExpired(sanctions.data.items, ids.sanction, 'sanction approval');

  const dataClear = await request('/admin/data-clear-approvals?status=all', { token: adminToken });
  assertItemExpired(dataClear.data.items, ids.dataClear, 'data clear approval');

  const tickets = await request('/admin/tickets?status=all', { token: adminToken });
  assertItemExpired(tickets.data.batchReplyApprovals.items, ids.batchReply, 'batch reply approval');
}

async function assertExpiredApprovalsBlock(adminToken, ids) {
  await expectExpired(`/admin/config/approvals/${encodeURIComponent(ids.config)}/approve`, adminToken);
  await expectExpired(`/admin/exports/approvals/${encodeURIComponent(ids.export)}/approve`, adminToken);
  await expectExpired(`/admin/notifications/${encodeURIComponent(ids.notification)}/approve`, adminToken);
  await expectExpired(`/admin/sanction-approvals/${encodeURIComponent(ids.sanction)}/approve`, adminToken);
  await expectExpired(`/admin/data-clear-approvals/${encodeURIComponent(ids.dataClear)}/approve`, adminToken);
  await expectExpired(`/admin/tickets/batch-replies/${encodeURIComponent(ids.batchReply)}/approve`, adminToken);
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    let adminToken = await loginAdmin();
    await enableApprovalPolicies(adminToken);
    const ids = await createApprovals(adminToken);
    await stopBackend();
    expireApprovalsInState(ids);
    await startBackend(port);
    adminToken = await loginAdmin();
    await assertExpiredLists(adminToken, ids);
    await assertExpiredApprovalsBlock(adminToken, ids);
    console.log('high risk approval expiry smoke passed');
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
