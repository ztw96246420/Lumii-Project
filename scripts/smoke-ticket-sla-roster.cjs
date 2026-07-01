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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-ticket-sla-'));
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
    body: { deviceId: `ticket-sla-${phone}`, phone },
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
    const phone = '19900007300';
    const userToken = await loginUser(phone);
    const adminToken = await loginAdmin();

    await request('/admin/config', {
      body: {
        reason: 'ticket SLA roster smoke',
        support: {
          assignees: [
            { active: true, endTime: '23:59', id: 'agent_a', name: '小伴客服', role: '一线客服', startTime: '00:00', weekdays: [0, 1, 2, 3, 4, 5, 6] },
            { active: true, endTime: '23:59', id: 'agent_b', name: '小灵客服', role: '安全客服', startTime: '00:00', weekdays: [0, 1, 2, 3, 4, 5, 6] },
          ],
          firstResponseSlaHours: { high: 3, low: 24, normal: 8, urgent: 1 },
          resolutionSlaHours: { high: 18, low: 120, normal: 48, urgent: 6 },
          slaHours: { high: 18, low: 120, normal: 48, urgent: 6 },
        },
      },
      method: 'PATCH',
      token: adminToken,
    });

    const appConfig = await request('/app/config', { token: userToken });
    assert.equal(appConfig.data.support.firstResponseSlaHours.urgent, 1);
    assert.equal(appConfig.data.support.resolutionSlaHours.urgent, 6);
    assert.equal(appConfig.data.support.assignees, undefined, 'app config must not expose support roster');

    const feedback = await request('/feedback', {
      body: { category: 'safety', contact: 'ticket-sla@example.com', content: '有人在附近互动里持续骚扰我，请帮忙看一下。' },
      method: 'POST',
      token: userToken,
    });
    const ticketId = feedback.data.supportTicketId;
    assert.ok(ticketId, 'feedback should create support ticket');

    const userTicketsBefore = await request('/support/tickets', { token: userToken });
    const publicTicketBefore = userTicketsBefore.data.tickets.find((ticket) => ticket.id === ticketId);
    assert.equal(publicTicketBefore.slaType, 'first_response');
    assert.equal(publicTicketBefore.slaHours, 1);

    const adminTicketsBefore = await request('/admin/tickets?status=all', { token: adminToken });
    assert.equal(adminTicketsBefore.data.assignees.length, 2);
    assert.equal(adminTicketsBefore.data.slaPolicy.firstResponseSlaHours.urgent, 1);
    assert.equal(adminTicketsBefore.data.slaPolicy.resolutionSlaHours.urgent, 6);
    assert.ok(adminTicketsBefore.data.rosterConflicts.length >= 1, 'overlapping support shifts should be flagged');
    assert.equal(adminTicketsBefore.data.quality.firstResponseRate, 0);
    assert.equal(adminTicketsBefore.data.quality.noReplyOpen, 1);
    const adminTicketBefore = adminTicketsBefore.data.tickets.find((ticket) => ticket.id === ticketId);
    assert.equal(adminTicketBefore.firstResponseSlaState, 'healthy');
    assert.equal(adminTicketBefore.slaType, 'first_response');
    assert.equal(adminTicketsBefore.data.summary.unassigned, 1);

    await request(`/admin/tickets/${encodeURIComponent(ticketId)}/assign`, {
      body: { assignee: 'ghost_agent', reason: 'invalid assignee should fail' },
      expectedStatus: 400,
      method: 'POST',
      token: adminToken,
    });

    const assigned = await request(`/admin/tickets/${encodeURIComponent(ticketId)}/assign`, {
      body: { assignee: 'agent_b', reason: 'assign to safety support' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(assigned.data.assignee, 'agent_b');
    assert.equal(assigned.data.assigneeName, '小灵客服');
    assert.equal(assigned.data.firstResponseSlaState, 'healthy');
    assert.equal(assigned.data.slaType, 'first_response');
    assert.equal(assigned.data.slaHours, 1);
    assert.equal(assigned.data.resolutionSlaHours, 6);

    const adminTicketsAssigned = await request('/admin/tickets?status=all', { token: adminToken });
    const agentBeforeReply = adminTicketsAssigned.data.quality.byAssignee.find((item) => item.assigneeId === 'agent_b');
    assert.equal(agentBeforeReply.open, 1);
    assert.equal(agentBeforeReply.firstResponseRate, 0);

    const replied = await request(`/admin/tickets/${encodeURIComponent(ticketId)}/reply`, {
      body: { content: '你好，我们已经接手这条安全反馈，会继续核对相关互动记录。', nextStatus: 'resolved', notifyUser: true },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(replied.data.status, 'resolved');
    assert.equal(replied.data.firstResponseSlaState, 'done');
    assert.equal(replied.data.resolutionSlaState, 'done');

    const detail = await request(`/support/tickets/${encodeURIComponent(ticketId)}`, { token: userToken });
    assert.equal(detail.data.status, 'resolved');
    assert.equal(detail.data.slaState, 'done');
    assert.ok(detail.data.messages.some((message) => message.author === 'support'));

    const rated = await request(`/support/tickets/${encodeURIComponent(ticketId)}/rate`, {
      body: { comment: '处理清楚', rating: 5 },
      method: 'POST',
      token: userToken,
    });
    assert.equal(rated.data.satisfaction.rating, 5);

    await request('/admin/tickets/batch', {
      body: { action: 'priority', priority: 'high', reason: 'ticket quality smoke batch review', ticketIds: [ticketId] },
      method: 'POST',
      token: adminToken,
    });

    const adminTicketsAfter = await request('/admin/tickets?status=all', { token: adminToken });
    assert.equal(adminTicketsAfter.data.quality.firstResponseRate, 100);
    assert.equal(adminTicketsAfter.data.quality.firstResponseSlaRate, 100);
    assert.equal(adminTicketsAfter.data.quality.resolutionSlaRate, 100);
    assert.equal(adminTicketsAfter.data.quality.avgRating, 5);
    const agentAfterReply = adminTicketsAfter.data.quality.byAssignee.find((item) => item.assigneeId === 'agent_b');
    assert.equal(agentAfterReply.closed, 1);
    assert.equal(agentAfterReply.firstResponseRate, 100);
    assert.equal(agentAfterReply.resolutionSlaRate, 100);
    assert.equal(agentAfterReply.avgRating, 5);
    assert.ok(adminTicketsAfter.data.batchReview.items.some((item) => item.action === 'priority' && item.successCount === 1), 'batch review should include priority update');

    const audit = await request('/admin/audit-logs?limit=100', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'config.update'), 'config update should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'ticket.update' && item.targetId === ticketId), 'ticket assignment should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'ticket.reply.create' && item.targetId === ticketId), 'ticket reply should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'ticket.batch.update'), 'ticket batch review should be audited');

    console.log('ticket SLA roster smoke passed');
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
