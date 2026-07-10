#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_PHONE = '13900008888';
const PET_ID = 'pet-observability-alerts';
const AVATAR_JOB_ID = 'avatar-observability-alerts';
const ANIMATION_JOB_ID = 'animation-observability-alerts';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-observability-alerts-'));
const statePath = path.join(tmpDir, 'state.json');

let backendProcess = null;
let baseUrl = '';
let webhookMode = 'success';
const webhookProvider = String(process.env.SMOKE_ALERT_PROVIDER || 'generic').trim().toLowerCase();
let webhookServer = null;
let webhookUrl = '';
const webhookRequests = [];

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

async function startWebhookServer() {
  webhookServer = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {}
      webhookRequests.push({ method: req.method, payload, url: req.url });
      if (webhookMode === 'fail') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'smoke webhook unavailable' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Request-Id': `smoke-${webhookRequests.length}` });
      res.end(JSON.stringify(
        webhookProvider === 'wecom' || webhookProvider === 'dingtalk'
          ? { errcode: 0, errmsg: 'ok' }
          : webhookProvider === 'feishu'
            ? { code: 0, msg: 'success' }
            : { ok: true },
      ));
    });
  });
  await new Promise((resolve, reject) => {
    webhookServer.once('error', reject);
    webhookServer.listen(0, '127.0.0.1', resolve);
  });
  const address = webhookServer.address();
  webhookUrl = `http://127.0.0.1:${address.port}/admin-alerts`;
}

async function stopWebhookServer() {
  if (!webhookServer) return;
  const server = webhookServer;
  webhookServer = null;
  await new Promise((resolve) => server.close(resolve));
}

async function waitForWebhookCount(count, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (webhookRequests.length >= count) return;
    await delay(50);
  }
  assert.fail(`expected ${count} webhook requests, received ${webhookRequests.length}`);
}

function webhookPayloadText(payload = {}) {
  if (webhookProvider === 'wecom') return String(payload.markdown?.content || '');
  if (webhookProvider === 'feishu') return String(payload.content?.text || '');
  if (webhookProvider === 'dingtalk') return String(payload.text?.content || '');
  return String(payload.text || '');
}

function assertWebhookPayload(payload, trigger, expectedKeys = []) {
  const text = webhookPayloadText(payload);
  if (webhookProvider === 'generic') {
    assert.equal(payload.event, 'lumii.admin.alerts');
    assert.equal(payload.trigger, trigger);
    expectedKeys.forEach((key) => assert.ok(payload.alerts.some((item) => item.key === key), `missing webhook alert ${key}`));
  } else if (webhookProvider === 'wecom') {
    assert.equal(payload.msgtype, 'markdown');
  } else if (webhookProvider === 'feishu') {
    assert.equal(payload.msg_type, 'text');
  } else if (webhookProvider === 'dingtalk') {
    assert.equal(payload.msgtype, 'text');
  }
  assert.match(text, /Lumii 运营告警/);
  assert.match(text, trigger === 'manual_test' ? /后台手动测试/ : /自动巡检/);
  expectedKeys.forEach((key) => {
    const title = key === 'admin_credentials'
      ? '后台账号环境变量未完全覆盖'
      : key === 'avatar_queue'
        ? 'AI 灵伴生成队列疑似卡住'
        : key === 'manual_webhook_test'
          ? 'Lumii 站外告警通道测试'
          : key;
    assert.ok(text.includes(title), `webhook text should include ${title}`);
  });
}

function writeAlertState() {
  const now = Date.now();
  const oldAvatarAt = now - 8 * 60 * 1000;
  const oldAnimationAt = now - 18 * 60 * 1000;
  fs.writeFileSync(statePath, JSON.stringify({
    avatarAnimationJobs: {
      [ANIMATION_JOB_ID]: {
        avatarJobId: AVATAR_JOB_ID,
        createdAt: oldAnimationAt,
        duration: 4,
        id: ANIMATION_JOB_ID,
        ownerPhone: TEST_PHONE,
        petId: PET_ID,
        petName: 'Lucky',
        progress: 51,
        provider: 'doubao-seedance-1-5-pro',
        providerJobId: 'seedance-observability-alerts',
        providerStatus: 'processing',
        resolution: '480p',
        sourceAvatarUrl: 'https://example.com/lumii/avatar.png',
        status: 'processing',
        updatedAt: oldAnimationAt,
      },
    },
    avatarJobs: {
      [AVATAR_JOB_ID]: {
        createdAt: oldAvatarAt,
        id: AVATAR_JOB_ID,
        mediaId: 'media-observability-alerts',
        ownerPhone: TEST_PHONE,
        petId: PET_ID,
        petName: 'Lucky',
        progress: 52,
        provider: 'gpt-image-2',
        providerJobId: 'gpt-image2-observability-alerts',
        providerStatus: 'processing',
        quotaConsumed: true,
        status: 'processing',
        updatedAt: oldAvatarAt,
      },
    },
    users: {
      [TEST_PHONE]: {
        activePetId: PET_ID,
        createdAt: now - 24 * 60 * 60 * 1000,
        favoritePlaceIds: [],
        ownerName: 'Smoke Owner',
        permissionsOnboardingCompleted: true,
        pets: [
          {
            avatarAnimationJobId: ANIMATION_JOB_ID,
            avatarAnimationStatus: 'processing',
            birthday: '2024-01-05',
            breed: 'dog',
            gender: 'male',
            id: PET_ID,
            name: 'Lucky',
            species: 'dog',
          },
        ],
        phone: TEST_PHONE,
      },
    },
  }, null, 2));
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
      AI_STUCK_JOB_REAPER_INTERVAL_MS: '60000',
      AMAP_WEB_SERVICE_KEY: '',
      APIMART_API_KEY: '',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_ADMIN_IP_ALLOWLIST: '',
      LUMII_ADMIN_IP_WHITELIST: '',
      LUMII_ADMIN_ALERT_WEBHOOK_INITIAL_DELAY_MS: '100',
      LUMII_ADMIN_ALERT_WEBHOOK_INTERVAL_MS: '1000',
      LUMII_ADMIN_ALERT_WEBHOOK_MIN_SEVERITY: 'high',
      LUMII_ADMIN_ALERT_WEBHOOK_PROVIDER: webhookProvider,
      LUMII_ADMIN_ALERT_WEBHOOK_REPEAT_MS: '3600000',
      LUMII_ADMIN_ALERT_WEBHOOK_URL: webhookUrl,
      LUMII_ADMIN_PASSWORD: '',
      LUMII_ADMIN_USERNAME: '',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      PET_AVATAR_ANIMATION_PROVIDER: 'doubao-seedance-1-5-pro',
      PET_AVATAR_PROVIDER: 'gpt-image-2',
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
      resolve();
    }, 3000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    if (child.exitCode === null) child.kill();
  });
}

async function loginAdmin() {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing admin token');
  return payload.data.token;
}

function assertAlertKeys(alerts, keys) {
  const actual = new Set((alerts.items || []).map((item) => item.key));
  keys.forEach((key) => {
    assert.equal(actual.has(key), true, `missing alert key: ${key}`);
  });
}

async function main() {
  writeAlertState();
  await startWebhookServer();
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const alerts = await request('/admin/dashboard/alerts', { token: adminToken });
    assert.ok(alerts.data.summary.total >= 4, 'alerts summary should include operational alerts');
    assert.ok(alerts.data.summary.needsAction >= 4, 'alerts should surface high-priority action count');
    assertAlertKeys(alerts.data, ['admin_credentials', 'admin_ip_allowlist', 'avatar_queue', 'avatar_animation_queue']);
    assert.equal(alerts.data.webhook.configured, true);
    assert.equal(alerts.data.webhook.provider, webhookProvider);
    assert.equal(alerts.data.webhook.targetHost, '127.0.0.1');

    await waitForWebhookCount(1);
    const automaticPayload = webhookRequests[0].payload;
    assertWebhookPayload(automaticPayload, 'scheduler', ['admin_credentials', 'avatar_queue']);
    await delay(2200);
    assert.equal(webhookRequests.length, 1, 'unchanged alerts should be deduplicated between scheduler sweeps');

    const manualTest = await request('/admin/dashboard/alerts/test', {
      body: { reason: 'smoke verifies manual external alert test' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(manualTest.data.sent, true);
    await waitForWebhookCount(2);
    assertWebhookPayload(webhookRequests[1].payload, 'manual_test', ['manual_webhook_test']);

    const summary = await request('/admin/dashboard/summary', { token: adminToken });
    assert.ok(summary.data.alerts.total >= alerts.data.summary.total, 'dashboard summary should expose alert totals');
    assert.ok(summary.data.alerts.needsAction >= 4, 'dashboard summary should expose high-priority alert count');

    const health = await request('/admin/system/health', { token: adminToken });
    assertAlertKeys(health.data.alerts, ['admin_credentials', 'admin_ip_allowlist', 'avatar_queue', 'avatar_animation_queue']);
    assert.equal(health.data.alertWebhook.configured, true);
    assert.ok(health.data.alertWebhook.lastSuccessAt);
    assert.equal(health.data.checks.find((item) => item.key === 'admin_alert_webhook')?.status, 'ok');

    const readiness = await request('/admin/launch/readiness', { token: adminToken });
    const observabilityGap = readiness.data.gaps.find((item) => item.key === 'observability');
    assert.ok(observabilityGap, 'readiness should include observability gap');
    assert.match(observabilityGap.evidence || '', /dashboard\/alerts/);
    assert.match(observabilityGap.evidence || '', /LUMII_ADMIN_ALERT_WEBHOOK_URL/);

    webhookMode = 'fail';
    const failedTest = await request('/admin/dashboard/alerts/test', {
      body: { reason: 'smoke verifies external alert failure tracking' },
      expectedStatus: 502,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(failedTest.error?.code, 'ADMIN_ALERT_WEBHOOK_FAILED');
    assert.equal(failedTest.data.delivery.status, 'failed');
    const failedAlerts = await request('/admin/dashboard/alerts', { token: adminToken });
    assert.equal(failedAlerts.data.webhook.lastDelivery.status, 'failed');

    webhookMode = 'success';
    const recoveredTest = await request('/admin/dashboard/alerts/test', {
      body: { reason: 'smoke verifies external alert recovery' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(recoveredTest.data.delivery.status, 'sent');
    assert.equal(recoveredTest.data.webhook.inFlight, false);

    console.log('observability alerts smoke passed');
  } finally {
    await stopBackend();
    await stopWebhookServer();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopWebhookServer();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
