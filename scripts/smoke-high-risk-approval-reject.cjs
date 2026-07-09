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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-high-risk-reject-'));
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
    body: { deviceId: `high-risk-reject-${phone}`, phone },
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
  const config = await request('/admin/config', {
    body: {
      configApproval: { approvalExpiresHours: 24, requireApproval: true },
      exports: { approvalExpiresHours: 12, maxDownloadsPerApproval: 1, requireApproval: true },
      highRiskApproval: { pendingExpiresHours: 24, requireDifferentAdmin: false },
      notifications: { requireApproval: true },
      reason: 'enable high risk approval reject smoke',
      riskAcknowledged: true,
      riskConfirmText: CONFIRM_TEXT,
      support: {
        batchReply: { enabled: true, maxTickets: 5, requireApproval: true },
      },
    },
    method: 'PATCH',
    token: adminToken,
  });
  assert.equal(config.data?.configApproval?.requireApproval, true);
  assert.equal(config.data?.exports?.requireApproval, true);
  assert.equal(config.data?.notifications?.requireApproval, true);
}

async function createApprovals(adminToken) {
  const ids = {};
  const notifyPhone = '19900008702';
  const sanctionPhone = '19900008703';
  const clearPhone = '19900008704';
  const ticketPhone = '19900008705';

  await loginUser('19900008701');
  const notifyUserToken = await loginUser(notifyPhone);
  const sanctionUserToken = await loginUser(sanctionPhone);
  const clearUserToken = await loginUser(clearPhone);
  const ticketUserToken = await loginUser(ticketPhone);
  await createPet(sanctionUserToken, 'BanReject');
  await createPet(clearUserToken, 'ClearReject');

  const configDraft = await request('/admin/config/approvals', {
    body: { action: 'publish', reason: 'config approval reject smoke', social: { discoverRadiusKm: 9 } },
    method: 'POST',
    token: adminToken,
  });
  ids.config = configDraft.data.approval.id;

  const exportDraft = await request('/admin/exports/approvals', {
    body: { filters: { status: 'all' }, reason: 'export approval reject smoke', type: 'users' },
    method: 'POST',
    token: adminToken,
  });
  ids.export = exportDraft.data.approval.id;

  const notificationDraft = await request('/admin/notifications/system', {
    body: {
      mode: 'approval',
      phones: notifyPhone,
      reason: 'notification approval reject smoke',
      respectUserSettings: false,
      target: 'phones',
      text: 'This notification approval should be rejected in smoke.',
      title: 'Approval reject smoke',
    },
    method: 'POST',
    token: adminToken,
  });
  ids.notification = notificationDraft.data.notification.id;

  const sanctionDraft = await request('/admin/sanction-approvals', {
    body: {
      durationHours: 0,
      phone: sanctionPhone,
      reason: 'sanction approval reject smoke',
      templateId: 'severe_violation_ban',
      type: 'ban',
    },
    method: 'POST',
    token: adminToken,
  });
  ids.sanction = sanctionDraft.data.approval.id;

  const dataClearDraft = await request('/admin/data-clear-approvals', {
    body: { confirmation: clearPhone, phone: clearPhone, reason: 'data clear approval reject smoke' },
    method: 'POST',
    token: adminToken,
  });
  ids.dataClear = dataClearDraft.data.approval.id;

  const feedback = await request('/feedback', {
    body: {
      category: 'bug',
      contact: 'reject-smoke@example.com',
      content: 'Please check this support issue from the approval reject smoke.',
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
      reason: 'ticket batch reply approval reject smoke',
      ticketIds: [ticketId],
    },
    method: 'POST',
    token: adminToken,
  });
  ids.batchReply = batchDraft.data.approval.id;

  const beforeInbox = await request('/notifications', { token: notifyUserToken });
  assert.ok(!beforeInbox.data.some((item) => item.campaignId === ids.notification), 'pending notification must not reach inbox');
  return { ids, notifyUserToken };
}

function assertRejectedRecord(item, id, label) {
  assert.equal(item?.id, id, `${label} id mismatch`);
  assert.equal(item?.status, 'rejected', `${label} should be rejected`);
  assert.equal(item?.rejectedBy, 'admin', `${label} should expose rejectedBy`);
  assert.ok(item?.rejectedAt, `${label} should expose rejectedAt`);
  assert.match(String(item?.rejectReason || ''), /reject smoke/i, `${label} should expose reject reason`);
}

async function rejectApprovals(adminToken, ids) {
  const reason = (label) => `${label} reject smoke reason`;
  const config = await request(`/admin/config/approvals/${encodeURIComponent(ids.config)}/reject`, {
    body: { reason: reason('config') },
    method: 'POST',
    token: adminToken,
  });
  assertRejectedRecord(config.data.approval, ids.config, 'config approval');

  const exported = await request(`/admin/exports/approvals/${encodeURIComponent(ids.export)}/reject`, {
    body: { reason: reason('export') },
    method: 'POST',
    token: adminToken,
  });
  assertRejectedRecord(exported.data.approval, ids.export, 'export approval');

  const notification = await request(`/admin/notifications/${encodeURIComponent(ids.notification)}/reject`, {
    body: { reason: reason('notification') },
    method: 'POST',
    token: adminToken,
  });
  assertRejectedRecord(notification.data.notification, ids.notification, 'notification approval');

  const sanction = await request(`/admin/sanction-approvals/${encodeURIComponent(ids.sanction)}/reject`, {
    body: { reason: reason('sanction') },
    method: 'POST',
    token: adminToken,
  });
  assertRejectedRecord(sanction.data.approval, ids.sanction, 'sanction approval');

  const dataClear = await request(`/admin/data-clear-approvals/${encodeURIComponent(ids.dataClear)}/reject`, {
    body: { reason: reason('data clear') },
    method: 'POST',
    token: adminToken,
  });
  assertRejectedRecord(dataClear.data.approval, ids.dataClear, 'data clear approval');

  const batchReply = await request(`/admin/tickets/batch-replies/${encodeURIComponent(ids.batchReply)}/reject`, {
    body: { reason: reason('ticket batch reply') },
    method: 'POST',
    token: adminToken,
  });
  assertRejectedRecord(batchReply.data.approval, ids.batchReply, 'batch reply approval');
}

function findById(items, id) {
  return (items || []).find((item) => item.id === id);
}

async function assertRejectedLists(adminToken, ids) {
  const config = await request('/admin/config/approvals?status=all', { token: adminToken });
  assertRejectedRecord(findById(config.data.items, ids.config), ids.config, 'config list approval');
  assert.equal(config.data.summary.rejected, 1);

  const exports = await request('/admin/exports/approvals?status=all&type=all', { token: adminToken });
  assertRejectedRecord(findById(exports.data.items, ids.export), ids.export, 'export list approval');
  assert.equal(exports.data.summary.rejected, 1);

  const notifications = await request('/admin/notifications', { token: adminToken });
  assertRejectedRecord(findById(notifications.data.campaigns, ids.notification), ids.notification, 'notification list approval');
  assert.equal(notifications.data.summary.rejectedApprovals, 1);

  const sanctions = await request('/admin/sanction-approvals?status=all', { token: adminToken });
  assertRejectedRecord(findById(sanctions.data.items, ids.sanction), ids.sanction, 'sanction list approval');
  assert.equal(sanctions.data.summary.rejected, 1);

  const dataClear = await request('/admin/data-clear-approvals?status=all', { token: adminToken });
  assertRejectedRecord(findById(dataClear.data.items, ids.dataClear), ids.dataClear, 'data clear list approval');
  assert.equal(dataClear.data.summary.rejected, 1);

  const tickets = await request('/admin/tickets?status=all', { token: adminToken });
  assertRejectedRecord(findById(tickets.data.batchReplyApprovals.items, ids.batchReply), ids.batchReply, 'batch reply list approval');
  assert.equal(tickets.data.batchReplyApprovals.rejected, 1);
}

async function expectRejectedBlocksApproval(pathname, adminToken) {
  const blocked = await request(pathname, {
    body: { reason: 'rejected approval must not be approved later' },
    expectedStatus: 409,
    method: 'POST',
    token: adminToken,
  });
  assert.ok(blocked.error?.message || blocked.message || blocked.error, 'blocked response should include an error');
}

async function assertRejectedApprovalsBlock(adminToken, ids, notifyUserToken) {
  await expectRejectedBlocksApproval(`/admin/config/approvals/${encodeURIComponent(ids.config)}/approve`, adminToken);
  await expectRejectedBlocksApproval(`/admin/exports/approvals/${encodeURIComponent(ids.export)}/approve`, adminToken);
  await expectRejectedBlocksApproval(`/admin/notifications/${encodeURIComponent(ids.notification)}/approve`, adminToken);
  await expectRejectedBlocksApproval(`/admin/sanction-approvals/${encodeURIComponent(ids.sanction)}/approve`, adminToken);
  await expectRejectedBlocksApproval(`/admin/data-clear-approvals/${encodeURIComponent(ids.dataClear)}/approve`, adminToken);
  await expectRejectedBlocksApproval(`/admin/tickets/batch-replies/${encodeURIComponent(ids.batchReply)}/approve`, adminToken);

  const inbox = await request('/notifications', { token: notifyUserToken });
  assert.ok(!inbox.data.some((item) => item.campaignId === ids.notification), 'rejected notification must not reach inbox');
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    await enableApprovalPolicies(adminToken);
    const { ids, notifyUserToken } = await createApprovals(adminToken);
    await rejectApprovals(adminToken, ids);
    await assertRejectedLists(adminToken, ids);
    await assertRejectedApprovalsBlock(adminToken, ids, notifyUserToken);
    console.log('high risk approval reject smoke passed');
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
