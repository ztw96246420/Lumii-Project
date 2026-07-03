#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const APPROVE_PHONE = '13900008889';
const CANCEL_PHONE = '13900008890';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-data-clear-approval-'));
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
      AMAP_WEB_SERVICE_KEY: '',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      PET_AVATAR_ANIMATION_PROVIDER: 'mock',
      PET_AVATAR_PROVIDER: 'mock',
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

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `data-clear-smoke-${phone}`, phone },
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
      breed: 'dog',
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

async function petCount(token) {
  const payload = await request('/pets', { token });
  return payload.data.length;
}

async function submitApproval(adminToken, phone, reason) {
  const payload = await request('/admin/data-clear-approvals', {
    body: { confirmation: phone, phone, reason },
    method: 'POST',
    token: adminToken,
  });
  assert.ok(payload.data?.approval?.id, 'missing data clear approval id');
  return payload.data.approval;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const approveUserToken = await loginUser(APPROVE_PHONE);
    const cancelUserToken = await loginUser(CANCEL_PHONE);
    const adminToken = await loginAdmin();
    await createPet(approveUserToken, 'Lucky');
    await createPet(cancelUserToken, 'Mochi');

    const direct = await request(`/admin/users/${encodeURIComponent(APPROVE_PHONE)}/clear-business-data`, {
      body: { confirmation: APPROVE_PHONE, reason: 'smoke direct clear must require approval' },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(direct.error?.code, 'ADMIN_DATA_CLEAR_APPROVAL_REQUIRED');
    assert.equal(direct.data?.approvalRequired, true);
    assert.equal(await petCount(approveUserToken), 1, 'direct clear must not remove mobile data');

    const approval = await submitApproval(adminToken, APPROVE_PHONE, 'smoke submit data clear approval');
    assert.equal(approval.status, 'pending_approval');
    assert.equal(approval.beforeSummary?.pets, 1);
    assert.equal(await petCount(approveUserToken), 1, 'pending approval must not remove mobile data');

    const approved = await request(`/admin/data-clear-approvals/${encodeURIComponent(approval.id)}/approve`, {
      body: { reason: 'smoke approve data clear' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approved.data.approval.status, 'approved');
    assert.equal(approved.data.clearResult.before.pets, 1);
    assert.equal(approved.data.clearResult.after.pets, 0);
    assert.equal(await petCount(approveUserToken), 0, 'approved clear should remove business data');

    const canceledApproval = await submitApproval(adminToken, CANCEL_PHONE, 'smoke cancel data clear approval');
    const canceled = await request(`/admin/data-clear-approvals/${encodeURIComponent(canceledApproval.id)}/cancel`, {
      body: { reason: 'smoke cancel data clear' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(canceled.data.approval.status, 'canceled');
    assert.equal(await petCount(cancelUserToken), 1, 'canceled approval must keep mobile data');

    const approvals = await request('/admin/data-clear-approvals?status=all', { token: adminToken });
    assert.equal(approvals.data.summary.approved, 1);
    assert.equal(approvals.data.summary.canceled, 1);
    assert.equal(approvals.data.summary.pending, 0);
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
