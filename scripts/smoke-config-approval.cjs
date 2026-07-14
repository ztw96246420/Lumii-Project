#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-config-approval-'));
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

    await request('/admin/config', {
      body: {
        configApproval: { approvalExpiresHours: 12, requireApproval: true },
        reason: 'enable config approval smoke',
        riskAcknowledged: true,
        riskConfirmText: '确认发布高风险配置',
      },
      method: 'PATCH',
      token: adminToken,
    });

    const direct = await request('/admin/config', {
      body: {
        reason: 'direct config publish should be blocked',
        social: { discoverRadiusKm: 5 },
      },
      expectedStatus: 409,
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(direct.error.code, 'ADMIN_CONFIG_APPROVAL_REQUIRED');

    const publicBefore = await request('/app/config');
    assert.notEqual(publicBefore.data.social.discoverRadiusKm, 5);
    assert.equal(publicBefore.data.social.petCircleMaxPhotos, 6);

    const approvalResponse = await request('/admin/config/approvals', {
      body: {
        action: 'publish',
        reason: 'approve radius change',
        social: { discoverRadiusKm: 5, petCircleMaxPhotos: 9 },
      },
      method: 'POST',
      token: adminToken,
    });
    const publishApprovalId = approvalResponse.data.approval.id;
    assert.equal(approvalResponse.data.approval.status, 'pending_approval');

    const publicStillBefore = await request('/app/config');
    assert.notEqual(publicStillBefore.data.social.discoverRadiusKm, 5);

    const approvedPublish = await request(`/admin/config/approvals/${encodeURIComponent(publishApprovalId)}/approve`, {
      body: { reason: 'approve config radius change' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approvedPublish.data.approval.status, 'approved');
    assert.ok(approvedPublish.data.approval.revisionId);

    const publicAfterPublish = await request('/app/config');
    assert.equal(publicAfterPublish.data.social.discoverRadiusKm, 5);
    assert.equal(publicAfterPublish.data.social.petCircleMaxPhotos, 6, 'pet circle photo policy must stay capped at six');

    const draftResponse = await request('/admin/config/drafts', {
      body: {
        reason: 'draft ttl change',
        social: { nearbyMomentTtlDays: 12 },
      },
      method: 'POST',
      token: adminToken,
    });
    const draftId = draftResponse.data.draft.id;

    const directDraftPublish = await request(`/admin/config/drafts/${encodeURIComponent(draftId)}/publish`, {
      body: { reason: 'direct draft publish should be blocked' },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(directDraftPublish.error.code, 'ADMIN_CONFIG_APPROVAL_REQUIRED');

    const draftApproval = await request('/admin/config/approvals', {
      body: {
        action: 'draft_publish',
        draftId,
        reason: 'approve draft ttl change',
      },
      method: 'POST',
      token: adminToken,
    });
    const draftApprovalId = draftApproval.data.approval.id;
    await request(`/admin/config/approvals/${encodeURIComponent(draftApprovalId)}/approve`, {
      body: { reason: 'approve config draft' },
      method: 'POST',
      token: adminToken,
    });

    const publicAfterDraft = await request('/app/config');
    assert.equal(publicAfterDraft.data.social.discoverRadiusKm, 5);
    assert.equal(publicAfterDraft.data.social.nearbyMomentTtlDays, 12);

    const configAfterDraft = await request('/admin/config', { token: adminToken });
    const rollbackSource = configAfterDraft.data.revisions.find((item) => item.action === 'approval_publish');
    assert.ok(rollbackSource?.id, 'missing approval publish revision for rollback smoke');

    const directRollback = await request(`/admin/config/revisions/${encodeURIComponent(rollbackSource.id)}/rollback`, {
      body: { reason: 'direct rollback should be blocked' },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(directRollback.error.code, 'ADMIN_CONFIG_APPROVAL_REQUIRED');

    const rollbackApproval = await request('/admin/config/approvals', {
      body: {
        action: 'rollback',
        reason: 'approve rollback smoke',
        revisionId: rollbackSource.id,
      },
      method: 'POST',
      token: adminToken,
    });
    const rollbackApprovalId = rollbackApproval.data.approval.id;
    await request(`/admin/config/approvals/${encodeURIComponent(rollbackApprovalId)}/approve`, {
      body: { reason: 'approve config rollback' },
      method: 'POST',
      token: adminToken,
    });

    const publicAfterRollback = await request('/app/config');
    assert.equal(publicAfterRollback.data.social.discoverRadiusKm, 5);
    assert.notEqual(publicAfterRollback.data.social.nearbyMomentTtlDays, 12);

    const approvals = await request('/admin/config/approvals?status=all', { token: adminToken });
    assert.equal(approvals.data.summary.approved, 3);

    const audit = await request('/admin/audit-logs?limit=100', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'config.approval.create'), 'config approval creation should be audited');
    assert.ok(audit.data.items.some((item) => item.action === 'config.approval.approve'), 'config approval approve should be audited');

    console.log('config approval smoke passed');
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
