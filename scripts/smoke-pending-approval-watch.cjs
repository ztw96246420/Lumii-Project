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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-pending-approval-watch-'));
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
  assert.equal(response.status, expectedStatus, `${method} ${pathname} expected ${expectedStatus}, got ${response.status}: ${text}`);
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
    body: { deviceId: `pending-approval-watch-${phone}`, phone },
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

function assertSourceKeys(queue, expectedKeys) {
  const actual = new Set((queue.items || []).map((item) => item.sourceKey));
  expectedKeys.forEach((key) => assert.equal(actual.has(key), true, `missing pending approval source: ${key}`));
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const phoneA = '19900008901';
    const phoneB = '19900008902';
    const phoneC = '19900008903';
    const tokenA = await loginUser(phoneA);
    await loginUser(phoneB);
    await loginUser(phoneC);

    await request('/admin/config', {
      body: {
        reason: 'enable support batch reply for pending approval watch',
        support: { batchReply: { enabled: true, maxTickets: 5, requireApproval: true } },
      },
      method: 'PATCH',
      token: adminToken,
    });

    await request('/admin/config/approvals', {
      body: {
        action: 'publish',
        reason: 'pending watch config approval',
        social: { discoverRadiusKm: 5 },
      },
      method: 'POST',
      token: adminToken,
    });

    await request('/admin/notifications/system', {
      body: {
        mode: 'approval',
        phones: phoneA,
        reason: 'pending watch notification approval',
        respectUserSettings: false,
        target: 'phones',
        text: '这条通知用于值守队列 smoke。',
        title: '待审批值守通知',
      },
      method: 'POST',
      token: adminToken,
    });

    await request('/admin/exports/approvals', {
      body: {
        filters: { status: 'all' },
        reason: 'pending watch export approval',
        type: 'users',
      },
      method: 'POST',
      token: adminToken,
    });

    await request('/admin/sanction-approvals', {
      body: {
        durationHours: 0,
        phone: phoneA,
        reason: 'pending watch permanent ban approval',
        type: 'ban',
      },
      method: 'POST',
      token: adminToken,
    });

    await request('/admin/sanction-batch-approvals', {
      body: {
        durationHours: 24,
        phones: `${phoneB}\n${phoneC}`,
        reason: 'pending watch batch freeze approval',
        type: 'freeze',
      },
      method: 'POST',
      token: adminToken,
    });

    await request('/admin/data-clear-approvals', {
      body: {
        confirmation: phoneC,
        phone: phoneC,
        reason: 'pending watch data clear approval',
      },
      method: 'POST',
      token: adminToken,
    });

    const feedback = await request('/feedback', {
      body: {
        category: 'bug',
        contact: 'pending-watch@example.com',
        content: '请帮我确认通知和值守审批队列是否正常。',
      },
      method: 'POST',
      token: tokenA,
    });
    assert.ok(feedback.data?.supportTicketId, 'feedback should create support ticket');
    await request('/admin/tickets/batch-replies', {
      body: {
        content: '你好，这条反馈我们已经收到，会继续处理。',
        nextStatus: 'waiting_user',
        notifyUser: true,
        reason: 'pending watch ticket batch reply approval',
        ticketIds: [feedback.data.supportTicketId],
      },
      method: 'POST',
      token: adminToken,
    });

    const queuePayload = await request('/admin/approvals/pending', { token: adminToken });
    const queue = queuePayload.data;
    assert.equal(queue.summary.total, 7);
    assert.equal(queue.summary.groupsWithPending, 7);
    assertSourceKeys(queue, ['config', 'notifications', 'exports', 'sanctions', 'sanctionBatches', 'dataClear', 'batchReplies']);
    assert.ok(queue.items.every((item) => item.targetId && item.actionRoute && item.actionLabel));
    assert.ok(queue.items.every((item) => Number(item.requiredApprovals || 0) >= 1));
    assert.ok(queue.items.every((item) => item.expiresAt && item.minutesRemaining !== null));

    const alerts = await request('/admin/dashboard/alerts', { token: adminToken });
    const highRiskAlert = alerts.data.items.find((item) => item.key === 'high_risk_pending_approvals');
    assert.ok(highRiskAlert, 'dashboard alerts should include high-risk pending approvals');
    assert.match(highRiskAlert.detail, /7 个高风险审批等待处理/);

    const summary = await request('/admin/dashboard/summary', { token: adminToken });
    assert.ok(summary.data.alerts.total >= 1);

    console.log('pending approval watch smoke passed');
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
