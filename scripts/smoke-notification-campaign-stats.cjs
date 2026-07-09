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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-notification-stats-'));
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
    body: { deviceId: `notification-stats-smoke-${phone}`, phone },
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
    const phone = '19900006002';
    const userToken = await loginUser(phone);
    const adminToken = await loginAdmin();

    const sendPayload = await request('/admin/notifications/system', {
      body: {
        actionRoute: 'notifications',
        mode: 'send',
        phones: phone,
        reason: 'notification stats smoke',
        respectUserSettings: false,
        target: 'phones',
        text: '这是一条通知运营效果统计 smoke。',
        title: '通知统计测试',
      },
      method: 'POST',
      token: adminToken,
    });
    const campaignId = sendPayload.data?.notification?.id;
    assert.ok(campaignId, 'missing campaign id');

    const notificationsPayload = await request('/notifications', { token: userToken });
    const notification = notificationsPayload.data.find((item) => item.campaignId === campaignId);
    assert.ok(notification, 'missing delivered notification');
    assert.equal(notification.read, false);

    await request('/analytics/events', {
      body: {
        appBuild: 99,
        appVersion: 'smoke',
        name: 'notification.impression',
        occurredAt: new Date().toISOString(),
        platform: 'smoke',
        properties: {
          campaignId,
          kind: 'system',
          notificationId: notification.id,
          route: 'notifications',
          source: 'smoke',
        },
        route: 'notifications',
        source: 'smoke',
      },
      method: 'POST',
      token: userToken,
    });

    await request('/notifications/read', {
      body: { ids: [notification.id] },
      method: 'POST',
      token: userToken,
    });

    await request('/analytics/events', {
      body: {
        appBuild: 99,
        appVersion: 'smoke',
        name: 'notification.open',
        occurredAt: new Date().toISOString(),
        platform: 'smoke',
        properties: {
          campaignId,
          kind: 'system',
          notificationId: notification.id,
          route: 'notifications',
        },
        route: 'notifications',
        source: 'smoke',
      },
      method: 'POST',
      token: userToken,
    });

    const adminNotifications = await request('/admin/notifications', { token: adminToken });
    const campaign = adminNotifications.data.campaigns.find((item) => item.id === campaignId);
    assert.ok(campaign, 'missing campaign in admin list');
    assert.equal(campaign.deliveredCount, 1);
    assert.equal(campaign.impressionCount, 1);
    assert.equal(campaign.uniqueImpressionCount, 1);
    assert.equal(campaign.impressionRate, 100);
    assert.equal(campaign.readCount, 1);
    assert.equal(campaign.uniqueOpenCount, 1);
    assert.equal(campaign.openCount, 1);
    assert.equal(campaign.readRate, 100);
    assert.equal(campaign.openRate, 100);
    assert.equal(adminNotifications.data.summary.impressions, 1);
    assert.equal(adminNotifications.data.summary.impressionRate, 100);
    assert.equal(adminNotifications.data.summary.reads, 1);
    assert.equal(adminNotifications.data.summary.opens, 1);
    assert.equal(adminNotifications.data.summary.readRate, 100);
    assert.equal(adminNotifications.data.summary.openRate, 100);

    const analytics = await request('/admin/analytics?days=7', { token: adminToken });
    assert.equal(analytics.data.summary.events.notificationImpressions, 1);
    assert.equal(analytics.data.summary.events.systemNotificationImpressions, 1);
    assert.equal(analytics.data.summary.events.notificationOpens, 1);
    assert.equal(analytics.data.summary.events.systemNotificationOpens, 1);
    assert.ok(analytics.data.buckets.some((bucket) => bucket.systemNotificationImpressions === 1), 'bucket should include system notification impressions');
    assert.ok(analytics.data.buckets.some((bucket) => bucket.systemNotificationOpens === 1), 'bucket should include system notification opens');

    console.log('notification campaign stats smoke passed');
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
