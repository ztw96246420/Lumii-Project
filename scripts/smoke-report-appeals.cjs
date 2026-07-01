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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-report-appeals-'));
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
    body: { deviceId: `report-appeals-${phone}`, phone },
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

async function createPet(token, name, species = 'dog') {
  const payload = await request('/pets', {
    body: {
      birthday: '2024-01-05',
      breed: species === 'cat' ? 'British Shorthair' : 'Golden',
      gender: species === 'cat' ? 'female' : 'male',
      name,
      species,
      weightKg: species === 'cat' ? 4.8 : 18.6,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `missing pet id for ${name}`);
  return payload.data;
}

async function refreshPresence(token, lat, lng) {
  const query = new URLSearchParams({
    accuracy: '25',
    lat: String(lat),
    lng: String(lng),
    radiusKm: '3',
  });
  await request(`/social/discover?${query}`, { token });
}

async function createPost(token) {
  const payload = await request('/social/pet-circle/posts', {
    body: {
      content: 'report appeal smoke target',
      location: { accuracy: 25, latitude: 22.543096, longitude: 114.057865, radiusKm: 3, updatedAt: Date.now() },
      visibility: 'nearby',
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, 'post should be created');
  return payload.data;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const ownerPhone = '19900007200';
    const reporterPhone = '19900007201';
    const secondReporterPhone = '19900007202';
    const ownerToken = await loginUser(ownerPhone);
    const reporterToken = await loginUser(reporterPhone);
    const secondReporterToken = await loginUser(secondReporterPhone);
    const adminToken = await loginAdmin();

    await createPet(ownerToken, 'AppealDog');
    await createPet(reporterToken, 'ReportCat', 'cat');
    await createPet(secondReporterToken, 'ReportDog');
    await refreshPresence(ownerToken, 22.543096, 114.057865);
    await refreshPresence(reporterToken, 22.5433, 114.058);
    await refreshPresence(secondReporterToken, 22.5434, 114.058);

    const post = await createPost(ownerToken);

    const invalidReport = await request(`/social/pet-circle/posts/${encodeURIComponent(post.id)}/report`, {
      body: { content: 'reporter disagrees with invalid result' },
      method: 'POST',
      token: reporterToken,
    });
    await request(`/admin/social/reports/${encodeURIComponent(invalidReport.data.id)}/resolve`, {
      body: { reason: 'smoke invalid report result', status: 'invalid' },
      method: 'POST',
      token: adminToken,
    });

    const reporterAppealList = await request('/sanction-appeals', { token: reporterToken });
    assert.ok(
      reporterAppealList.data.reportAppealTargets.some((target) => target.reportId === invalidReport.data.id && target.reportRole === 'reporter'),
      'reporter should see invalid report result as appealable',
    );
    const reporterAppeal = await request('/report-appeals', {
      body: { content: '我认为这次举报处理遗漏了关键证据，需要重新复核。', reportId: invalidReport.data.id },
      method: 'POST',
      token: reporterToken,
    });
    assert.equal(reporterAppeal.data.appealType, 'report');
    assert.equal(reporterAppeal.data.reportId, invalidReport.data.id);
    assert.equal(reporterAppeal.data.reportRole, 'reporter');
    const duplicateReporterAppeal = await request('/report-appeals', {
      body: { content: '重复提交应该返回原申诉。', reportId: invalidReport.data.id },
      method: 'POST',
      token: reporterToken,
    });
    assert.equal(duplicateReporterAppeal.data.duplicate, true, 'duplicate open report appeal should be idempotent');

    const validReport = await request(`/social/pet-circle/posts/${encodeURIComponent(post.id)}/report`, {
      body: { content: 'owner will appeal valid result' },
      method: 'POST',
      token: secondReporterToken,
    });
    await request(`/admin/social/reports/${encodeURIComponent(validReport.data.id)}/resolve`, {
      body: { reason: 'smoke valid report result', status: 'valid' },
      method: 'POST',
      token: adminToken,
    });

    const ownerAppealList = await request('/sanction-appeals', { token: ownerToken });
    assert.ok(
      ownerAppealList.data.reportAppealTargets.some((target) => target.reportId === validReport.data.id && target.reportRole === 'owner'),
      'reported owner should see valid report result as appealable',
    );
    const ownerAppeal = await request('/report-appeals', {
      body: { content: '这条小事没有违规，请运营重新查看上下文。', reportId: validReport.data.id },
      method: 'POST',
      token: ownerToken,
    });
    assert.equal(ownerAppeal.data.reportRole, 'owner');

    const adminAppeals = await request('/admin/sanction-appeals?type=report&status=open', { token: adminToken });
    assert.ok(adminAppeals.data.summary.report >= 2, 'admin appeal summary should count report appeals');
    assert.ok(
      adminAppeals.data.appeals.some((appeal) => appeal.id === reporterAppeal.data.id && appeal.appealType === 'report'),
      'admin appeal queue should include reporter appeal',
    );

    await request(`/admin/sanction-appeals/${encodeURIComponent(reporterAppeal.data.id)}/approve`, {
      body: { reason: 'smoke approve reporter report appeal' },
      method: 'POST',
      token: adminToken,
    });
    await request(`/admin/sanction-appeals/${encodeURIComponent(ownerAppeal.data.id)}/reject`, {
      body: { reason: 'smoke reject owner report appeal' },
      method: 'POST',
      token: adminToken,
    });

    const reporterNotifications = await request('/notifications', { token: reporterToken });
    assert.ok(
      reporterNotifications.data.some((item) => item.reportAppealId === reporterAppeal.data.id && item.reportId === invalidReport.data.id && item.actionRoute === 'safety'),
      'reporter should receive report appeal result notification',
    );
    const ownerNotifications = await request('/notifications', { token: ownerToken });
    assert.ok(
      ownerNotifications.data.some((item) => item.reportAppealId === ownerAppeal.data.id && item.reportId === validReport.data.id && item.actionRoute === 'safety'),
      'owner should receive report appeal result notification',
    );

    const reporterTimeline = await request(`/admin/users/${reporterPhone}/timeline?kind=safety&limit=50`, { token: adminToken });
    assert.ok(
      reporterTimeline.data.items.some((item) => item.targetType === 'report_appeal' && item.targetId === invalidReport.data.id),
      'user timeline should include report appeal',
    );

    const audit = await request('/admin/audit-logs?limit=100', { token: adminToken });
    assert.ok(
      audit.data.items.some((item) => item.action === 'report.appeal.approve' && item.targetId === reporterAppeal.data.id),
      'approving report appeal should write audit log',
    );
    assert.ok(
      audit.data.items.some((item) => item.action === 'report.appeal.reject' && item.targetId === ownerAppeal.data.id),
      'rejecting report appeal should write audit log',
    );

    console.log('report appeals smoke passed');
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
