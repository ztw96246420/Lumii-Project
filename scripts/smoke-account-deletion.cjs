#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const CANCEL_PHONE = '13900007771';
const PURGE_PHONE = '13900007772';
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-account-deletion-'));
const statePath = path.join(tmpDir, 'state.json');

let backendProcess = null;
let baseUrl = '';
let cosServer = null;
const cosRequests = [];
let cosDeleteAttempts = 0;

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

async function startCosServer(port) {
  cosServer = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      cosRequests.push({ bodyBytes: Buffer.concat(chunks).length, method: req.method, path: req.url });
      if (req.method === 'DELETE') {
        cosDeleteAttempts += 1;
        if (cosDeleteAttempts === 1) {
          res.statusCode = 500;
          res.end('<Error><Message>transient delete failure</Message></Error>');
          return;
        }
        res.statusCode = 204;
      } else {
        res.statusCode = 200;
      }
      res.end();
    });
  });
  await new Promise((resolve, reject) => {
    cosServer.once('error', reject);
    cosServer.listen(port, '127.0.0.1', resolve);
  });
}

async function startBackend(port, cosPort) {
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      ACCOUNT_DELETE_COOLING_OFF_MS: '350',
      ACCOUNT_DELETION_OBJECT_RETRY_BASE_MS: '1000',
      ACCOUNT_DELETION_SWEEP_INTERVAL_MS: '1000',
      AMAP_WEB_SERVICE_KEY: '',
      AUTH_TOKEN_TTL_MS: '60000',
      COS_BUCKET: 'lumii-account-deletion-test',
      COS_ENDPOINT: `http://127.0.0.1:${cosPort}`,
      COS_REGION: 'ap-guangzhou',
      COS_SECRET_ID: 'test-cos-secret-id',
      COS_SECRET_KEY: 'test-cos-secret-key',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      LUMII_AUTH_SESSION_RETAIN_PER_USER: '5',
      NODE_ENV: 'development',
      PET_AVATAR_ANIMATION_PROVIDER: 'mock',
      PET_AVATAR_PROVIDER: 'mock',
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

async function stopCosServer() {
  if (!cosServer) return;
  const server = cosServer;
  cosServer = null;
  await new Promise((resolve) => server.close(resolve));
}

async function login(phone) {
  const deviceId = 'account-deletion-smoke-device';
  await request('/auth/sms/send', {
    body: { deviceId, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, deviceId, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.equal(payload.state, 'success');
  assert.ok(payload.data?.token);
  return payload.data;
}

async function waitFor(predicate, message, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await predicate();
    if (lastValue) return lastValue;
    await delay(50);
  }
  throw new Error(`${message}; last=${JSON.stringify(lastValue)}`);
}

async function main() {
  const [port, cosPort] = await Promise.all([getFreePort(), getFreePort()]);
  await startCosServer(cosPort);
  await startBackend(port, cosPort);
  try {
    const session = await login(CANCEL_PHONE);
    assert.equal(session.account.accountStatus, 'active');

    const requestPayload = await request('/account/delete/request', {
      method: 'POST',
      token: session.token,
    });
    assert.equal(requestPayload.state, 'success');
    assert.equal(requestPayload.data.requested, true);
    assert.ok(requestPayload.data.expiresAt > Date.now());

    const wrongCodePayload = await request('/account/delete/confirm', {
      body: { code: '000000' },
      expectedStatus: 400,
      method: 'POST',
      token: session.token,
    });
    assert.equal(wrongCodePayload.error.code, 'ACCOUNT_DELETE_CODE_INVALID');

    const confirmed = await request('/account/delete/confirm', {
      body: { code: TEST_CODE },
      method: 'POST',
      token: session.token,
    });
    assert.equal(confirmed.state, 'success');
    assert.equal(confirmed.data.status, 'deletion_pending');
    assert.equal(confirmed.data.account.accountStatus, 'deletion_pending');
    assert.equal(confirmed.data.account.accountDeletion.status, 'pending');
    assert.ok(Date.parse(confirmed.data.scheduledDeletionAt) > Date.now());

    const revokedPayload = await request('/me', {
      expectedStatus: 401,
      token: session.token,
    });
    assert.equal(revokedPayload.state, 'error');

    const resumed = await login(CANCEL_PHONE);
    assert.equal(resumed.account.accountStatus, 'active');
    assert.equal(resumed.account.accountDeletion, null);

    const purgeSessions = [];
    for (let index = 0; index < 7; index += 1) purgeSessions.push(await login(PURGE_PHONE));
    const purgeSession = purgeSessions[0];
    const purgeSecondSession = purgeSessions[purgeSessions.length - 1];
    const firstTokenDigest = crypto.createHash('sha256').update(purgeSession.token).digest('hex');
    const stateBeforePurge = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(stateBeforePurge.authSessions[PURGE_PHONE].length, 5, 'session retention fixture must prune older sessions');
    assert.equal(stateBeforePurge.authSessions[PURGE_PHONE].some((item) => item.tokenDigest === firstTokenDigest), false, 'oldest token must be outside the retained session list');
    const pet = await request('/pets', {
      body: {
        birthday: '2024-01-05',
        breed: 'dog',
        gender: 'male',
        name: 'Delete Me',
        species: 'dog',
        weightKg: 12.5,
      },
      method: 'POST',
      token: purgeSession.token,
    });
    assert.ok(pet.data?.id);
    const memo = await request('/health/memos', {
      body: { content: 'account deletion memo', title: 'Deletion memo' },
      method: 'POST',
      token: purgeSession.token,
    });
    assert.ok(memo.data?.id);
    const moment = await request('/social/pet-circle/posts', {
      body: {
        content: 'account deletion social moment',
        location: { accuracy: 20, latitude: 23.1291, longitude: 113.2644, updatedAt: Date.now() },
        visibility: 'nearby',
      },
      method: 'POST',
      token: purgeSession.token,
    });
    assert.ok(moment.data?.id);
    const feedback = await request('/feedback', {
      body: { category: 'other', content: 'account deletion support ticket' },
      method: 'POST',
      token: purgeSession.token,
    });
    assert.ok(feedback.data?.id);
    const uploaded = await request('/media/uploads', {
      body: {
        base64: TINY_PNG_BASE64,
        fileName: 'delete-me.png',
        mimeType: 'image/png',
        source: 'pet_avatar',
      },
      method: 'POST',
      token: purgeSession.token,
    });
    assert.ok(uploaded.data?.mediaId);
    const putRequest = cosRequests.find((item) => item.method === 'PUT');
    assert.ok(putRequest?.path, 'user media must be persisted before deletion');

    await request('/account/delete/request', { method: 'POST', token: purgeSession.token });
    const purgeConfirmed = await request('/account/delete/confirm', {
      body: { code: TEST_CODE },
      method: 'POST',
      token: purgeSession.token,
    });
    assert.equal(purgeConfirmed.data.status, 'deletion_pending');

    const revokedImmediately = await request('/me', {
      expectedStatus: 401,
      token: purgeSession.token,
    });
    assert.equal(revokedImmediately.error.code, 'AUTH_REQUIRED');
    const secondSessionRevokedImmediately = await request('/me', {
      expectedStatus: 401,
      token: purgeSecondSession.token,
    });
    assert.equal(secondSessionRevokedImmediately.error.code, 'AUTH_REQUIRED');

    await delay(450);
    await request('/health');
    await waitFor(
      () => cosRequests.some((item) => item.method === 'DELETE' && item.path === putRequest.path),
      'account media object cleanup was not attempted',
    );
    const failedCleanupState = await waitFor(() => {
      const snapshot = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      const item = Object.values(snapshot.accountDeletionObjectCleanup || {})[0];
      return item?.attempts === 1 && item.lastError ? snapshot : null;
    }, 'failed COS deletion was not persisted for retry');
    assert.equal(Object.keys(failedCleanupState.accountDeletionObjectCleanup).length, 1);
    await delay(1100);
    await request('/health');
    await waitFor(
      () => cosRequests.filter((item) => item.method === 'DELETE' && item.path === putRequest.path).length >= 2,
      'account media object cleanup was not retried',
    );
    const deletedState = await waitFor(() => {
      const snapshot = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      return !snapshot.users?.[PURGE_PHONE] && Object.keys(snapshot.accountDeletionObjectCleanup || {}).length === 0 ? snapshot : null;
    }, 'account state was not permanently deleted');

    assert.equal(deletedState.sms?.[PURGE_PHONE], undefined);
    assert.equal(deletedState.smsDailyUsage?.[PURGE_PHONE], undefined);
    assert.equal(deletedState.authSessions?.[PURGE_PHONE], undefined);
    assert.equal(Object.values(deletedState.mediaUploads || {}).some((item) => item.ownerPhone === PURGE_PHONE), false);
    assert.equal(Object.keys(deletedState.accountDeletionTombstones || {}).length, 1);
    assert.equal(JSON.stringify(deletedState).includes(PURGE_PHONE), false, 'persisted state must not retain the deleted phone outside immutable external audit storage');
    assert.equal(JSON.stringify(deletedState).includes(pet.data.id), false);
    assert.equal(JSON.stringify(deletedState).includes(memo.data.id), false);
    assert.equal(JSON.stringify(deletedState).includes(moment.data.id), false);
    assert.equal(JSON.stringify(deletedState).includes(feedback.data.id), false);

    await stopBackend();
    await startBackend(port, cosPort);

    const revokedAfterPurge = await request('/me', {
      expectedStatus: 401,
      token: purgeSession.token,
    });
    assert.equal(revokedAfterPurge.error.code, 'AUTH_REQUIRED');
    const secondSessionRevokedAfterPurge = await request('/me', {
      expectedStatus: 401,
      token: purgeSecondSession.token,
    });
    assert.equal(secondSessionRevokedAfterPurge.error.code, 'AUTH_REQUIRED');

    const freshRegistration = await login(PURGE_PHONE);
    assert.equal(freshRegistration.account.accountStatus, 'active');
    assert.equal(freshRegistration.account.accountDeletion, null);
    assert.equal(freshRegistration.account.activePet, null);
    const freshMe = await request('/me', { token: freshRegistration.token });
    assert.equal(freshMe.data.phone, PURGE_PHONE);

    console.log('account deletion smoke passed');
  } finally {
    await stopBackend();
    await stopCosServer();
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopCosServer();
  console.error(error);
  process.exit(1);
});
