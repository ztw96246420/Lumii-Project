#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const TEST_PHONE = '13900009993';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-ai-prompt-versions-'));
const statePath = path.join(tmpDir, 'state.json');
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/atK3qsAAAAASUVORK5CYII=';

let backendProcess = null;
let providerServer = null;
let baseUrl = '';
let providerBaseUrl = '';
const submitBodies = [];

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

function readJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(text ? JSON.parse(text) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function startFakeProvider() {
  const imageBuffer = Buffer.from(tinyPngBase64, 'base64');
  providerServer = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/v1/images/generations') {
      const body = await readJsonBody(req);
      submitBodies.push(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 200,
        data: [{ status: 'submitted', task_id: 'prompt-version-task-1' }],
      }));
      return;
    }
    if (req.method === 'GET' && req.url === '/v1/tasks/prompt-version-task-1') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 200,
        data: {
          cost: 0.0234,
          credits_cost: 1.5,
          result: {
            images: [{ url: `${providerBaseUrl}/prompt-version-result.png` }],
          },
          status: 'completed',
          task_id: 'prompt-version-task-1',
        },
      }));
      return;
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && req.url === '/prompt-version-result.png') {
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

async function loginAdmin() {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing admin token');
  return payload.data.token;
}

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `ai-prompt-version-smoke-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing user token for ${phone}`);
  return payload.data.token;
}

async function createPet(token) {
  const payload = await request('/pets', {
    body: {
      birthday: '2024-01-05',
      breed: 'dog',
      gender: 'male',
      name: 'PromptLucky',
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
    const adminToken = await loginAdmin();
    const initialVersions = await request('/admin/ai/prompt-versions', { token: adminToken });
    assert.equal(initialVersions.data.summary.all, 0);
    assert.equal(initialVersions.data.current.promptVersion, 'ops-config-gpt-image-2');

    const promptTemplate = [
      'SMOKE_PROMPT_VERSION_MARKER for {petName}.',
      'Create the exact same {species}; breed/profile hint {breed}.',
      'Keep identity stable and render as a premium 3D Lumii companion.',
    ].join('\n');
    const created = await request('/admin/ai/prompt-versions', {
      body: {
        name: 'Smoke prompt candidate',
        note: 'Verify prompt candidate to config draft linkage.',
        promptTemplate,
        reason: 'smoke create prompt candidate',
        source: 'manual',
        target: 'avatar_gpt_image2',
      },
      method: 'POST',
      token: adminToken,
    });
    const version = created.data;
    assert.ok(version.id.startsWith('prompt-version-'));
    assert.equal(version.status, 'candidate');
    assert.equal(version.promptHash.length, 16);

    const drafted = await request(`/admin/ai/prompt-versions/${encodeURIComponent(version.id)}/draft`, {
      body: { reason: 'smoke create config draft from prompt candidate' },
      method: 'POST',
      token: adminToken,
    });
    const draft = drafted.data.draft;
    assert.ok(draft.id.startsWith('config-draft-'));
    assert.equal(draft.config.ai.avatar.gptImage2.promptVersion, version.id);
    assert.equal(draft.config.ai.avatar.gptImage2.promptTemplate, promptTemplate);

    const published = await request(`/admin/config/drafts/${encodeURIComponent(draft.id)}/publish`, {
      body: { reason: 'smoke publish prompt candidate draft' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(published.data.ai.avatar.gptImage2.promptVersion, version.id);
    assert.equal(published.data.ai.avatar.gptImage2.promptTemplate, promptTemplate);
    assert.ok(published.data.revisions[0].changeSummary.some((item) => item.key === 'ai.avatar.gptImage2.promptVersion'));

    const versionsAfterPublish = await request('/admin/ai/prompt-versions?status=all', { token: adminToken });
    const currentVersion = versionsAfterPublish.data.items.find((item) => item.id === version.id);
    assert.equal(currentVersion.current, true);
    assert.equal(currentVersion.status, 'drafted');
    assert.equal(currentVersion.lastDraftId, draft.id);

    const userToken = await loginUser(TEST_PHONE);
    await createPet(userToken);
    const upload = await request('/media/uploads', {
      body: {
        base64: `data:image/png;base64,${tinyPngBase64}`,
        fileName: 'prompt-lucky.png',
        mimeType: 'image/png',
        source: 'pet_avatar',
      },
      method: 'POST',
      token: userToken,
    });
    const started = await request('/ai/pet-avatar/jobs', {
      body: { mediaId: upload.data.mediaId },
      method: 'POST',
      token: userToken,
    });
    const readyJob = await waitForReadyJob(started.data.id, userToken);
    assert.equal(readyJob.status, 'ready');
    assert.equal(submitBodies.length, 1);
    assert.ok(submitBodies[0].prompt.includes('SMOKE_PROMPT_VERSION_MARKER'));
    assert.ok(submitBodies[0].prompt.includes('PromptLucky'));

    const adminJobs = await request('/admin/ai/avatar-jobs', { token: adminToken });
    const jobRow = adminJobs.data.find((item) => item.id === readyJob.id);
    assert.ok(jobRow, 'missing admin avatar job row');
    assert.ok(jobRow.promptVersion.startsWith(`${version.id}#`), `unexpected prompt version ${jobRow.promptVersion}`);

    const catalog = await request('/admin/exports', { token: adminToken });
    assert.equal(catalog.data.some((dataset) => dataset.type === 'ai_prompt_versions' && dataset.totalRows >= 1), true);

    const audit = await request('/admin/audit-logs?targetType=ai_prompt_version&limit=20', { token: adminToken });
    const actions = audit.data.items.map((item) => item.action);
    assert.equal(actions.includes('ai.prompt.version.create'), true);
    assert.equal(actions.includes('ai.prompt.version.draft'), true);

    console.log('AI prompt versions smoke passed');
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
