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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-notification-audience-'));
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
    body: { deviceId: `notification-audience-smoke-${phone}`, phone },
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
    const phones = ['19900006101', '19900006102'];
    const [firstToken, secondToken] = await Promise.all(phones.map((phone) => loginUser(phone)));
    const adminToken = await loginAdmin();

    const audiencePayload = await request('/admin/notifications/audience-packages', {
      body: {
        description: 'notification audience package smoke',
        name: '灰度测试人群',
        phones: phones.join('\n'),
      },
      method: 'POST',
      token: adminToken,
    });
    const audiencePackage = audiencePayload.data?.audiencePackage;
    assert.ok(audiencePackage?.id, 'missing audience package id');
    assert.equal(audiencePackage.phoneCount, 2);
    assert.equal(audiencePackage.reachableCount, 2);
    assert.equal(audiencePackage.missingCount, 0);

    const sendPayload = await request('/admin/notifications/system', {
      body: {
        actionRoute: 'notifications',
        audiencePackageId: audiencePackage.id,
        mode: 'send',
        reason: 'notification audience smoke',
        respectUserSettings: false,
        target: 'audience_package',
        text: '这是一条通知人群包 smoke。',
        title: '人群包通知测试',
      },
      method: 'POST',
      token: adminToken,
    });
    const campaign = sendPayload.data?.notification;
    assert.ok(campaign?.id, 'missing campaign id');
    assert.equal(campaign.target, 'audience_package');
    assert.equal(campaign.audiencePackageId, audiencePackage.id);
    assert.equal(campaign.audiencePackageName, audiencePackage.name);
    assert.equal(campaign.audienceCount, 2);
    assert.equal(campaign.deliveredCount, 2);

    const firstNotifications = await request('/notifications', { token: firstToken });
    const secondNotifications = await request('/notifications', { token: secondToken });
    assert.ok(firstNotifications.data.some((item) => item.campaignId === campaign.id), 'first user did not receive campaign');
    assert.ok(secondNotifications.data.some((item) => item.campaignId === campaign.id), 'second user did not receive campaign');

    const adminNotifications = await request('/admin/notifications', { token: adminToken });
    const listedCampaign = adminNotifications.data.campaigns.find((item) => item.id === campaign.id);
    assert.ok(listedCampaign, 'missing campaign in admin list');
    assert.equal(listedCampaign.target, 'audience_package');
    assert.equal(listedCampaign.audiencePackageId, audiencePackage.id);
    assert.equal(listedCampaign.deliveredCount, 2);
    assert.equal(adminNotifications.data.summary.audiencePackages, 1);

    const listedPackage = adminNotifications.data.audiencePackages.find((item) => item.id === audiencePackage.id);
    assert.ok(listedPackage, 'missing audience package in admin list');
    assert.equal(listedPackage.reachableCount, 2);
    assert.equal(listedPackage.lastUsedCount, 2);
    assert.ok(listedPackage.lastUsedAt, 'audience package lastUsedAt should be set');

    console.log('notification audience packages smoke passed');
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
