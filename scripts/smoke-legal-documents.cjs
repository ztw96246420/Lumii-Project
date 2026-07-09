#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-legal-documents-'));
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
      GPT_IMAGE2_API_KEY: '',
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

function questionById(rows, id) {
  return rows.find((item) => item.id === id);
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const initial = await request('/admin/legal-documents', { token: adminToken });
    assert.equal(initial.data.summary.total, 4);
    assert.equal(initial.data.summary.allRequiredApproved, false);
    assert.deepEqual(initial.data.summary.missingRequiredKeys.sort(), ['app_filing', 'content_policy', 'privacy', 'terms'].sort());

    const initialReadiness = await request('/admin/launch/readiness', { token: adminToken });
    const initialQuestion = questionById(initialReadiness.data.questions, 'q-compliance-text');
    assert.equal(initialQuestion.status, 'open');
    assert.ok(initialQuestion.currentPolicy.includes('后台仍缺生产签署'));

    for (const doc of initial.data.documents) {
      const version = `prod-${doc.key}-smoke`;
      await request(`/admin/legal-documents/${encodeURIComponent(doc.key)}`, {
        body: {
          bodyText: `${doc.label} smoke production paragraph.\nThis text is used to prove legal document update and approval linkage.`,
          disclaimer: `${doc.label} smoke disclaimer`,
          effectiveDate: '2026-07-09',
          reason: `smoke updates ${doc.key}`,
          title: `${doc.label} Smoke`,
          version,
        },
        method: 'PATCH',
        token: adminToken,
      });
      const approved = await request(`/admin/legal-documents/${encodeURIComponent(doc.key)}/approve`, {
        body: { reason: `smoke approves ${doc.key}` },
        method: 'POST',
        token: adminToken,
      });
      const approvedDoc = approved.data.documents.find((item) => item.key === doc.key);
      assert.equal(approvedDoc.productionReady, true);
      assert.equal(approvedDoc.status, 'approved');
      assert.equal(approvedDoc.version, version);
    }

    const finalDocs = await request('/admin/legal-documents', { token: adminToken });
    assert.equal(finalDocs.data.summary.allRequiredApproved, true);
    assert.equal(finalDocs.data.summary.approved, 4);

    const publicPrivacy = await request('/legal/privacy');
    assert.equal(publicPrivacy.data.version, 'prod-privacy-smoke');
    assert.equal(publicPrivacy.data.productionReady, true);
    assert.ok(publicPrivacy.data.sections[0].body[0].includes('隐私政策 smoke'));

    const publicContentPolicy = await request('/legal/content-policy');
    assert.equal(publicContentPolicy.data.version, 'prod-content_policy-smoke');
    assert.equal(publicContentPolicy.data.productionReady, true);

    const finalReadiness = await request('/admin/launch/readiness', { token: adminToken });
    const finalQuestion = questionById(finalReadiness.data.questions, 'q-compliance-text');
    assert.equal(finalQuestion.status, 'ready');
    assert.equal(finalQuestion.statusLabel, '已签署');
    assert.ok(finalQuestion.currentPolicy.includes('后台已签署生产合规文本与材料'));

    const audit = await request('/admin/audit-logs?limit=120', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'legal.document.update' && item.targetId === 'privacy'));
    assert.ok(audit.data.items.some((item) => item.action === 'legal.document.approve' && item.targetId === 'content_policy'));

    console.log('legal documents smoke passed');
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  fs.rmSync(tmpDir, { force: true, recursive: true });
  console.error(error);
  process.exit(1);
});
