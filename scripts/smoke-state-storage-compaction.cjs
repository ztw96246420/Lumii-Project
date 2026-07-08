#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const TEST_PHONE = '13900006666';
const PET_ID = 'pet-state-storage';
const MEDIA_ID = 'media-state-storage';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-state-storage-'));
const statePath = path.join(tmpDir, 'state.json');
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/atK3qsAAAAASUVORK5CYII=';

let backendProcess = null;
let providerServer = null;
let baseUrl = '';
let providerBaseUrl = '';
const providerSubmitBodies = [];

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

async function startFakeProvider() {
  const imageBuffer = Buffer.from(tinyPngBase64, 'base64');
  providerServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/v1/images/generations') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        providerSubmitBodies.push(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          code: 200,
          data: [{ status: 'submitted', task_id: 'state-storage-task-1' }],
        }));
      });
      return;
    }
    if (req.method === 'GET' && req.url === '/v1/tasks/state-storage-task-1') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 200,
        data: {
          result: {
            images: [{ url: `${providerBaseUrl}/result.png` }],
          },
          status: 'completed',
          task_id: 'state-storage-task-1',
        },
      }));
      return;
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && (req.url === '/source.png' || req.url === '/result.png')) {
      res.writeHead(200, {
        'Content-Length': imageBuffer.length,
        'Content-Type': 'image/png',
      });
      if (req.method === 'HEAD') res.end();
      else res.end(imageBuffer);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'not found' }));
  });
  await new Promise((resolve, reject) => {
    providerServer.once('error', reject);
    providerServer.listen(0, '127.0.0.1', resolve);
  });
  const address = providerServer.address();
  providerBaseUrl = `http://127.0.0.1:${address.port}`;
}

async function stopFakeProvider() {
  if (!providerServer) return;
  const server = providerServer;
  providerServer = null;
  await new Promise((resolve) => server.close(resolve));
}

function writeLegacyLargeState() {
  const now = Date.now();
  const largeDataUrl = `data:image/png;base64,${tinyPngBase64}${'A'.repeat(120_000)}`;
  fs.writeFileSync(statePath, JSON.stringify({
    mediaUploads: {
      [MEDIA_ID]: {
        analysis: {
          canGenerate: true,
          code: 'ok',
          message: '',
          petCount: 1,
          qualityScore: 92,
          status: 'good',
          suggestions: [],
          tags: [],
          title: '',
        },
        createdAt: now - 60_000,
        dataUrl: largeDataUrl,
        fileName: 'state-storage-source.png',
        mediaId: MEDIA_ID,
        mimeType: 'image/png',
        moderationStatus: 'approved',
        objectKey: 'pet-source/state-storage/source.png',
        objectUrl: `${providerBaseUrl}/source.png`,
        ownerPhone: TEST_PHONE,
        previewUrl: `${providerBaseUrl}/source.png`,
        source: 'pet_avatar',
        storageProvider: 'cos',
      },
    },
    petAvatarDailyUsage: {
      [TEST_PHONE]: {
        count: 0,
        day: new Date().toISOString().slice(0, 10),
      },
    },
    users: {
      [TEST_PHONE]: {
        activePetId: PET_ID,
        createdAt: now - 120_000,
        favoritePlaceIds: [],
        ownerName: 'State Storage Smoke',
        permissionsOnboardingCompleted: true,
        pets: [
          {
            birthday: '2024-01-05',
            breed: 'dog',
            gender: 'male',
            id: PET_ID,
            name: 'StorageLucky',
            species: 'dog',
          },
        ],
        phone: TEST_PHONE,
      },
    },
  }, null, 2));
  assert.ok(fs.statSync(statePath).size > 100_000, 'legacy state should contain a large data URL');
}

async function startBackend(port) {
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      AMAP_WEB_SERVICE_KEY: '',
      APIMART_API_KEY: '',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: 'smoke-gpt-image2-key',
      GPT_IMAGE2_BASE_URL: providerBaseUrl,
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      PET_AVATAR_ANIMATION_PROVIDER: 'disabled',
      PET_AVATAR_PROVIDER: 'gpt-image-2',
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '1000',
      SMS_DEVICE_DAILY_LIMIT: '1000',
      SMS_IP_DAILY_LIMIT: '1000',
      STATE_STORAGE_WARN_BYTES: '50000',
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

async function loginUser() {
  await request('/auth/sms/send', {
    body: { deviceId: 'state-storage-smoke-device', phone: TEST_PHONE },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone: TEST_PHONE },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing user token');
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

async function waitForReadyJob(jobId, token) {
  const deadline = Date.now() + 10_000;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await request(`/ai/pet-avatar/jobs/${encodeURIComponent(jobId)}`, { token });
    if (latest.data?.status === 'ready') return latest.data;
    await delay(250);
  }
  throw new Error(`avatar job did not become ready: ${JSON.stringify(latest?.data || {})}`);
}

async function main() {
  await startFakeProvider();
  writeLegacyLargeState();
  const port = await getFreePort();
  await startBackend(port);
  try {
    const compactedStateText = fs.readFileSync(statePath, 'utf8');
    assert.equal(compactedStateText.includes('data:image/png;base64'), false, 'persisted state should not keep durable media data URLs');
    const compactedState = JSON.parse(compactedStateText);
    const compactedMedia = compactedState.mediaUploads[MEDIA_ID];
    assert.equal(compactedMedia.dataUrl, undefined);
    assert.ok(compactedMedia.dataUrlPrunedBytes > 100_000, 'missing pruned byte evidence');
    assert.ok(fs.statSync(statePath).size < 50_000, 'compacted state should be below warning threshold');

    const adminToken = await loginAdmin();
    const health = await request('/admin/system/health', { token: adminToken });
    assert.equal(health.data.checks.some((item) => item.key === 'state_file' && item.status === 'ok'), true);

    const userToken = await loginUser();
    const started = await request('/ai/pet-avatar/jobs', {
      body: { mediaId: MEDIA_ID },
      method: 'POST',
      token: userToken,
    });
    const readyJob = await waitForReadyJob(started.data.id, userToken);
    assert.equal(readyJob.status, 'ready');
    assert.equal(providerSubmitBodies.length >= 1, true);
    assert.deepEqual(providerSubmitBodies[0].image_urls, [`${providerBaseUrl}/source.png`]);
    assert.equal(JSON.stringify(providerSubmitBodies[0]).includes('data:image/png;base64'), false);

    console.log('state storage compaction smoke passed');
  } finally {
    await stopBackend();
    await stopFakeProvider();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopFakeProvider();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
