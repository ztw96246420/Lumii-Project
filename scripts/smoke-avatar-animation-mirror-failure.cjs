#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const TEST_PHONE = '13900008889';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-avatar-animation-mirror-failure-'));
const statePath = path.join(tmpDir, 'state.json');
const providerTaskId = 'seedance-mirror-failure-task';
const failedVideoUrl = 'http://127.0.0.1:1/lumii-mirror-failure.mp4';

let apimartServer = null;
let apimartPort = 0;
let backendProcess = null;
let baseUrl = '';
let submitCount = 0;
let statusCount = 0;

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

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function startApimartMock() {
  apimartPort = await getFreePort();
  apimartServer = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${apimartPort}`);
      if (req.method === 'POST' && url.pathname === '/v1/videos/generations') {
        const rawBody = await collectRequestBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        assert.equal(body.duration, 4);
        assert.equal(body.aspect_ratio, '1:1');
        assert.equal(body.resolution, '480p');
        submitCount += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: { status: 'submitted', task_id: providerTaskId } }));
        return;
      }
      if (req.method === 'GET' && url.pathname === `/v1/tasks/${providerTaskId}`) {
        statusCount += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            result: {
              videos: [{ url: failedVideoUrl }],
            },
            status: 'completed',
          },
        }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'not found' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: error?.message || String(error) }));
    }
  });
  await new Promise((resolve, reject) => {
    apimartServer.once('error', reject);
    apimartServer.listen(apimartPort, '127.0.0.1', resolve);
  });
}

async function stopApimartMock() {
  if (!apimartServer) return;
  const server = apimartServer;
  apimartServer = null;
  await new Promise((resolve) => server.close(resolve));
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

async function startBackend(port) {
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      AMAP_WEB_SERVICE_KEY: '',
      APIMART_API_KEY: 'smoke-apimart-key',
      APIMART_BASE_URL: `http://127.0.0.1:${apimartPort}`,
      COS_BUCKET: '',
      COS_SECRET_ID: '',
      COS_SECRET_KEY: '',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      PET_AVATAR_ANIMATION_DOWNLOAD_TIMEOUT_MS: '300',
      PET_AVATAR_ANIMATION_MIRROR_MAX_ATTEMPTS: '3',
      PET_AVATAR_ANIMATION_MIRROR_RETRY_MS: '1000',
      PET_AVATAR_ANIMATION_POSTPROCESS_ENABLED: 'false',
      PET_AVATAR_ANIMATION_PROVIDER: 'doubao-seedance-1-5-pro',
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
    body: { deviceId: `avatar-animation-mirror-failure-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing user token for ${phone}`);
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

async function createPet(token) {
  const payload = await request('/pets', {
    body: {
      avatarUrl: 'http://127.0.0.1:1/lumii-static-avatar.png',
      birthday: '2024-01-05',
      breed: 'dog',
      gender: 'male',
      name: 'Lucky',
      species: 'dog',
      weightKg: 18.6,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, 'missing pet id');
  return payload.data;
}

async function waitForSavedMirrorState(predicate, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    try {
      const savedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      latest = Object.values(savedState.avatarAnimationJobs || {})[0] || null;
      if (predicate(latest)) return latest;
    } catch {}
    await delay(50);
  }
  throw new Error(`saved mirror state did not converge: ${JSON.stringify(latest)}`);
}

async function main() {
  await startApimartMock();
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser(TEST_PHONE);
    const adminToken = await loginAdmin();
    const pet = await createPet(userToken);

    const started = await request('/ai/pet-avatar/animation', {
      body: { petId: pet.id },
      method: 'POST',
      token: userToken,
    });
    assert.equal(started.data.status, 'processing');

    await waitForSavedMirrorState((job) => Boolean(job?.providerJobId));
    const mirrorStarted = await request(`/ai/pet-avatar/animation/latest?petId=${encodeURIComponent(pet.id)}`, { token: userToken });
    assert.equal(mirrorStarted.data.status, 'processing');
    await waitForSavedMirrorState((job) => Number(job?.mirrorFailedCount || 0) === 1 && job?.providerStatus === 'mirror_failed');

    await stopBackend();
    await startBackend(await getFreePort());
    const failed = await waitForSavedMirrorState((job) => job?.status === 'failed');
    assert.equal(failed.errorCode, 'AVATAR_ANIMATION_MIRROR_FAILED');
    assert.equal(failed.providerStatus, 'mirror_failed');
    assert.equal(failed.videoUrl, '');
    assert.equal(failed.progress >= 96, true);

    const jobs = await request('/admin/ai/avatar-animation-jobs', { token: adminToken });
    const row = jobs.data.find((item) => item.id === failed.id);
    assert.ok(row, 'missing admin animation job row');
    assert.equal(row.status, 'failed');
    assert.equal(row.errorCode, 'AVATAR_ANIMATION_MIRROR_FAILED');
    assert.equal(row.providerStatus, 'mirror_failed');
    assert.equal(Number(row.mirrorFailedCount || 0) >= 3, true);

    const audit = await request(`/admin/audit-logs?action=ai.avatar_animation.mirror_failed&targetType=avatar_animation_job&q=${encodeURIComponent(failed.id)}`, { token: adminToken });
    assert.equal(audit.data.items.some((item) => item.action === 'ai.avatar_animation.mirror_failed' && item.targetId === failed.id), true);

    const savedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const savedPet = savedState.users[TEST_PHONE].pets.find((item) => item.id === pet.id);
    assert.equal(savedPet.avatarAnimationJobId, failed.id);
    assert.equal(savedPet.avatarAnimationStatus, 'failed');
    assert.equal(savedPet.avatarAnimationUrl || '', '');
    assert.equal(submitCount, 1);
    assert.equal(statusCount, 1, 'mirror retries must not depend on more client status polling');

    console.log('avatar animation mirror failure smoke passed');
  } finally {
    await stopBackend();
    await stopApimartMock();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopApimartMock();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
