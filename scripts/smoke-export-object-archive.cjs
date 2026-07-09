#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-export-object-archive-'));
const statePath = path.join(tmpDir, 'state.json');
const cosUploads = [];
let backendProcess = null;
let baseUrl = '';
let cosServer = null;

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

async function startFakeCosServer() {
  const port = await getFreePort();
  cosServer = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      if (req.method === 'PUT') {
        cosUploads.push({
          body,
          headers: req.headers,
          method: req.method,
          url: req.url,
        });
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end('<Response />');
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
    });
  });
  await new Promise((resolve) => cosServer.listen(port, '127.0.0.1', resolve));
  return `http://127.0.0.1:${port}`;
}

async function stopFakeCosServer() {
  if (!cosServer) return;
  const server = cosServer;
  cosServer = null;
  await new Promise((resolve) => server.close(resolve));
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

async function startBackend(port, cosEndpoint) {
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      AMAP_WEB_SERVICE_KEY: '',
      COS_BUCKET: 'lumii-smoke',
      COS_ENDPOINT: cosEndpoint,
      COS_REGION: 'local',
      COS_SECRET_ID: 'AKIDSMOKE',
      COS_SECRET_KEY: 'smoke-secret',
      LUMII_ADMIN_EXPORT_COS_ENABLED: 'true',
      LUMII_ADMIN_EXPORT_COS_PREFIX: 'admin-exports-smoke',
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
    body: { deviceId: `export-object-archive-${phone}`, phone },
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
  const cosEndpoint = await startFakeCosServer();
  const port = await getFreePort();
  await startBackend(port, cosEndpoint);
  try {
    const adminToken = await loginAdmin();
    await loginUser('19900007500');

    await request('/admin/config', {
      body: {
        exports: { approvalExpiresHours: 12, maxDownloadsPerApproval: 2, requireApproval: false },
        reason: 'export object archive smoke',
      },
      method: 'PATCH',
      token: adminToken,
    });

    const jobCreated = await request('/admin/exports/jobs', {
      body: {
        filters: { status: 'all' },
        reason: 'export object archive smoke',
        type: 'users',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(jobCreated.data.job.datasetType, 'users');
    const jobId = jobCreated.data.job.id;

    let completedJob = null;
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const jobs = await request('/admin/exports/jobs?type=users&status=all', { token: adminToken });
      assert.equal(jobs.data.policy.objectStorageEnabled, true);
      assert.equal(jobs.data.policy.objectStorageProvider, 'tencent-cos');
      assert.equal(jobs.data.policy.objectStoragePrefix, 'admin-exports-smoke');
      completedJob = jobs.data.items.find((item) => item.id === jobId);
      if (completedJob?.status === 'completed' && completedJob.objectStorageStatus === 'archived') break;
      await delay(100);
    }
    assert.equal(completedJob?.status, 'completed');
    assert.equal(completedJob.objectStorageStatus, 'archived');
    assert.equal(completedJob.objectStorageProvider, 'tencent-cos');
    assert.ok(completedJob.objectKey.startsWith('admin-exports-smoke/'), completedJob.objectKey);
    assert.ok(completedJob.objectArchivedAt);
    assert.ok(completedJob.objectSizeBytes > 0);

    assert.equal(cosUploads.length, 1);
    const upload = cosUploads[0];
    assert.equal(upload.method, 'PUT');
    assert.ok(upload.url.includes('/admin-exports-smoke/'), upload.url);
    assert.equal(upload.headers['content-type'], 'text/csv; charset=utf-8');
    const csv = upload.body.toString('utf8');
    assert.ok(csv.includes('导出水印ID'));
    assert.ok(csv.includes('199****7500'));
    assert.ok(!csv.includes('19900007500'));

    const audit = await request('/admin/audit-logs?limit=80', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'data.export.job.object_archive.complete'), 'object archive completion should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'data.export.job.complete'), 'job completion should be audited');

    console.log('export object archive smoke passed');
  } finally {
    await stopBackend();
    await stopFakeCosServer();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopFakeCosServer();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {
    // ignore cleanup errors
  }
  console.error(error);
  process.exit(1);
});
