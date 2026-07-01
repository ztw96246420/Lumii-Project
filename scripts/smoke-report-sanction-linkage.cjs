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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-report-sanction-'));
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
    body: { deviceId: `report-sanction-smoke-${phone}`, phone },
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

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const authorPhone = '19900006401';
    const reporterPhone = '19900006402';
    const authorToken = await loginUser(authorPhone);
    const reporterToken = await loginUser(reporterPhone);
    const adminToken = await loginAdmin();

    await createPet(authorToken, 'ReportLucky');
    await createPet(reporterToken, 'ReportMochi', 'cat');
    await refreshPresence(authorToken, 22.543096, 114.057865);
    await refreshPresence(reporterToken, 22.5433, 114.058);

    const post = await request('/social/pet-circle/posts', {
      body: {
        content: 'report sanction linkage smoke target',
        location: { accuracy: 25, latitude: 22.543096, longitude: 114.057865, radiusKm: 3, updatedAt: Date.now() },
        visibility: 'nearby',
      },
      method: 'POST',
      token: authorToken,
    });
    assert.ok(post.data?.id, 'author post should be created');

    const report = await request(`/social/pet-circle/posts/${encodeURIComponent(post.data.id)}/report`, {
      body: { content: '举报成立处罚建议 smoke' },
      method: 'POST',
      token: reporterToken,
    });
    assert.equal(report.data?.reported, true);
    assert.equal(report.data?.targetType, 'post');

    const pendingReports = await request('/admin/social/reports', { token: adminToken });
    const pending = pendingReports.data.find((item) => item.id === report.data.id);
    assert.equal(pending?.status, 'pending');
    assert.equal(pending?.sanctionSuggestion, null, 'pending report should not have sanction suggestion yet');
    assert.equal(pending?.evidenceSnapshot?.targetType, 'post');

    const resolved = await request(`/admin/social/reports/${encodeURIComponent(report.data.id)}/resolve`, {
      body: { reason: 'Smoke report is valid', status: 'valid' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(resolved.data?.status, 'valid');
    assert.equal(resolved.data?.sanctionSuggestion?.status, 'suggested');
    assert.equal(resolved.data?.sanctionSuggestion?.templateId, 'report_valid_mute_24h');
    assert.equal(resolved.data?.sanctionSuggestion?.evidenceSnapshot?.snapshotId, resolved.data?.evidenceSnapshot?.snapshotId);

    const authorNotificationsBeforeSanction = await request('/notifications', { token: authorToken });
    assert.ok(
      authorNotificationsBeforeSanction.data.some((item) => item.kind === 'system' && item.targetId === post.data.id),
      'valid report should notify the reported author before sanction',
    );

    const applied = await request(`/admin/social/reports/${encodeURIComponent(report.data.id)}/sanction`, {
      body: { reason: 'Smoke report sanction applied', templateId: 'report_valid_mute_24h' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(applied.data?.report?.sanctionSuggestion?.status, 'applied');
    assert.equal(applied.data?.sanction?.source, 'social_report');
    assert.equal(applied.data?.sanction?.sourceReportId, report.data.id);
    assert.equal(applied.data?.sanction?.sourceTargetId, post.data.id);
    assert.equal(applied.data?.sanction?.evidenceSnapshot?.snapshotId, resolved.data?.evidenceSnapshot?.snapshotId);

    await request(`/admin/social/reports/${encodeURIComponent(report.data.id)}/sanction`, {
      body: { reason: 'duplicate sanction should fail', templateId: 'report_valid_mute_24h' },
      expectedStatus: 400,
      method: 'POST',
      token: adminToken,
    });

    const authorMe = await request('/me', { token: authorToken });
    assert.equal(authorMe.data?.accountStatus, 'muted');
    assert.ok(authorMe.data?.sanctions?.activeTypes?.includes('mute'), 'author account snapshot should expose active mute');

    const blockedPost = await request('/social/pet-circle/posts', {
      body: {
        content: 'this should be blocked by report-linked mute',
        location: { accuracy: 25, latitude: 22.543096, longitude: 114.057865, radiusKm: 3, updatedAt: Date.now() },
        visibility: 'nearby',
      },
      expectedStatus: 403,
      method: 'POST',
      token: authorToken,
    });
    assert.equal(blockedPost.error?.code, 'ACCOUNT_MUTED');

    const appeal = await request('/sanction-appeals', {
      body: { content: '我认为这次举报处罚存在误会，请复核证据。', sanctionId: applied.data.sanction.id },
      method: 'POST',
      token: authorToken,
    });
    assert.equal(appeal.data?.sanctionId, applied.data.sanction.id);
    assert.equal(appeal.data?.status, 'pending');

    const authorNotificationsAfterSanction = await request('/notifications', { token: authorToken });
    assert.ok(
      authorNotificationsAfterSanction.data.some((item) => item.sanctionId === applied.data.sanction.id && item.actionRoute === 'safety'),
      'report-linked sanction should notify author and route to safety screen',
    );

    const audit = await request('/admin/audit-logs?limit=50', { token: adminToken });
    assert.ok(
      audit.data.items.some((item) => item.action === 'social.report.sanction' && item.targetId === report.data.id),
      'report-linked sanction should write audit log',
    );

    console.log('report sanction linkage smoke passed');
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
