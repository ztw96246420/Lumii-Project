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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-export-approval-'));
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

async function request(pathname, { body, expectedStatus = 200, method = 'GET', token, raw = false } = {}) {
  if (process.env.SMOKE_VERBOSE) console.log(`${method} ${pathname}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`${method} ${pathname} timed out`)), 8000);
  let response;
  try {
    response = await fetch(`${baseUrl}${pathname}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Accept: raw ? '*/*' : 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      method,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const text = await response.text();
  const payload = raw ? text : text ? JSON.parse(text) : undefined;
  assert.equal(
    response.status,
    expectedStatus,
    `${method} ${pathname} expected ${expectedStatus}, got ${response.status}: ${text}`,
  );
  return raw ? { data: payload, headers: response.headers } : payload;
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

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `export-approval-${phone}`, phone },
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

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    await loginUser('19900007400');

    await request('/admin/config', {
      body: {
        exports: { approvalExpiresHours: 12, maxDownloadsPerApproval: 2, requireApproval: true },
        reason: 'export approval smoke',
      },
      method: 'PATCH',
      token: adminToken,
    });

    const catalog = await request('/admin/exports', { token: adminToken });
    const usersDataset = catalog.data.find((item) => item.type === 'users');
    assert.equal(usersDataset.approvalRequired, true);
    assert.ok(usersDataset.sensitiveColumnCount >= 1, 'users export should expose sensitive column hints');

    const direct = await request('/admin/exports/users.csv?reason=export%20approval%20smoke', {
      expectedStatus: 409,
      raw: false,
      token: adminToken,
    });
    assert.equal(direct.error.code, 'ADMIN_EXPORT_APPROVAL_REQUIRED');

    const sensitiveDirect = await request('/admin/exports/users.csv?reason=export%20approval%20smoke&includeSensitive=1', {
      expectedStatus: 409,
      raw: false,
      token: adminToken,
    });
    assert.equal(sensitiveDirect.error.code, 'ADMIN_EXPORT_SENSITIVE_APPROVAL_REQUIRED');

    const approvalDraft = await request('/admin/exports/approvals', {
      body: {
        filters: { status: 'all' },
        reason: 'export approval smoke',
        type: 'users',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approvalDraft.data.approval.status, 'pending_approval');
    assert.equal(approvalDraft.data.approval.datasetType, 'users');

    const approvalId = approvalDraft.data.approval.id;
    assert.equal(approvalDraft.data.approval.includeSensitive, false);
    const approved = await request(`/admin/exports/approvals/${encodeURIComponent(approvalId)}/approve`, {
      body: { reason: 'approve export approval smoke' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approved.data.approval.status, 'approved');
    assert.ok(approved.data.approval.expiresAt);

    const mismatch = await request(`/admin/exports/users.csv?reason=export%20approval%20smoke&q=other&approvalId=${encodeURIComponent(approvalId)}`, {
      expectedStatus: 409,
      token: adminToken,
    });
    assert.equal(mismatch.error.code, 'ADMIN_EXPORT_APPROVAL_MISMATCH');

    const jobCreated = await request('/admin/exports/jobs', {
      body: {
        approvalId,
        filters: { status: 'all' },
        reason: 'export approval smoke',
        type: 'users',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(jobCreated.data.job.datasetType, 'users');
    assert.ok(['queued', 'running', 'completed'].includes(jobCreated.data.job.status));
    const jobId = jobCreated.data.job.id;
    let completedJob = null;
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const jobs = await request('/admin/exports/jobs?type=users&status=all', { token: adminToken });
      completedJob = jobs.data.items.find((item) => item.id === jobId);
      if (completedJob?.status === 'completed') break;
      await delay(100);
    }
    assert.equal(completedJob?.status, 'completed');
    assert.ok(completedJob.filename.endsWith('.csv'));
    assert.ok(completedJob.sizeBytes > 0);
    const archived = await request(`/admin/exports/jobs/${encodeURIComponent(jobId)}/download`, {
      raw: true,
      token: adminToken,
    });
    assert.ok(archived.data.includes('导出水印ID'));
    assert.ok(archived.data.includes('199****7400'));
    assert.ok(!archived.data.includes('19900007400'));

    const downloaded = await request(`/admin/exports/users.csv?reason=export%20approval%20smoke&approvalId=${encodeURIComponent(approvalId)}`, {
      raw: true,
      token: adminToken,
    });
    assert.ok(downloaded.data.includes('导出水印ID'));
    assert.ok(downloaded.data.includes('199****7400'));
    assert.ok(!downloaded.data.includes('19900007400'));

    const approvals = await request('/admin/exports/approvals?type=users&status=all', { token: adminToken });
    const downloadedApproval = approvals.data.items.find((item) => item.id === approvalId);
    assert.equal(downloadedApproval.downloadCount, 2);
    assert.equal(downloadedApproval.maxDownloads, 2);
    assert.equal(downloadedApproval.downloadRemaining, 0);

    const repeatedDownload = await request(`/admin/exports/users.csv?reason=export%20approval%20smoke&approvalId=${encodeURIComponent(approvalId)}`, {
      expectedStatus: 409,
      token: adminToken,
    });
    assert.equal(repeatedDownload.error.code, 'ADMIN_EXPORT_APPROVAL_DOWNLOAD_LIMIT');

    const sensitiveApprovalDraft = await request('/admin/exports/approvals', {
      body: {
        filters: { status: 'all' },
        includeSensitive: true,
        reason: 'export approval smoke sensitive',
        type: 'users',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(sensitiveApprovalDraft.data.approval.includeSensitive, true);
    const sensitiveApprovalId = sensitiveApprovalDraft.data.approval.id;
    await request(`/admin/exports/approvals/${encodeURIComponent(sensitiveApprovalId)}/approve`, {
      body: { reason: 'approve sensitive export approval smoke' },
      method: 'POST',
      token: adminToken,
    });
    const sensitiveDownloaded = await request(`/admin/exports/users.csv?reason=export%20approval%20smoke%20sensitive&includeSensitive=1&approvalId=${encodeURIComponent(sensitiveApprovalId)}`, {
      raw: true,
      token: adminToken,
    });
    assert.ok(sensitiveDownloaded.data.includes('19900007400'));

    const history = await request('/admin/exports/history?type=users', { token: adminToken });
    const maskedHistory = history.data.items.find((item) => item.approvalId === approvalId);
    assert.equal(maskedHistory.approvalDownloadCount, 2);
    assert.equal(maskedHistory.approvalMaxDownloads, 2);
    assert.equal(maskedHistory.sensitiveExportMode, 'masked');
    const sensitiveHistory = history.data.items.find((item) => item.approvalId === sensitiveApprovalId);
    assert.equal(sensitiveHistory.sensitiveExportMode, 'full');

    const audit = await request('/admin/audit-logs?limit=100', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'data.export.approval.create'), 'approval creation should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'data.export.approval.approve'), 'approval approve should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'data.export.job.create'), 'export job creation should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'data.export.job.complete'), 'export job completion should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'data.export.job.download'), 'export job download should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'data.export.download'), 'approved download should be audited');

    console.log('export approval smoke passed');
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
