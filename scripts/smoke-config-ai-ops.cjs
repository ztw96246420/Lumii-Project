#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-config-ai-ops-'));
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
      DEEPSEEK_API_KEY: 'smoke-deepseek-key',
      GPT_IMAGE2_API_KEY: 'smoke-gpt-image2-key',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
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

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const initial = await request('/admin/config', { token: adminToken });
    assert.equal(initial.data.ai.avatar.provider, 'gpt-image-2');
    assert.equal(initial.data.aiRuntime.credentials.gptImage2, true);
    assert.ok(initial.data.aiRuntime.petAvatar.providers.some((item) => item.provider === 'gpt-image-2' && item.promptPreview.includes('dog')));
    assert.ok(initial.data.aiRuntime.petChat.providers.some((item) => item.provider === 'deepseek' && item.promptPreview.includes('当前宠物本人')));

    const promptTemplate = 'Smoke prompt: exact same {species}; breed hint {breed}; pet {petName}; no generic breed.';
    const baseSystemPrompt = 'Smoke system prompt: you are the current pet itself, reply in first person.';
    const published = await request('/admin/config', {
      body: {
        ai: {
          avatar: {
            gptImage2: {
              model: 'gpt-image-2-smoke',
              promptTemplate,
              resolution: '4k',
              size: '1:1',
            },
            provider: 'mock',
          },
          petChat: {
            deepseek: {
              baseSystemPrompt,
              maxTokens: 321,
              model: 'deepseek-smoke',
              temperature: 0.42,
              thinking: 'disabled',
            },
            provider: 'fallback',
          },
        },
        reason: 'smoke publish ai ops config',
        riskAcknowledged: true,
        riskConfirmText: '确认发布高风险配置',
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(published.data.ai.avatar.provider, 'mock');
    assert.equal(published.data.ai.avatar.gptImage2.model, 'gpt-image-2-smoke');
    assert.equal(published.data.ai.avatar.gptImage2.promptTemplate, promptTemplate);
    assert.equal(published.data.ai.petChat.provider, 'fallback');
    assert.equal(published.data.ai.petChat.deepseek.baseSystemPrompt, baseSystemPrompt);
    assert.ok(published.data.revisions[0].changeSummary.some((item) => item.key === 'ai.avatar.provider'));
    assert.ok(published.data.aiRuntime.petAvatar.providers.some((item) => item.provider === 'gpt-image-2' && item.promptPreview.includes('breed hint dog')));

    const appConfig = await request('/app/config');
    assert.equal(appConfig.data.ai.petAvatarDailyLimit, published.data.ai.petAvatarDailyLimit);
    assert.equal(appConfig.data.ai.petChatDailyLimit, published.data.ai.petChatDailyLimit);
    assert.equal(appConfig.data.ai.avatar, undefined, 'public app config must not expose AI prompt/provider internals');
    assert.equal(appConfig.data.ai.petChat, undefined, 'public app config must not expose DeepSeek prompt internals');
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
