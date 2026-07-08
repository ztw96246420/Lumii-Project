#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-notification-expo-push-'));
const statePath = path.join(tmpDir, 'state.json');
const expoRequests = [];
let backendProcess = null;
let expoServer = null;
let baseUrl = '';
let expoUrl = '';

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

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function startExpoServer() {
  expoServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ message: 'method not allowed' }] }));
      return;
    }
    const text = await readRequestBody(req);
    const payload = text ? JSON.parse(text) : [];
    const messages = Array.isArray(payload) ? payload : [payload];
    expoRequests.push(...messages);
    const data = messages.map((message, index) => {
      const token = String(message?.to || '');
      if (token.includes('bad-token')) {
        return {
          details: { error: 'DeviceNotRegistered' },
          message: 'The recipient device is not registered with FCM/APNs.',
          status: 'error',
        };
      }
      return { id: `expo-ticket-${index + 1}`, status: 'ok' };
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data }));
  });
  await new Promise((resolve) => expoServer.listen(0, '127.0.0.1', resolve));
  const address = expoServer.address();
  expoUrl = `http://127.0.0.1:${address.port}/--/api/v2/push/send`;
}

async function stopExpoServer() {
  if (!expoServer) return;
  const server = expoServer;
  expoServer = null;
  await new Promise((resolve) => server.close(resolve));
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
      EXPO_PUSH_ENABLED: 'true',
      EXPO_PUSH_ENDPOINT: expoUrl,
      EXPO_PUSH_TIMEOUT_MS: '3000',
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
    body: { deviceId: `notification-expo-push-smoke-${phone}`, phone },
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

async function waitForPushResult(adminToken, campaignId) {
  const deadline = Date.now() + 5000;
  let latest = null;
  while (Date.now() < deadline) {
    const payload = await request('/admin/notifications', { token: adminToken });
    latest = payload.data;
    const campaign = payload.data.campaigns.find((item) => item.id === campaignId);
    if (campaign && campaign.pushStatus && !['queued'].includes(campaign.pushStatus)) {
      return { campaign, notifications: payload.data };
    }
    await delay(100);
  }
  throw new Error(`push result did not complete: ${JSON.stringify(latest?.campaigns?.find((item) => item.id === campaignId) || null)}`);
}

async function main() {
  await startExpoServer();
  const port = await getFreePort();
  await startBackend(port);
  try {
    const phone = '19900006401';
    const userToken = await loginUser(phone);
    const adminToken = await loginAdmin();

    await request('/devices/push-token', {
      body: { deviceId: 'expo-good-device', platform: 'android', token: 'ExponentPushToken[smoke-good-token]' },
      method: 'POST',
      token: userToken,
    });
    await request('/devices/push-token', {
      body: { deviceId: 'expo-bad-device', platform: 'android', token: 'ExponentPushToken[smoke-bad-token]' },
      method: 'POST',
      token: userToken,
    });

    const sendPayload = await request('/admin/notifications/system', {
      body: {
        actionRoute: 'notifications',
        mode: 'send',
        phones: phone,
        reason: 'notification expo push smoke',
        respectUserSettings: false,
        target: 'phones',
        text: 'Expo push smoke body',
        title: 'Expo push smoke',
      },
      method: 'POST',
      token: adminToken,
    });
    const campaignId = sendPayload.data?.notification?.id;
    assert.ok(campaignId, 'missing campaign id');

    const { campaign, notifications } = await waitForPushResult(adminToken, campaignId);
    assert.equal(expoRequests.length, 2);
    assert.deepEqual(
      expoRequests.map((item) => item.to).sort(),
      ['ExponentPushToken[smoke-bad-token]', 'ExponentPushToken[smoke-good-token]'],
    );
    assert.equal(expoRequests[0].title, 'Expo push smoke');
    assert.equal(expoRequests[0].data.campaignId, campaignId);
    assert.equal(campaign.pushProvider, 'expo');
    assert.equal(campaign.pushStatus, 'partial');
    assert.equal(campaign.pushAttemptedCount, 2);
    assert.equal(campaign.pushSentCount, 1);
    assert.equal(campaign.pushFailedCount, 1);
    assert.equal(campaign.pushInvalidTokenCount, 1);
    assert.ok(campaign.pushFailedPhones.includes(phone));
    assert.equal(notifications.summary.pushEnabled, true);
    assert.equal(notifications.summary.pushProvider, 'expo');
    assert.equal(notifications.summary.pushAttempted, 2);
    assert.equal(notifications.summary.pushSent, 1);
    assert.equal(notifications.summary.pushFailed, 1);
    assert.equal(notifications.summary.pushSuccessRate, 50);

    const devicesPayload = await request('/admin/push-devices', { token: adminToken });
    const badDevice = devicesPayload.data.find((device) => device.deviceId === 'expo-bad-device');
    const goodDevice = devicesPayload.data.find((device) => device.deviceId === 'expo-good-device');
    assert.equal(goodDevice?.enabled, true);
    assert.equal(goodDevice?.lastPushStatus, 'sent');
    assert.equal(badDevice?.enabled, false);
    assert.equal(badDevice?.lastPushStatus, 'invalid');
    assert.equal(badDevice?.disabledReason, 'DeviceNotRegistered');

    console.log('notification expo push smoke passed');
  } finally {
    await stopBackend();
    await stopExpoServer();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopExpoServer();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {
    // ignore cleanup errors
  }
  console.error(error);
  process.exit(1);
});
