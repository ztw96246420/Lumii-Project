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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-social-evidence-'));
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

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `social-evidence-smoke-${phone}`, phone },
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

async function createPet(token, name, species = 'dog') {
  const payload = await request('/pets', {
    body: {
      birthday: '2024-01-05',
      breed: species === 'cat' ? 'British Shorthair' : 'Golden',
      gender: species === 'cat' ? 'female' : 'male',
      name,
      species,
      weightKg: species === 'cat' ? 4.8 : 18.6,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `missing pet id for ${name}`);
  return payload.data;
}

async function refreshPresence(token, lat, lng) {
  const query = new URLSearchParams({
    accuracy: '25',
    lat: String(lat),
    lng: String(lng),
    radiusKm: '3',
  });
  await request(`/social/discover?${query}`, { token });
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const authorPhone = '19900006601';
    const commenterPhone = '19900006602';
    const reporterPhone = '19900006603';
    const authorToken = await loginUser(authorPhone);
    const commenterToken = await loginUser(commenterPhone);
    const reporterToken = await loginUser(reporterPhone);
    const adminToken = await loginAdmin();

    await createPet(authorToken, 'EviLucky');
    await createPet(commenterToken, 'EviMochi', 'cat');
    await createPet(reporterToken, 'EviNana', 'dog');
    await refreshPresence(authorToken, 22.543096, 114.057865);
    await refreshPresence(commenterToken, 22.5433, 114.058);
    await refreshPresence(reporterToken, 22.5434, 114.0581);

    const post = await request('/social/pet-circle/posts', {
      body: {
        content: 'social evidence detail smoke post',
        imageUrls: ['https://cdn.example.com/social-evidence-post.jpg'],
        location: { accuracy: 25, latitude: 22.543096, longitude: 114.057865, radiusKm: 3, updatedAt: Date.now() },
        visibility: 'nearby',
      },
      method: 'POST',
      token: authorToken,
    });
    assert.ok(post.data?.id, 'post should be created');

    const commentList = await request(`/social/pet-circle/posts/${encodeURIComponent(post.data.id)}/comments`, {
      body: { content: 'social evidence detail smoke comment' },
      method: 'POST',
      token: commenterToken,
    });
    const commentId = commentList.data?.[0]?.id;
    assert.ok(commentId, 'comment should be created');

    const postReport = await request(`/social/pet-circle/posts/${encodeURIComponent(post.data.id)}/report`, {
      body: { content: 'post evidence smoke report' },
      method: 'POST',
      token: reporterToken,
    });
    assert.equal(postReport.data?.targetType, 'post');

    const commentReport = await request(`/social/pet-circle/comments/${encodeURIComponent(commentId)}/report`, {
      body: { content: 'comment evidence smoke report' },
      method: 'POST',
      token: authorToken,
    });
    assert.equal(commentReport.data?.targetType, 'comment');

    await request(`/admin/social/reports/${encodeURIComponent(postReport.data.id)}/resolve`, {
      body: { reason: 'Smoke evidence should include report audit', status: 'reviewing' },
      method: 'POST',
      token: adminToken,
    });

    const missingReason = await request(`/admin/social/posts/${encodeURIComponent(post.data.id)}/evidence`, {
      body: { reason: '   ' },
      expectedStatus: 400,
      method: 'POST',
      token: adminToken,
    });
    assert.equal(missingReason.error?.code, 'ADMIN_SOCIAL_EVIDENCE_REASON_REQUIRED');

    const postEvidence = await request(`/admin/social/posts/${encodeURIComponent(post.data.id)}/evidence`, {
      body: { reason: 'Smoke post evidence review' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(postEvidence.data?.detailType, 'post');
    assert.equal(postEvidence.data?.post?.id, post.data.id);
    assert.equal(postEvidence.data?.evidenceSnapshot?.targetType, 'post');
    assert.equal(postEvidence.data?.evidenceSnapshot?.mediaUrls?.length, 1);
    assert.equal(postEvidence.data?.summary?.comments, 1);
    assert.equal(postEvidence.data?.summary?.images, 1);
    assert.ok(
      postEvidence.data?.reports?.some((item) => item.id === postReport.data.id),
      'post evidence should include direct post report',
    );
    assert.ok(
      postEvidence.data?.reports?.some((item) => item.id === commentReport.data.id),
      'post evidence should include child comment report',
    );
    assert.ok(
      postEvidence.data?.auditLogs?.some((item) => item.action === 'social.report.resolve' && item.targetId === postReport.data.id),
      'post evidence should include linked report audit logs',
    );

    const commentEvidence = await request(`/admin/social/comments/${encodeURIComponent(commentId)}/evidence`, {
      body: { reason: 'Smoke comment evidence review' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(commentEvidence.data?.detailType, 'comment');
    assert.equal(commentEvidence.data?.comment?.id, commentId);
    assert.equal(commentEvidence.data?.parentPost?.id, post.data.id);
    assert.equal(commentEvidence.data?.evidenceSnapshot?.targetType, 'comment');
    assert.ok(
      commentEvidence.data?.reports?.some((item) => item.id === commentReport.data.id),
      'comment evidence should include comment report',
    );

    const audit = await request('/admin/audit-logs?limit=80', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'social.post.evidence.view' && item.targetId === post.data.id));
    assert.ok(audit.data.items.some((item) => item.action === 'social.comment.evidence.view' && item.targetId === commentId));

    console.log('social evidence detail smoke passed');
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
