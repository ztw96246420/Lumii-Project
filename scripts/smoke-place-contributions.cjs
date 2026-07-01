#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-place-contrib-'));
const statePath = path.join(tmpDir, 'state.json');
const TEST_CODE = '962464';
let baseUrl = '';
let backendProcess = null;

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
    body: { deviceId: `place-contrib-${phone}`, phone },
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

async function createSubmission(token, suffix) {
  const payload = await request('/places/submissions', {
    body: {
      address: `Smoke Contribution Road ${suffix}`,
      content: `Smoke contribution place ${suffix}: friendly grass, water bowls, leash friendly.`,
      name: `Smoke Contribution Yard ${suffix}`,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `missing submission id for ${suffix}`);
  assert.equal(payload.data.status, 'pending_review');
  return payload.data;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser('19900003001');
    const adminToken = await loginAdmin();

    const createdSubmission = await createSubmission(userToken, 'create');
    const approvePayload = await request(`/admin/places/submissions/${encodeURIComponent(createdSubmission.id)}/approve`, {
      body: { reason: 'Smoke approve created place' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approvePayload.data.status, 'approved');
    assert.equal(approvePayload.data.contributionPoints, 10);
    assert.equal(approvePayload.data.contributionAction, 'created');
    assert.ok(approvePayload.data.approvedPlaceId, 'approve should create an approved place id');

    const mySubmissionsAfterCreate = await request('/places/submissions/my', { token: userToken });
    const createdMySubmission = mySubmissionsAfterCreate.data.find((item) => item.id === createdSubmission.id);
    assert.equal(createdMySubmission?.contributionPoints, 10);
    assert.equal(createdMySubmission?.contributionActionLabel, '发现新地点');

    const catalog = await request('/admin/places', { token: adminToken });
    const targetPlaceId = catalog.data.places.find((place) => place.id !== createdMySubmission.approvedPlaceId)?.id;
    assert.ok(targetPlaceId, 'expected an existing target place');

    const linkedSubmission = await createSubmission(userToken, 'linked');
    const linkPayload = await request(`/admin/places/submissions/${encodeURIComponent(linkedSubmission.id)}/link-existing`, {
      body: { placeId: targetPlaceId, reason: 'Smoke link existing place' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(linkPayload.data.submission.status, 'approved');
    assert.equal(linkPayload.data.contribution.points, 5);
    assert.equal(linkPayload.data.contribution.action, 'linked_existing');
    assert.equal(linkPayload.data.submission.linkedExistingPlaceId, targetPlaceId);

    const contributionPayload = await request('/admin/places/contributions', { token: adminToken });
    assert.equal(contributionPayload.data.summary.total, 2);
    assert.equal(contributionPayload.data.summary.points, 15);
    assert.equal(contributionPayload.data.summary.linkedExisting, 1);

    const notifications = await request('/notifications', { token: userToken });
    const contributionNotifications = notifications.data.filter((item) => item.kind === 'place_submission' && /\+\d+贡献分/.test(item.text || ''));
    assert.equal(contributionNotifications.length, 2, 'expected contribution notifications for both submission outcomes');

    const finalSubmissions = await request('/places/submissions/my', { token: userToken });
    const linkedMySubmission = finalSubmissions.data.find((item) => item.id === linkedSubmission.id);
    assert.equal(linkedMySubmission?.contributionPoints, 5);
    assert.equal(linkedMySubmission?.contributionActionLabel, '补充已有地点');

    console.log('place contribution smoke passed');
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
