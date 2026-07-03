#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const TEST_PHONE = '13900009991';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-ai-provider-trace-'));
const statePath = path.join(tmpDir, 'state.json');
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/atK3qsAAAAASUVORK5CYII=';
let backendProcess = null;
let providerServer = null;
let baseUrl = '';
let providerBaseUrl = '';

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
  providerServer = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/v1/images/generations') {
      req.resume();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 200,
        data: [{ status: 'submitted', task_id: 'trace-task-1' }],
      }));
      return;
    }
    if (req.method === 'GET' && req.url === '/v1/tasks/trace-task-1') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 200,
        data: {
          cost: 0.0123,
          credits_cost: 1.25,
          result: {
            images: [{ url: `${providerBaseUrl}/result.png` }],
          },
          status: 'completed',
          task_id: 'trace-task-1',
        },
      }));
      return;
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && req.url === '/result.png') {
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

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `ai-provider-trace-smoke-${phone}`, phone },
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

async function createPet(token) {
  const payload = await request('/pets', {
    body: {
      birthday: '2024-01-05',
      breed: 'dog',
      gender: 'male',
      name: 'TraceLucky',
      species: 'dog',
      weightKg: 18.6,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, 'missing pet id');
  return payload.data;
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
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser(TEST_PHONE);
    const adminToken = await loginAdmin();
    await createPet(userToken);

    const upload = await request('/media/uploads', {
      body: {
        base64: `data:image/png;base64,${tinyPngBase64}`,
        fileName: 'trace-lucky.png',
        mimeType: 'image/png',
        source: 'pet_avatar',
      },
      method: 'POST',
      token: userToken,
    });
    assert.ok(upload.data?.mediaId, 'missing uploaded media id');

    const started = await request('/ai/pet-avatar/jobs', {
      body: { mediaId: upload.data.mediaId },
      method: 'POST',
      token: userToken,
    });
    const readyJob = await waitForReadyJob(started.data.id, userToken);
    assert.equal(readyJob.status, 'ready');

    const adminJobs = await request('/admin/ai/avatar-jobs', { token: adminToken });
    const row = adminJobs.data.find((item) => item.id === readyJob.id);
    assert.ok(row, 'missing admin avatar job row');
    assert.ok(row.providerTraceCount >= 2, `expected provider traces, got ${row.providerTraceCount}`);
    assert.equal(row.providerTrace.some((trace) => trace.stage === 'submit'), true);
    assert.equal(row.providerTrace.some((trace) => trace.stage === 'status'), true);
    assert.equal(row.providerCost.cost, 0.0123);
    assert.equal(row.providerCost.creditsCost, 1.25);
    const traceJson = JSON.stringify(row.providerTrace);
    assert.equal(traceJson.includes(tinyPngBase64), false, 'provider trace leaked base64 image data');
    assert.equal(traceJson.includes('Smoke prompt'), false, 'provider trace should not include raw prompt text');

    const usage = await request('/admin/ai/usage?days=7', { token: adminToken });
    assert.ok(usage.data.summary.providerTraceEntries >= 2);
    assert.ok(usage.data.providers.some((provider) => provider.provider === 'gpt-image-2' && provider.traceCount >= 2));
    console.log('AI provider trace smoke passed');
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
