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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-sanction-approval-'));
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
    body: { deviceId: `sanction-approval-smoke-${phone}`, phone },
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

async function createPet(token, name) {
  const payload = await request('/pets', {
    body: {
      birthday: '2024-01-05',
      breed: 'Golden',
      gender: 'male',
      name,
      species: 'dog',
      weightKg: 18.6,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `missing pet id for ${name}`);
  return payload.data;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const banPhone = '19900006801';
    const cancelPhone = '19900006802';
    const banToken = await loginUser(banPhone);
    const cancelToken = await loginUser(cancelPhone);
    const adminToken = await loginAdmin();

    await createPet(banToken, 'ALucky');
    await createPet(cancelToken, 'CLucky');

    const blockedDirectBan = await request(`/admin/users/${banPhone}/sanctions`, {
      body: {
        durationHours: 0,
        reason: 'Smoke direct permanent ban must require approval',
        type: 'ban',
      },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(blockedDirectBan.error?.code, 'ADMIN_SANCTION_APPROVAL_REQUIRED');
    assert.equal(blockedDirectBan.data?.approvalRequired, true);

    let me = await request('/me', { token: banToken });
    assert.equal(me.data?.accountStatus, 'active');

    const approval = await request('/admin/sanction-approvals', {
      body: {
        durationHours: 0,
        phone: banPhone,
        reason: 'Smoke approved permanent ban',
        templateId: 'severe_violation_ban',
        type: 'ban',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approval.data?.approval?.status, 'pending_approval');
    assert.equal(approval.data?.approval?.phone, banPhone);

    me = await request('/me', { token: banToken });
    assert.equal(me.data?.accountStatus, 'active', 'pending approval must not restrict the user');

    let approvals = await request('/admin/sanction-approvals', { token: adminToken });
    assert.ok(approvals.data?.items?.some((item) => item.id === approval.data.approval.id));
    assert.equal(approvals.data?.summary?.pending, 1);

    const approved = await request(`/admin/sanction-approvals/${encodeURIComponent(approval.data.approval.id)}/approve`, {
      body: { reason: 'Smoke approves permanent ban' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approved.data?.approval?.status, 'approved');
    assert.ok(approved.data?.sanction?.id);
    assert.equal(approved.data?.sanction?.type, 'ban');

    me = await request('/me', { token: banToken });
    assert.equal(me.data?.accountStatus, 'banned');
    assert.ok(me.data?.sanctions?.activeTypes?.includes('ban'));

    const blockedWrite = await request('/pets', {
      body: {
        birthday: '2024-02-05',
        breed: 'Golden',
        gender: 'male',
        name: 'Blocked',
        species: 'dog',
        weightKg: 17.2,
      },
      expectedStatus: 403,
      method: 'POST',
      token: banToken,
    });
    assert.equal(blockedWrite.error?.code, 'ACCOUNT_RESTRICTED');

    const cancelApproval = await request('/admin/sanction-approvals', {
      body: {
        durationHours: 0,
        phone: cancelPhone,
        reason: 'Smoke canceled permanent ban',
        type: 'ban',
      },
      method: 'POST',
      token: adminToken,
    });
    await request(`/admin/sanction-approvals/${encodeURIComponent(cancelApproval.data.approval.id)}/cancel`, {
      body: { reason: 'Smoke cancels permanent ban approval' },
      method: 'POST',
      token: adminToken,
    });

    const cancelMe = await request('/me', { token: cancelToken });
    assert.equal(cancelMe.data?.accountStatus, 'active', 'canceled approval must not restrict the user');

    const sanctions = await request('/admin/sanctions', { token: adminToken });
    assert.ok(sanctions.data.some((item) => item.phone === banPhone && item.type === 'ban' && item.status === 'active'));
    assert.ok(!sanctions.data.some((item) => item.phone === cancelPhone && item.type === 'ban'));

    approvals = await request('/admin/sanction-approvals?status=all', { token: adminToken });
    assert.equal(approvals.data?.summary?.approved, 1);
    assert.equal(approvals.data?.summary?.canceled, 1);

    console.log('smoke-sanction-approval passed');
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
    // Ignore cleanup failures in smoke failure path.
  }
  console.error(error);
  process.exitCode = 1;
});
