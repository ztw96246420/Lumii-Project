#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-config-risk-'));
const statePath = path.join(tmpDir, 'state.json');
const confirmText = '确认发布高风险配置';
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
    const adminToken = await loginAdmin();

    const invalidAnnouncement = await request('/admin/config', {
      body: {
        app: { announcement: { body: 'Smoke 公告正文', enabled: true, title: '', version: 'smoke-announcement' } },
        reason: 'reject incomplete app announcement',
      },
      expectedStatus: 400,
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(invalidAnnouncement.error?.code, 'ADMIN_CONFIG_APP_DELIVERY_INVALID');
    assert.equal(invalidAnnouncement.data?.field, 'app.announcement.title');

    const invalidUpdate = await request('/admin/config', {
      body: {
        app: { update: { androidUrl: '', enabled: true, force: false, latestBuildNumber: 18 } },
        reason: 'reject update without android url',
      },
      expectedStatus: 400,
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(invalidUpdate.error?.code, 'ADMIN_CONFIG_APP_DELIVERY_INVALID');
    assert.equal(invalidUpdate.data?.field, 'app.update.androidUrl');

    const validAppDelivery = await request('/admin/config', {
      body: {
        app: {
          announcement: { actionLabel: '查看反馈', actionRoute: 'supportTickets', body: 'Smoke 运营公告正文', enabled: true, title: 'Smoke 运营公告', version: 'smoke-announcement-v1' },
          splash: { actionLabel: '查看地图', actionRoute: 'map', body: 'Smoke 启动提示正文', enabled: true, title: 'Smoke 启动提示', version: 'smoke-splash-v1' },
          update: { androidUrl: 'https://download.lumiiapp.cn/Lumii-Lingban.apk', enabled: true, force: false, latestBuildNumber: 18, latestVersion: '1.0.0' },
        },
        reason: 'publish valid app delivery config',
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(validAppDelivery.data.app.announcement.enabled, true);
    assert.equal(validAppDelivery.data.app.splash.enabled, true);
    assert.equal(validAppDelivery.data.app.update.androidUrl, 'https://download.lumiiapp.cn/Lumii-Lingban.apk');

    const invalidDraft = await request('/admin/config/drafts', {
      body: {
        app: { splash: { body: '', enabled: true, title: 'Incomplete splash', version: 'incomplete-splash' } },
        reason: 'save incomplete splash draft',
      },
      method: 'POST',
      token: adminToken,
    });
    const invalidDraftId = invalidDraft.data.draft?.id;
    assert.ok(invalidDraftId, 'missing incomplete app delivery draft id');
    const invalidDraftPublish = await request(`/admin/config/drafts/${encodeURIComponent(invalidDraftId)}/publish`, {
      body: { reason: 'reject incomplete splash draft publish' },
      expectedStatus: 400,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(invalidDraftPublish.error?.code, 'ADMIN_CONFIG_APP_DELIVERY_INVALID');
    assert.equal(invalidDraftPublish.data?.field, 'app.splash.body');

    const invalidApproval = await request('/admin/config/approvals', {
      body: {
        action: 'publish',
        app: { announcement: { enabled: true, title: '', version: 'approval-invalid' } },
        reason: 'reject incomplete announcement approval',
      },
      expectedStatus: 400,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(invalidApproval.error?.code, 'ADMIN_CONFIG_APP_DELIVERY_INVALID');
    assert.equal(invalidApproval.data?.field, 'app.announcement.title');

    const invalidSchedule = await request('/admin/config/schedules', {
      body: {
        action: 'publish',
        app: { update: { androidUrl: '', enabled: true, force: false, latestBuildNumber: 19 } },
        reason: 'reject incomplete update schedule',
        scheduledAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
      expectedStatus: 400,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(invalidSchedule.error?.code, 'ADMIN_CONFIG_APP_DELIVERY_INVALID');
    assert.equal(invalidSchedule.data?.field, 'app.update.androidUrl');

    const rejected = await request('/admin/config', {
      body: {
        app: { maintenanceEnabled: true, maintenanceMessage: 'Smoke maintenance' },
        reason: 'risk smoke direct publish',
      },
      expectedStatus: 409,
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(rejected.error?.code, 'ADMIN_CONFIG_RISK_CONFIRM_REQUIRED');
    assert.equal(rejected.data?.confirmText, confirmText);
    assert.ok(rejected.data?.blockingRisks?.some((risk) => risk.key === 'app.maintenanceEnabled'));

    const published = await request('/admin/config', {
      body: {
        app: { maintenanceEnabled: true, maintenanceMessage: 'Smoke maintenance' },
        reason: 'risk smoke direct publish confirmed',
        riskAcknowledged: true,
        riskConfirmText: confirmText,
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(published.data.app.maintenanceEnabled, true);
    const maintenanceOnRevisionId = published.data.revisions?.[0]?.id;
    assert.ok(maintenanceOnRevisionId, 'missing maintenance-on revision id');

    const publicConfig = await request('/app/config');
    assert.equal(publicConfig.data.app.maintenanceEnabled, true);

    const draftResponse = await request('/admin/config/drafts', {
      body: {
        app: { maintenanceEnabled: false, maintenanceMessage: 'Smoke maintenance off' },
        reason: 'risk smoke draft',
      },
      method: 'POST',
      token: adminToken,
    });
    const draftId = draftResponse.data.draft?.id;
    assert.ok(draftId, 'missing draft id');

    const rejectedDraftPublish = await request(`/admin/config/drafts/${encodeURIComponent(draftId)}/publish`, {
      body: { reason: 'risk smoke draft publish' },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(rejectedDraftPublish.error?.code, 'ADMIN_CONFIG_RISK_CONFIRM_REQUIRED');

    const publishedDraft = await request(`/admin/config/drafts/${encodeURIComponent(draftId)}/publish`, {
      body: {
        reason: 'risk smoke draft publish confirmed',
        riskAcknowledged: true,
        riskConfirmText: confirmText,
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(publishedDraft.data.app.maintenanceEnabled, false);

    const rejectedRollback = await request(`/admin/config/revisions/${encodeURIComponent(maintenanceOnRevisionId)}/rollback`, {
      body: { reason: 'risk smoke rollback' },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(rejectedRollback.error?.code, 'ADMIN_CONFIG_RISK_CONFIRM_REQUIRED');

    const rollback = await request(`/admin/config/revisions/${encodeURIComponent(maintenanceOnRevisionId)}/rollback`, {
      body: {
        reason: 'risk smoke rollback confirmed',
        riskAcknowledged: true,
        riskConfirmText: confirmText,
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(rollback.data.app.maintenanceEnabled, true);

    console.log('config risk confirmation smoke passed');
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
