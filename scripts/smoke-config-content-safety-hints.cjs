#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-config-safety-hints-'));
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
    const token = await loginAdmin();

    await request('/admin/config', {
      body: {
        moderation: {
          blockKeywords: 'secret-block-word',
          enabled: true,
          highRiskKeywords: 'secret-review-word',
          machineImageEnabled: true,
          machineTextEnabled: true,
          publicHint: {
            commentText: '评论发布前会进行安全校验',
            enabled: true,
            imageText: '图片上传前会进行安全校验',
            placeText: '地点内容提交前会进行安全校验',
            postText: '小事发布前会进行安全校验',
          },
          reviewKeywords: 'secret-sample-word',
          textRulesEnabled: true,
        },
        reason: 'publish content safety public hint smoke',
        riskAcknowledged: true,
        riskConfirmText: '确认发布高风险配置',
      },
      method: 'PATCH',
      token,
    });

    const publicConfig = await request('/app/config');
    assert.equal(publicConfig.data.moderation.enabled, true);
    assert.equal(publicConfig.data.moderation.machineImageEnabled, true);
    assert.equal(publicConfig.data.moderation.machineTextEnabled, true);
    assert.deepEqual(publicConfig.data.moderation.publicHint, {
      commentText: '评论发布前会进行安全校验',
      enabled: true,
      imageText: '图片上传前会进行安全校验',
      placeText: '地点内容提交前会进行安全校验',
      postText: '小事发布前会进行安全校验',
    });
    assert.equal(publicConfig.data.moderation.blockKeywords, undefined);
    assert.equal(publicConfig.data.moderation.highRiskKeywords, undefined);
    assert.equal(publicConfig.data.moderation.reviewKeywords, undefined);

    await request('/admin/config', {
      body: {
        moderation: {
          enabled: true,
          publicHint: { enabled: false, postText: 'hidden public hint' },
        },
        reason: 'disable content safety public hint smoke',
      },
      method: 'PATCH',
      token,
    });

    const publicAfterDisable = await request('/app/config');
    assert.equal(publicAfterDisable.data.moderation.publicHint.enabled, false);
    assert.equal(publicAfterDisable.data.moderation.publicHint.postText, 'hidden public hint');

    console.log('smoke-config-content-safety-hints: ok');
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  fs.rmSync(tmpDir, { force: true, recursive: true });
  console.error(error);
  process.exitCode = 1;
});
