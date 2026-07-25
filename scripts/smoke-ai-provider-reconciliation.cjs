#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const TEST_PHONE = '13900009992';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-ai-provider-reconciliation-'));
const statePath = path.join(tmpDir, 'state.json');
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/atK3qsAAAAASUVORK5CYII=';
let backendProcess = null;
let providerServer = null;
let baseUrl = '';
let providerBaseUrl = '';
let fluxSubmissions = 0;

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
  while (Date.now() < deadline) {
    try {
      const payload = await request('/legal/privacy');
      if (payload.state === 'success') return;
    } catch {}
    await delay(100);
  }
  throw new Error('backend did not become ready');
}

async function startFakeProvider() {
  providerServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/v1/images/generations') {
      req.resume();
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 502,
        data: { cost: 0.045, credits_cost: 4.5, status: 'failed' },
        message: 'provider rejected smoke generation',
      }));
      return;
    }
    if (req.method === 'POST' && req.url === '/flux/edits') {
      req.resume();
      fluxSubmissions += 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: { job_id: `flux-compensation-${fluxSubmissions}` }, status: 'SUBMITTED' }));
      return;
    }
    if (req.method === 'PUT') {
      req.resume();
      res.writeHead(200, { ETag: '"reconciliation-cos"' });
      res.end();
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'not found' }));
  });
  await new Promise((resolve, reject) => {
    providerServer.once('error', reject);
    providerServer.listen(0, '127.0.0.1', resolve);
  });
  providerBaseUrl = `http://127.0.0.1:${providerServer.address().port}`;
}

async function stopFakeProvider() {
  if (!providerServer) return;
  const server = providerServer;
  providerServer = null;
  await new Promise((resolve) => server.close(resolve));
}

async function startBackend(port) {
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      AMAP_WEB_SERVICE_KEY: '',
      APIMART_API_KEY: '',
      COS_BUCKET: 'lumii-reconciliation-smoke',
      COS_ENDPOINT: providerBaseUrl,
      COS_REGION: 'ap-guangzhou',
      COS_SECRET_ID: 'reconciliation-cos-secret-id',
      COS_SECRET_KEY: 'reconciliation-cos-secret-key',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: 'smoke-gpt-image2-key',
      GPT_IMAGE2_BASE_URL: providerBaseUrl,
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      PET_AVATAR_ANIMATION_PROVIDER: 'disabled',
      PET_AVATAR_PROVIDER: 'gpt-image-2',
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '1000',
      SMS_DEVICE_DAILY_LIMIT: '1000',
      SMS_IP_DAILY_LIMIT: '1000',
      TTAPI_API_KEY: 'smoke-ttapi-key',
      TTAPI_FLUX_BASE_URL: providerBaseUrl,
      TENCENTCLOUD_SECRET_ID: '',
      TENCENTCLOUD_SECRET_KEY: '',
      TENCENT_CLOUD_SECRET_ID: '',
      TENCENT_CLOUD_SECRET_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backendProcess.stderr.on('data', (chunk) => {
    if (process.env.SMOKE_VERBOSE) process.stderr.write(chunk);
  });
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
    child.kill();
  });
}

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `ai-reconciliation-smoke-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  return payload.data.token;
}

async function loginAdmin(username = 'admin', password = 'LumiiAdmin@2026') {
  const payload = await request('/admin/auth/login', {
    body: { password, username },
    method: 'POST',
  });
  return payload.data.token;
}

async function createAdmin(adminToken, username, roleIds) {
  const password = `${username}-Secure2026!`;
  await request('/admin/accounts', {
    body: {
      displayName: username,
      password,
      reason: `Smoke create ${username}`,
      roleIds,
      username,
    },
    method: 'POST',
    token: adminToken,
  });
  return loginAdmin(username, password);
}

async function waitForJob(jobId, token, status) {
  const deadline = Date.now() + 10_000;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await request(`/ai/pet-avatar/jobs/${encodeURIComponent(jobId)}`, { token });
    if (latest.data?.status === status) return latest.data;
    await delay(100);
  }
  throw new Error(`job ${jobId} did not reach ${status}: ${JSON.stringify(latest?.data || {})}`);
}

async function main() {
  await startFakeProvider();
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser(TEST_PHONE);
    const adminToken = await loginAdmin();
    const auditorToken = await createAdmin(adminToken, 'ai_reconciliation_auditor', ['auditor']);
    await request('/pets', {
      body: { birthday: '2024-03-01', breed: 'dog', gender: 'female', name: 'ReconLucky', species: 'dog', weightKg: 12.5 },
      method: 'POST',
      token: userToken,
    });
    const upload = await request('/media/uploads', {
      body: {
        base64: `data:image/png;base64,${tinyPngBase64}`,
        fileName: 'reconciliation-lucky.png',
        mimeType: 'image/png',
        source: 'pet_avatar',
      },
      method: 'POST',
      token: userToken,
    });
    const started = await request('/ai/pet-avatar/jobs', {
      body: { mediaId: upload.data.mediaId },
      method: 'POST',
      token: userToken,
    });
    const failed = await waitForJob(started.data.id, userToken, 'failed');
    assert.equal(failed.errorCode, 'AVATAR_PROVIDER_START_FAILED');

    const usageBefore = await request('/admin/ai/usage?days=7', { token: adminToken });
    const caseBefore = usageBefore.data.reconciliation.cases.find((item) => item.jobId === failed.id);
    assert.ok(caseBefore, 'missing reconciliation case');
    assert.equal(caseBefore.attribution.liableParty, 'provider');
    assert.equal(caseBefore.reconciliation.status, 'action_required');
    assert.equal(caseBefore.reconciliation.providerCreditDue, true);
    assert.equal(caseBefore.reconciliation.cost.cost, 0.045);
    assert.equal(usageBefore.data.reconciliation.summary.actionRequired, 1);
    assert.equal(usageBefore.data.summary.todayPetAvatarCount, 0, 'provider failure should already return the consumed quota');
    const alertsBefore = await request('/admin/dashboard/alerts', { token: adminToken });
    assert.ok(alertsBefore.data.items.some((item) => item.key === 'ai_provider_reconciliation'), 'provider reconciliation must enter operational alerts');
    const healthBefore = await request('/admin/system/health', { token: adminToken });
    const reconciliationCheck = healthBefore.data.checks.find((item) => item.key === 'ai_provider_reconciliation');
    assert.equal(reconciliationCheck?.status, 'warn');
    assert.ok(healthBefore.data.queues.some((item) => item.label === 'AI 成本与赔付' && item.value === 1));

    await request(`/admin/ai/avatar-jobs/${encodeURIComponent(failed.id)}/reconciliation`, {
      body: {
        providerReference: 'provider-credit-smoke-001',
        providerResolution: 'credited',
        reason: 'Smoke supplier credit and free cross-provider retry',
        retryProvider: 'ttapi-flux-edits',
        userAction: 'refund_and_retry_free',
      },
      expectedStatus: 403,
      method: 'POST',
      token: auditorToken,
    });

    const resolved = await request(`/admin/ai/avatar-jobs/${encodeURIComponent(failed.id)}/reconciliation`, {
      body: {
        providerReference: 'provider-credit-smoke-001',
        providerResolution: 'credited',
        reason: 'Smoke supplier credit and free cross-provider retry',
        retryProvider: 'ttapi-flux-edits',
        userAction: 'refund_and_retry_free',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(resolved.data.case.reconciliation.status, 'resolved');
    assert.equal(resolved.data.case.reconciliation.providerResolution, 'credited');
    assert.equal(resolved.data.retryJob.provider, 'ttapi-flux-edits');
    assert.equal(resolved.data.retryJob.quotaCompensated, true);
    assert.equal(resolved.data.retryJob.quotaConsumed, false);

    await request(`/admin/ai/avatar-jobs/${encodeURIComponent(failed.id)}/reconciliation`, {
      body: {
        providerReference: 'duplicate',
        providerResolution: 'credited',
        reason: 'Smoke duplicate reconciliation must fail',
        userAction: 'none',
      },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });

    const usageAfter = await request('/admin/ai/usage?days=7', { token: adminToken });
    const caseAfter = usageAfter.data.reconciliation.cases.find((item) => item.jobId === failed.id);
    assert.equal(caseAfter.reconciliation.status, 'resolved');
    assert.equal(caseAfter.reconciliation.retryProvider, 'ttapi-flux-edits');
    assert.equal(usageAfter.data.reconciliation.summary.actionRequired, 0);
    assert.equal(usageAfter.data.reconciliation.summary.crossProviderRetries, 1);
    assert.equal(usageAfter.data.reconciliation.summary.freeCompensationRetries, 1);
    assert.equal(usageAfter.data.summary.todayPetAvatarCount, 0, 'free retry must not consume the user daily quota');
    const alertsAfter = await request('/admin/dashboard/alerts', { token: adminToken });
    assert.equal(alertsAfter.data.items.some((item) => item.key === 'ai_provider_reconciliation'), false);

    const audits = await request('/admin/audit-logs?action=ai.avatar.provider_reconciliation.resolve', { token: adminToken });
    assert.ok(audits.data.items.some((item) => item.action === 'ai.avatar.provider_reconciliation.resolve' && item.targetId === failed.id));
    assert.ok(fluxSubmissions >= 1, 'free retry must submit to the selected fallback provider');
    console.log('AI provider reconciliation smoke passed');
  } finally {
    await stopBackend();
    await stopFakeProvider();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopFakeProvider();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
