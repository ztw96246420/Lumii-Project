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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-sanction-policy-'));
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
    body: { deviceId: `sanction-policy-smoke-${phone}`, phone },
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
    const authorPhone = '19900006701';
    const reporterPhone = '19900006702';
    const authorToken = await loginUser(authorPhone);
    const reporterToken = await loginUser(reporterPhone);
    const adminToken = await loginAdmin();

    await createPet(authorToken, 'PolicyLucky');
    await createPet(reporterToken, 'PolicyMochi', 'cat');
    await refreshPresence(authorToken, 22.543096, 114.057865);
    await refreshPresence(reporterToken, 22.5433, 114.058);

    const post = await request('/social/pet-circle/posts', {
      body: {
        content: 'sanction policy review smoke target',
        location: { accuracy: 25, latitude: 22.543096, longitude: 114.057865, radiusKm: 3, updatedAt: Date.now() },
        visibility: 'nearby',
      },
      method: 'POST',
      token: authorToken,
    });
    const report = await request(`/social/pet-circle/posts/${encodeURIComponent(post.data.id)}/report`, {
      body: { content: 'sanction policy review report' },
      method: 'POST',
      token: reporterToken,
    });
    await request(`/admin/social/reports/${encodeURIComponent(report.data.id)}/resolve`, {
      body: { reason: 'Policy smoke valid report', status: 'valid' },
      method: 'POST',
      token: adminToken,
    });
    const applied = await request(`/admin/social/reports/${encodeURIComponent(report.data.id)}/sanction`, {
      body: { reason: 'Policy smoke applies suggested sanction', templateId: 'report_valid_mute_24h' },
      method: 'POST',
      token: adminToken,
    });

    let policy = await request('/admin/sanction-policy-review', { token: adminToken });
    assert.equal(policy.data.summary.total, 1);
    assert.equal(policy.data.reportSuggestions.applied, 1);
    assert.equal(policy.data.mobileImpact.activeTypeCounts.mute, 1);
    assert.equal(policy.data.summary.activeRestrictiveUsers, 1);
    assert.ok(policy.data.templateRows.some((row) => row.templateId === 'report_valid_mute_24h' && row.total === 1));
    assert.ok(policy.data.sourceRows.some((row) => row.source === 'social_report' && row.total === 1));

    const appeal = await request('/sanction-appeals', {
      body: { content: 'Please review this sanction for policy smoke.', sanctionId: applied.data.sanction.id },
      method: 'POST',
      token: authorToken,
    });
    await request(`/admin/sanction-appeals/${encodeURIComponent(appeal.data.id)}/approve`, {
      body: { reason: 'Policy smoke appeal approved', revokeSanction: true },
      method: 'POST',
      token: adminToken,
    });

    const manualFreeze = await request(`/admin/users/${authorPhone}/sanctions`, {
      body: { durationHours: 72, reason: 'Policy smoke repeat violation freeze', type: 'freeze' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(manualFreeze.data?.type, 'freeze');

    policy = await request('/admin/sanction-policy-review', { token: adminToken });
    assert.equal(policy.data.summary.total, 2);
    assert.equal(policy.data.summary.appeals, 1);
    assert.equal(policy.data.summary.approvedAppeals, 1);
    assert.equal(policy.data.summary.overturnRate, 100);
    assert.equal(policy.data.mobileImpact.activeTypeCounts.freeze, 1);
    assert.ok(policy.data.templateRows.some((row) => row.templateId === 'report_valid_mute_24h' && row.revoked === 1 && row.overturnRate === 100));
    assert.ok(policy.data.repeatOffenders.some((row) => row.phone === authorPhone && row.total === 2));
    assert.ok(policy.data.recommendations.length >= 1, 'policy review should return operational recommendations');

    const me = await request('/me', { token: authorToken });
    assert.equal(me.data?.accountStatus, 'frozen');

    console.log('sanction policy review smoke passed');
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
