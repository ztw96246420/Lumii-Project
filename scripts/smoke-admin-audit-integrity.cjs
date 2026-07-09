#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-audit-integrity-'));
const statePath = path.join(tmpDir, 'state.json');
const journalPath = path.join(tmpDir, 'admin-audit-journal.jsonl');
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`${method} ${pathname} timed out`)), 8000);
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
      DEEPSEEK_API_KEY: '',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '1000',
      SMS_DEVICE_DAILY_LIMIT: '1000',
      SMS_IP_DAILY_LIMIT: '1000',
      TENCENTCLOUD_SECRET_ID: '',
      TENCENTCLOUD_SECRET_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  backendProcess.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  backendProcess.once('exit', (code) => {
    if (code && process.env.SMOKE_VERBOSE) console.error(stderr);
  });
  await waitForBackend();
}

async function stopBackend() {
  if (!backendProcess || backendProcess.killed) return;
  const proc = backendProcess;
  backendProcess = null;
  await new Promise((resolve) => {
    proc.once('exit', resolve);
    proc.kill();
    setTimeout(() => {
      if (!proc.killed) proc.kill('SIGKILL');
      resolve();
    }, 2000).unref();
  });
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
  await startBackend(await getFreePort());
  try {
    const adminToken = await loginAdmin();
    await request('/admin/config', {
      body: {
        exports: { approvalExpiresHours: 13, maxDownloadsPerApproval: 2, requireApproval: true },
        reason: 'audit integrity smoke config update',
      },
      method: 'PATCH',
      token: adminToken,
    });

    const audit = await request('/admin/audit-logs?limit=20', { token: adminToken });
    assert.equal(audit.data.integrity.status, 'verified');
    assert.equal(audit.data.integrity.broken, 0);
    assert.ok(audit.data.integrity.signed >= 2, 'expected signed audit logs');
    assert.equal(audit.data.journal.status, 'ready');
    assert.ok(audit.data.journal.exists, 'audit journal should exist');
    assert.ok(audit.data.journal.validLines >= 2, 'audit journal should contain signed audit lines');
    assert.equal(audit.data.journal.invalidLines, 0);
    assert.equal(audit.data.journal.stateLatestMatchesJournal, true);
    assert.equal(audit.data.summary.integrityStatus, 'verified');
    assert.equal(audit.data.summary.journalStatus, 'ready');
    const rows = audit.data.items || [];
    const configLog = rows.find((item) => item.action === 'config.update');
    const loginLog = rows.find((item) => item.action === 'admin.login');
    assert.ok(configLog?.hash, 'config audit should include hash');
    assert.ok(loginLog?.hash, 'login audit should include hash');
    assert.equal(configLog.integrityStatus, 'verified');
    assert.equal(loginLog.integrityStatus, 'verified');
    assert.equal(configLog.prevHash, loginLog.hash, 'newer audit log should link to previous hash');
    assert.equal(configLog.hashTail, configLog.hash.slice(0, 8));
    assert.ok(fs.existsSync(journalPath), 'journal file should be written beside smoke state');
    const journalLines = fs.readFileSync(journalPath, 'utf8').trim().split(/\r?\n/u);
    assert.ok(journalLines.length >= 2, 'journal file should have at least two entries');
    assert.ok(journalLines.some((line) => JSON.parse(line).hash === configLog.hash), 'journal should include config audit hash');

    await stopBackend();

    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.ok(Array.isArray(state.adminAuditLogs) && state.adminAuditLogs.length >= 2, 'expected persisted audit logs');
    state.adminAuditLogs[0].reason = 'tampered after signing';
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    await startBackend(await getFreePort());
    const adminTokenAfterTamper = await loginAdmin();
    const tamperedAudit = await request('/admin/audit-logs?limit=20', { token: adminTokenAfterTamper });
    assert.equal(tamperedAudit.data.integrity.status, 'broken');
    assert.ok(tamperedAudit.data.integrity.broken >= 1, 'tampered audit should be detected');
    assert.equal(tamperedAudit.data.journal.status, 'ready');
    assert.equal(tamperedAudit.data.journal.invalidLines, 0);
    assert.ok(
      (tamperedAudit.data.items || []).some((item) => item.action === 'config.update' && item.integrityStatus === 'broken'),
      'tampered config audit row should be marked broken',
    );

    console.log('admin audit integrity smoke passed');
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
