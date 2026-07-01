#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-config-schedule-'));
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

function soon(ms = 2500) {
  return new Date(Date.now() + ms).toISOString();
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

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const initial = await request('/app/config');
    const initialRadius = initial.data.social.discoverRadiusKm;

    const canceled = await request('/admin/config/schedules', {
      body: {
        action: 'publish',
        reason: 'schedule cancel smoke',
        scheduledAt: soon(),
        social: { discoverRadiusKm: initialRadius + 3 },
      },
      method: 'POST',
      token: adminToken,
    });
    const canceledScheduleId = canceled.data.schedule.id;
    assert.equal(canceled.data.schedule.status, 'scheduled');

    await request(`/admin/config/schedules/${encodeURIComponent(canceledScheduleId)}/cancel`, {
      body: { reason: 'cancel scheduled config smoke' },
      method: 'POST',
      token: adminToken,
    });
    await delay(3000);
    const afterCanceled = await request('/app/config');
    assert.equal(afterCanceled.data.social.discoverRadiusKm, initialRadius);

    const scheduled = await request('/admin/config/schedules', {
      body: {
        action: 'publish',
        reason: 'schedule publish smoke',
        scheduledAt: soon(),
        social: { discoverRadiusKm: initialRadius + 1 },
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(scheduled.data.schedule.status, 'scheduled');

    const beforeDue = await request('/app/config');
    assert.equal(beforeDue.data.social.discoverRadiusKm, initialRadius);
    await delay(3000);

    const afterDue = await request('/app/config');
    assert.equal(afterDue.data.social.discoverRadiusKm, initialRadius + 1);

    const configAfterDue = await request('/admin/config', { token: adminToken });
    assert.ok(configAfterDue.data.revisions.some((item) => item.action === 'scheduled_publish'), 'missing scheduled publish revision');

    const stale = await request('/admin/config/schedules', {
      body: {
        action: 'publish',
        reason: 'schedule stale smoke',
        scheduledAt: soon(),
        social: { discoverRadiusKm: initialRadius + 2 },
      },
      method: 'POST',
      token: adminToken,
    });
    const staleScheduleId = stale.data.schedule.id;

    await request('/admin/config', {
      body: {
        reason: 'change baseline before scheduled publish',
        social: { nearbyMomentTtlDays: 11 },
      },
      method: 'PATCH',
      token: adminToken,
    });
    await delay(3000);

    const afterStale = await request('/app/config');
    assert.equal(afterStale.data.social.discoverRadiusKm, initialRadius + 1);
    assert.equal(afterStale.data.social.nearbyMomentTtlDays, 11);

    const allSchedules = await request('/admin/config/schedules?status=all&limit=20', { token: adminToken });
    const staleRecord = allSchedules.data.items.find((item) => item.id === staleScheduleId);
    assert.equal(staleRecord?.status, 'failed');
    assert.match(staleRecord?.failureReason || '', /当前配置已变化/);
    assert.equal(allSchedules.data.summary.canceled, 1);
    assert.equal(allSchedules.data.summary.published, 1);
    assert.equal(allSchedules.data.summary.failed, 1);

    const audit = await request('/admin/audit-logs?limit=100', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'config.schedule.create'), 'schedule creation should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'config.schedule.publish'), 'schedule publish should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'config.schedule.cancel'), 'schedule cancel should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'config.schedule.fail'), 'schedule failure should be audited');

    console.log('config scheduled publish smoke passed');
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
