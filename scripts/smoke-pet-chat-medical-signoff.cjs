#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-pet-medical-signoff-'));
const statePath = path.join(tmpDir, 'state.json');
const credentialNumber = 'VET-CREDENTIAL-2026-7788';
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
  let lastError;
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
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      SMS_COOLDOWN_MS: '0',
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
  assert.ok(payload.data?.token);
  return payload.data.token;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    let adminToken = await loginAdmin();
    const initial = await request('/admin/ai/pet-chat/medical-signoff', { token: adminToken });
    assert.equal(initial.data.ready, false);
    assert.equal(initial.data.status, 'pending');
    assert.match(initial.data.currentReviewVersion, /^[0-9a-f]{64}$/);

    const stale = await request('/admin/ai/pet-chat/medical-signoff', {
      body: {
        confirmedLicensedVeterinarian: true,
        confirmText: initial.data.confirmText,
        credentialNumber,
        credentialType: '执业兽医师资格证',
        decision: 'approved',
        evidenceReference: 'controlled-review/VET-2026-001',
        note: '已复核全部医疗风险规则与正反例样本。',
        reason: '执业兽医完成上线前医疗安全复核',
        reviewerName: '测试兽医',
        reviewVersion: '0'.repeat(64),
      },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(stale.error?.code, 'ADMIN_PET_MEDICAL_REVIEW_STALE');

    const approved = await request('/admin/ai/pet-chat/medical-signoff', {
      body: {
        confirmedLicensedVeterinarian: true,
        confirmText: initial.data.confirmText,
        credentialNumber,
        credentialType: '执业兽医师资格证',
        decision: 'approved',
        evidenceReference: 'controlled-review/VET-2026-001',
        note: '已复核全部医疗风险规则、固定安全回复、后置过滤和正反例样本。',
        reason: '执业兽医完成上线前医疗安全复核',
        reviewerName: '测试兽医',
        reviewVersion: initial.data.currentReviewVersion,
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approved.data.ready, true);
    assert.equal(approved.data.status, 'ready');
    assert.equal(approved.data.signoff.credentialNumberTail, '7788');
    assert.equal(Object.hasOwn(approved.data.signoff, 'credentialNumber'), false);
    assert.equal(Object.hasOwn(approved.data.signoff, 'credentialNumberHash'), false);
    assert.equal(JSON.stringify(approved.data).includes(credentialNumber), false);
    assert.ok(Date.parse(approved.data.signoff.validUntil) > Date.now());

    const readiness = await request('/admin/launch/readiness', { token: adminToken });
    assert.equal(readiness.data.modules.find((item) => item.key === 'pet_chat')?.status, 'ready');
    assert.equal(readiness.data.gaps.find((item) => item.key === 'pet_medical_review')?.status, 'ready');
    assert.equal(readiness.data.questions.find((item) => item.id === 'q-vet-review')?.status, 'ready');

    const health = await request('/admin/system/health', { token: adminToken });
    assert.equal(health.data.checks.find((item) => item.key === 'pet_medical_review')?.status, 'ok');
    assert.equal(health.data.petMedicalReview?.ready, true);

    await stopBackend();
    await startBackend(port);
    adminToken = await loginAdmin();
    const afterRestart = await request('/admin/ai/pet-chat/medical-signoff', { token: adminToken });
    assert.equal(afterRestart.data.ready, true);
    assert.equal(afterRestart.data.currentReviewVersion, initial.data.currentReviewVersion);

    const revoked = await request('/admin/ai/pet-chat/medical-signoff', {
      body: { decision: 'revoked', reason: '测试撤销后应重新进入专业复核流程' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(revoked.data.ready, false);
    assert.equal(revoked.data.status, 'pending');

    const audit = await request('/admin/audit-logs?action=ai.petChat.medical_signoff.approve', { token: adminToken });
    assert.equal(audit.data.items.length, 1);
    const persisted = fs.readFileSync(statePath, 'utf8');
    assert.equal(persisted.includes(credentialNumber), false, 'raw veterinary credential must not persist');

    console.log('pet chat medical signoff smoke passed');
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
