#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-admin-audit-cos-'));
const statePath = path.join(tmpDir, 'state.json');
const journalPath = path.join(tmpDir, 'admin-audit-journal.jsonl');
const cosUploads = [];
const cosHeads = [];
const cosObjects = new Map();
let backendProcess = null;
let baseUrl = '';
let cosServer = null;
let failCos = false;

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`${method} ${pathname} timed out`)), 10_000);
  let response;
  try {
    response = await fetch(`${baseUrl}${pathname}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Accept: 'application/json',
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
  const payload = text ? JSON.parse(text) : undefined;
  assert.equal(response.status, expectedStatus, `${method} ${pathname} expected ${expectedStatus}, got ${response.status}: ${text}`);
  return payload;
}

async function startFakeCosServer() {
  const port = await getFreePort();
  cosServer = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      if (req.method === 'HEAD') {
        const object = cosObjects.get(req.url);
        cosHeads.push({ headers: req.headers, url: req.url });
        if (!object) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200, {
          'Content-Length': String(object.body.length),
          ETag: `"${crypto.createHash('md5').update(object.body).digest('hex')}"`,
          'x-cos-meta-journal-sha256': object.headers['x-cos-meta-journal-sha256'],
        });
        res.end();
        return;
      }
      if (req.method !== 'PUT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }
      cosUploads.push({ body, headers: req.headers, url: req.url });
      if (failCos) {
        res.writeHead(500, { 'Content-Type': 'application/xml' });
        res.end('<Error><Message>smoke COS failure</Message></Error>');
        return;
      }
      cosObjects.set(req.url, { body, headers: req.headers });
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end('<Response />');
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
      COS_BUCKET: 'lumii-audit-smoke',
      COS_ENDPOINT: cosEndpoint,
      COS_REGION: 'local',
      COS_SECRET_ID: 'AKID_AUDIT_SMOKE',
      COS_SECRET_KEY: 'audit-smoke-secret',
      LUMII_ADMIN_AUDIT_COS_ENABLED: 'true',
      LUMII_ADMIN_AUDIT_COS_INITIAL_DELAY_MS: '60000',
      LUMII_ADMIN_AUDIT_COS_INTERVAL_MS: '60000',
      LUMII_ADMIN_AUDIT_COS_PREFIX: 'admin-audit-smoke',
      LUMII_ADMIN_AUDIT_COS_STALE_MS: '120000',
      LUMII_ADMIN_AUDIT_JOURNAL_PATH: journalPath,
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
    child.kill();
  });
}

async function loginAdmin(username = 'admin', password = 'LumiiAdmin@2026') {
  const payload = await request('/admin/auth/login', {
    body: { password, username },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing admin token for ${username}`);
  return payload.data.token;
}

async function createAuditor(adminToken) {
  const username = 'audit_archive_auditor';
  const password = 'Audit-Archive-Auditor-2026!';
  await request('/admin/accounts', {
    body: {
      displayName: 'Audit Archive Auditor',
      password,
      reason: 'Smoke create read-only audit archive reviewer',
      roleIds: ['auditor'],
      username,
    },
    method: 'POST',
    token: adminToken,
  });
  return loginAdmin(username, password);
}

function assertImmutableUpload(upload) {
  assert.ok(upload.headers.authorization, 'COS upload must be signed');
  assert.equal(upload.headers['cache-control'], 'private, max-age=0, no-store');
  assert.equal(upload.headers['x-cos-forbid-overwrite'], 'true');
  assert.match(upload.headers['x-cos-meta-journal-sha256'] || '', /^[a-f0-9]{64}$/u);
  assert.equal(upload.headers['content-md5'], crypto.createHash('md5').update(upload.body).digest('base64'));
}

async function main() {
  const cosEndpoint = await startFakeCosServer();
  await startBackend(await getFreePort(), cosEndpoint);
  try {
    const adminToken = await loginAdmin();
    const auditorToken = await createAuditor(adminToken);

    const before = await request('/admin/audit-logs?limit=50', { token: adminToken });
    assert.equal(before.data.archive.enabled, true);
    assert.equal(before.data.archive.configured, true);
    assert.equal(before.data.archive.status, 'pending');
    assert.match(before.data.journal.sha256, /^[a-f0-9]{64}$/u);

    await request('/admin/audit-archives/run', {
      body: { reason: 'Auditor must not trigger external archive writes' },
      expectedStatus: 403,
      method: 'POST',
      token: auditorToken,
    });

    const first = await request('/admin/audit-archives/run', {
      body: { reason: 'Smoke first immutable audit journal archive' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(first.data.skipped, false);
    assert.equal(first.data.archive.status, 'archived');
    assert.ok(first.data.archive.verifiedAt);
    assert.match(first.data.archive.journalEtag, /^[a-f0-9]{32}$/u);
    assert.match(first.data.archive.manifestEtag, /^[a-f0-9]{32}$/u);
    assert.equal(first.data.status.status, 'healthy');
    assert.match(first.data.archive.journalSha256, /^[a-f0-9]{64}$/u);
    assert.equal(cosUploads.length, 2);
    assert.equal(cosHeads.length, 2);
    cosUploads.forEach(assertImmutableUpload);

    const journalUpload = cosUploads.find((item) => item.url.endsWith('.jsonl'));
    const manifestUpload = cosUploads.find((item) => item.url.endsWith('.manifest.json'));
    assert.ok(journalUpload, 'missing journal upload');
    assert.ok(manifestUpload, 'missing manifest upload');
    const manifest = JSON.parse(manifestUpload.body.toString('utf8'));
    const journalSha256 = crypto.createHash('sha256').update(journalUpload.body).digest('hex');
    assert.equal(manifest.formatVersion, 'lumii-admin-audit-archive-v1');
    assert.equal(manifest.journal.sha256, journalSha256);
    assert.equal(manifest.journal.objectKey, first.data.archive.journalObjectKey);
    assert.equal(manifest.previousArchive, null);
    assert.equal(journalUpload.headers['x-cos-meta-journal-sha256'], journalSha256);

    const duplicate = await request('/admin/audit-archives/run', {
      body: { reason: 'Smoke unchanged archive must not upload duplicate objects' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(duplicate.data.skipped, true);
    assert.equal(duplicate.data.skipReason, 'unchanged');
    assert.equal(cosUploads.length, 2);
    assert.equal(cosHeads.length, 2);

    await loginAdmin();
    const second = await request('/admin/audit-archives/run', {
      body: { reason: 'Smoke chained audit journal archive' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(second.data.skipped, false);
    assert.equal(second.data.archive.previousArchiveId, first.data.archive.id);
    assert.equal(second.data.archive.previousJournalSha256, first.data.archive.journalSha256);
    assert.equal(cosUploads.length, 4);
    assert.equal(cosHeads.length, 4);
    const secondManifest = JSON.parse(cosUploads.find((item, index) => index >= 2 && item.url.endsWith('.manifest.json')).body.toString('utf8'));
    assert.equal(secondManifest.previousArchive.archiveId, first.data.archive.id);
    assert.equal(secondManifest.previousArchive.journalSha256, first.data.archive.journalSha256);

    await loginAdmin();
    const scheduledPending = await request('/admin/audit-archives', { token: adminToken });
    assert.equal(scheduledPending.data.status, 'pending');
    assert.equal(scheduledPending.data.pendingWithinSchedule, true);
    assert.equal(scheduledPending.data.operationallyHealthy, true);
    assert.ok(scheduledPending.data.nextScheduledAt);
    const healthy = await request('/admin/system/health', { token: adminToken });
    assert.equal(healthy.data.checks.find((item) => item.key === 'audit_cos_archive')?.status, 'ok');
    const readiness = await request('/admin/launch/readiness', { token: adminToken });
    assert.equal(readiness.data.gaps.find((item) => item.key === 'audit_archive')?.status, 'ready');
    const audit = await request('/admin/audit-logs?action=audit.archive.cos.attempt', { token: adminToken });
    assert.equal(audit.data.items.filter((item) => item.action === 'audit.archive.cos.attempt').length, 2);

    await loginAdmin();
    failCos = true;
    await request('/admin/audit-archives/run', {
      body: { reason: 'Smoke archive provider failure must surface operational alert' },
      expectedStatus: 502,
      method: 'POST',
      token: adminToken,
    });
    const failedStatus = await request('/admin/audit-archives', { token: adminToken });
    assert.equal(failedStatus.data.status, 'failed');
    assert.match(failedStatus.data.lastError, /smoke COS failure/u);
    const failedHealth = await request('/admin/system/health', { token: adminToken });
    assert.equal(failedHealth.data.checks.find((item) => item.key === 'audit_cos_archive')?.status, 'bad');
    const alerts = await request('/admin/dashboard/alerts', { token: adminToken });
    assert.ok(alerts.data.items.some((item) => item.key === 'audit_cos_archive'));

    console.log('admin audit COS archive smoke passed');
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
  } catch {}
  console.error(error);
  process.exit(1);
});
