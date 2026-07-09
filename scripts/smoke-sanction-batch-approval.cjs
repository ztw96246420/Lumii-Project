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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-sanction-batch-'));
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
    body: { deviceId: `sanction-batch-smoke-${phone}`, phone },
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

async function assertCanWritePet(token, name) {
  const payload = await request('/pets', {
    body: {
      birthday: '2024-03-01',
      breed: 'Golden',
      gender: 'male',
      name,
      species: 'dog',
      weightKg: 16.8,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `pet write should succeed for ${name}`);
}

async function assertRestrictedPetWrite(token) {
  const blocked = await request('/pets', {
    body: {
      birthday: '2024-03-02',
      breed: 'Golden',
      gender: 'male',
      name: 'BlockedBatch',
      species: 'dog',
      weightKg: 16.9,
    },
    expectedStatus: 403,
    method: 'POST',
    token,
  });
  assert.equal(blocked.error?.code, 'ACCOUNT_RESTRICTED');
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const batchPhones = ['19900006901', '19900006902'];
    const cancelPhone = '19900006903';
    const batchTokens = [];
    for (const phone of batchPhones) batchTokens.push(await loginUser(phone));
    const cancelToken = await loginUser(cancelPhone);
    const adminToken = await loginAdmin();

    await assertCanWritePet(batchTokens[0], 'BatchA');
    await assertCanWritePet(batchTokens[1], 'BatchB');
    await assertCanWritePet(cancelToken, 'BatchC');

    const approval = await request('/admin/sanction-batch-approvals', {
      body: {
        durationHours: 72,
        phones: batchPhones.join('\n'),
        reason: 'Smoke batch freeze approval',
        type: 'freeze',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approval.data?.approval?.status, 'pending_approval');
    assert.equal(approval.data?.approval?.targetCount, 2);

    for (const token of batchTokens) {
      const me = await request('/me', { token });
      assert.equal(me.data?.accountStatus, 'active', 'pending batch approval must not restrict users');
    }

    let approvals = await request('/admin/sanction-batch-approvals', { token: adminToken });
    assert.equal(approvals.data?.summary?.pending, 1);

    const approved = await request(`/admin/sanction-batch-approvals/${encodeURIComponent(approval.data.approval.id)}/approve`, {
      body: { reason: 'Smoke approves batch freeze' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approved.data?.approval?.status, 'approved');
    assert.equal(approved.data?.approval?.successCount, 2);
    assert.equal(approved.data?.approval?.errorCount, 0);

    for (const token of batchTokens) {
      const me = await request('/me', { token });
      assert.equal(me.data?.accountStatus, 'frozen');
      assert.ok(me.data?.sanctions?.activeTypes?.includes('freeze'));
      await assertRestrictedPetWrite(token);
    }

    const cancelApproval = await request('/admin/sanction-batch-approvals', {
      body: {
        durationHours: 72,
        phones: cancelPhone,
        reason: 'Smoke canceled batch freeze approval',
        type: 'freeze',
      },
      method: 'POST',
      token: adminToken,
    });
    await request(`/admin/sanction-batch-approvals/${encodeURIComponent(cancelApproval.data.approval.id)}/cancel`, {
      body: { reason: 'Smoke cancels batch freeze' },
      method: 'POST',
      token: adminToken,
    });
    const cancelMe = await request('/me', { token: cancelToken });
    assert.equal(cancelMe.data?.accountStatus, 'active', 'canceled batch approval must not restrict user');

    const sanctions = await request('/admin/sanctions', { token: adminToken });
    const batchSanctions = sanctions.data.filter((item) => batchPhones.includes(item.phone) && item.batchApprovalId === approval.data.approval.id);
    assert.equal(batchSanctions.length, 2);
    assert.ok(!sanctions.data.some((item) => item.phone === cancelPhone && item.batchApprovalId === cancelApproval.data.approval.id));

    approvals = await request('/admin/sanction-batch-approvals?status=all', { token: adminToken });
    assert.equal(approvals.data?.summary?.approved, 1);
    assert.equal(approvals.data?.summary?.canceled, 1);
    assert.equal(approvals.data?.summary?.successfulTargets, 2);

    const audit = await request('/admin/audit-logs?limit=80', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'user.sanction.batch_approval.approve' && item.targetId === approval.data.approval.id));

    console.log('smoke-sanction-batch-approval passed');
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
