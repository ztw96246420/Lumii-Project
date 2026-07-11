#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const TEST_PHONE = '13900009997';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-ai-avatar-refund-'));
const statePath = path.join(tmpDir, 'state.json');
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/atK3qsAAAAASUVORK5CYII=';

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
      APIMART_API_KEY: '',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: 'refund-smoke-provider-key',
      GPT_IMAGE2_BASE_URL: 'http://127.0.0.1:9',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      PET_AVATAR_ANIMATION_PROVIDER: 'disabled',
      PET_AVATAR_DAILY_LIMIT: '1',
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
    body: { deviceId: `ai-avatar-refund-smoke-${phone}`, phone },
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

async function createPet(token) {
  const payload = await request('/pets', {
    body: {
      birthday: '2024-01-05',
      breed: 'dog',
      gender: 'male',
      name: 'RefundLucky',
      species: 'dog',
      weightKg: 18.6,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, 'missing pet id');
  return payload.data;
}

async function waitForFailedJob(jobId, token) {
  const deadline = Date.now() + 10_000;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await request(`/ai/pet-avatar/jobs/${encodeURIComponent(jobId)}`, { token });
    if (latest.data?.status === 'failed') return latest.data;
    await delay(250);
  }
  throw new Error(`avatar job did not fail: ${JSON.stringify(latest?.data || {})}`);
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser(TEST_PHONE);
    const adminToken = await loginAdmin();
    await createPet(userToken);

    const initialUsage = await request('/ai/usage', { token: userToken });
    assert.equal(initialUsage.data.daily.petAvatar.limit, 1);
    assert.equal(initialUsage.data.daily.petAvatar.count, 0);
    assert.equal(initialUsage.data.daily.petAvatar.remaining, 1);

    const upload = await request('/media/uploads', {
      body: {
        base64: `data:image/png;base64,${tinyPngBase64}`,
        fileName: 'refund-lucky.png',
        mimeType: 'image/png',
        source: 'pet_avatar',
      },
      method: 'POST',
      token: userToken,
    });
    assert.ok(upload.data?.mediaId, 'missing uploaded media id');

    const started = await request('/ai/pet-avatar/jobs', {
      body: { mediaId: upload.data.mediaId },
      method: 'POST',
      token: userToken,
    });
    assert.ok(started.data?.id, 'missing avatar job id');

    const failedJob = await waitForFailedJob(started.data.id, userToken);
    assert.equal(failedJob.status, 'failed');
    assert.equal(failedJob.errorCode, 'AVATAR_PROVIDER_START_FAILED');

    const refundedUsage = await request('/ai/usage', { token: userToken });
    assert.equal(refundedUsage.data.daily.petAvatar.count, 0);
    assert.equal(refundedUsage.data.daily.petAvatar.remaining, 1);

    const adminJobs = await request('/admin/ai/avatar-jobs', { token: adminToken });
    const row = adminJobs.data.find((item) => item.id === failedJob.id);
    assert.ok(row, 'missing admin avatar job row');
    assert.equal(row.quotaConsumed, true);
    assert.equal(row.quotaRefunded, true);
    assert.equal(row.quotaRefundSource, 'auto');
    assert.ok(String(row.quotaRefundReason || '').includes('供应商提交失败'));

    const duplicateRefund = await request(`/admin/ai/avatar-jobs/${encodeURIComponent(failedJob.id)}/refund-quota`, {
      body: { reason: '重复返还防护烟测' },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(duplicateRefund.error?.code, 'ADMIN_AVATAR_REFUND_INVALID');

    const usage = await request('/admin/ai/usage?days=7', { token: adminToken });
    assert.equal(usage.data.quotaRefundPolicy.enabled, true);
    assert.ok(usage.data.quotaRefundPolicy.enabledRules.includes('供应商提交失败'));
    assert.equal(usage.data.summary.avatarQuotaRefunded, 1);
    assert.equal(usage.data.summary.avatarQuotaAutoRefunded, 1);
    assert.equal(usage.data.summary.todayAvatarQuotaRefunded, 1);

    const audit = await request(`/admin/audit-logs?action=ai.avatar.auto_refund_quota&targetType=avatar_job&q=${encodeURIComponent(failedJob.id)}`, { token: adminToken });
    assert.equal(audit.data.items.some((item) => item.action === 'ai.avatar.auto_refund_quota' && item.targetId === failedJob.id), true);

    console.log('AI avatar refund smoke passed');
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
