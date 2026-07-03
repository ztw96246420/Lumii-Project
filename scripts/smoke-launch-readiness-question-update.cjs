#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-launch-question-'));
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
      DEEPSEEK_API_KEY: '',
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

async function loginAdmin() {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing admin token');
  return payload.data.token;
}

function rowById(rows, id) {
  return rows.find((item) => item.id === id);
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const initial = await request('/admin/launch/readiness', { token: adminToken });
    const initialQuestion = rowById(initial.data.questions, 'q-domain');
    assert.ok(initialQuestion, 'missing q-domain question');
    assert.equal(initialQuestion.hasDecisionOverride || false, false);

    const updated = await request('/admin/launch/readiness/questions/q-domain', {
      body: {
        note: 'Smoke confirmed ops.lumiiapp.cn will be used after DNS is ready',
        owner: 'product',
        reason: 'smoke records launch readiness decision',
        status: 'ready',
      },
      method: 'POST',
      token: adminToken,
    });
    const updatedQuestion = rowById(updated.data.questions, 'q-domain');
    assert.equal(updatedQuestion.status, 'ready');
    assert.equal(updatedQuestion.statusLabel, '已确认');
    assert.equal(updatedQuestion.owner, 'product');
    assert.ok(updatedQuestion.hasDecisionOverride);
    assert.ok(updatedQuestion.decisionNote.includes('ops.lumiiapp.cn'));

    const persisted = await request('/admin/launch/readiness', { token: adminToken });
    const persistedQuestion = rowById(persisted.data.questions, 'q-domain');
    assert.equal(persistedQuestion.status, 'ready');
    assert.ok(persistedQuestion.decisionUpdatedAt);

    const audit = await request('/admin/audit-logs?limit=40', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'launch.readiness.question.update' && item.targetId === 'q-domain'));

    const reset = await request('/admin/launch/readiness/questions/q-domain', {
      body: {
        reason: 'smoke resets launch readiness decision',
        reset: true,
      },
      method: 'POST',
      token: adminToken,
    });
    const resetQuestion = rowById(reset.data.questions, 'q-domain');
    assert.equal(resetQuestion.hasDecisionOverride || false, false);
    assert.equal(resetQuestion.status, initialQuestion.status);

    const auditAfterReset = await request('/admin/audit-logs?limit=40', { token: adminToken });
    assert.ok(auditAfterReset.data.items.some((item) => item.action === 'launch.readiness.question.reset' && item.targetId === 'q-domain'));

    console.log('launch readiness question update smoke passed');
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
