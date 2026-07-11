#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-readiness-safety-'));
const statePath = path.join(tmpDir, 'state.json');
const confirmText = '确认发布高风险配置';
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
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '1000',
      SMS_DEVICE_DAILY_LIMIT: '1000',
      SMS_IP_DAILY_LIMIT: '1000',
      TENCENTCLOUD_SECRET_ID: 'AKID_SMOKE_CONTENT_SAFETY',
      TENCENTCLOUD_SECRET_KEY: 'SMOKE_CONTENT_SAFETY_SECRET',
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

async function loginAdmin() {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing admin token');
  return payload.data.token;
}

function rowByKey(rows, key) {
  return (rows || []).find((row) => row.key === key || row.id === key);
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    const initial = await request('/admin/launch/readiness', { token: adminToken });
    assert.notEqual(rowByKey(initial.data.gaps, 'content_model')?.status, 'ready', 'content model should not be ready before moderation switches are enabled');

    const configPayload = await request('/admin/config', {
      body: {
        moderation: {
          enabled: true,
          machineImageEnabled: true,
          machineTextEnabled: true,
        },
        reason: 'enable content safety readiness smoke',
        riskAcknowledged: true,
        riskConfirmText: confirmText,
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(configPayload.data.contentSafety.credentialsConfigured, true);
    assert.equal(configPayload.data.contentSafety.text.enabled, true);
    assert.equal(configPayload.data.contentSafety.image.enabled, true);
    assert.ok(configPayload.data.contentSafety.image.bizTypes.some((item) => item.scope === 'place_review' && item.bizType), 'place review image Biztype should be listed');
    assert.ok(configPayload.data.contentSafety.image.bizTypes.some((item) => item.scope === 'place_submission' && item.bizType), 'place submission image Biztype should be listed');

    const appConfig = await request('/app/config');
    assert.equal(appConfig.data.moderation.enabled, true);
    assert.equal(appConfig.data.moderation.machineImageEnabled, true);
    assert.equal(appConfig.data.moderation.machineTextEnabled, true);
    assert.equal(appConfig.data.moderation.textRulesEnabled, true);
    assert.equal(typeof appConfig.data.moderation.reviewMessage, 'string');
    assert.equal(Object.hasOwn(appConfig.data.moderation, 'blockKeywords'), false, 'app config must not expose block keywords');
    assert.equal(Object.hasOwn(appConfig.data.moderation, 'highRiskKeywords'), false, 'app config must not expose high-risk keywords');
    assert.equal(Object.hasOwn(appConfig.data.moderation, 'reviewKeywords'), false, 'app config must not expose review keywords');

    const readiness = await request('/admin/launch/readiness', { token: adminToken });
    const contentModel = rowByKey(readiness.data.gaps, 'content_model');
    const imageModeration = rowByKey(readiness.data.gaps, 'image_moderation');
    const accountLifecycle = rowByKey(readiness.data.gaps, 'account_lifecycle');
    assert.equal(contentModel.status, 'ready');
    assert.equal(imageModeration.status, 'ready');
    assert.equal(accountLifecycle.status, 'ready');
    assert.ok(accountLifecycle.evidence.includes('account_deletion_processor'));
    assert.equal(rowByKey(readiness.data.questions, 'q-safety-vendor')?.status, 'ready');
    assert.equal(rowByKey(readiness.data.questions, 'q-image-policy')?.status, 'ready');
    assert.ok(!readiness.data.gaps.filter((gap) => gap.status !== 'ready' && gap.severity === 'P0').some((gap) => gap.key === 'content_model' || gap.key === 'image_moderation'));
    const notifications = rowByKey(readiness.data.modules, 'notifications');
    assert.ok(notifications?.evidence.includes('通知人群包'), 'notification readiness evidence should mention audience packages');
    assert.ok(notifications?.evidence.includes('对象深链'), 'notification readiness evidence should mention object deep links');
    assert.ok(notifications?.evidence.includes('发送审批'), 'notification readiness evidence should mention send approval');
    assert.ok(!/灰度人群包未完成|发送审批和灰度人群包/.test(JSON.stringify(readiness.data)), 'readiness should not list notification audience packages as unfinished');
    assert.ok(!/复杂深链未完成|复杂深链参数/.test(JSON.stringify(readiness.data)), 'readiness should not list notification deep links as unfinished');
    assert.ok(!/发送审批未完成/.test(JSON.stringify(readiness.data)), 'readiness should not list notification approval as unfinished');

    console.log('launch readiness content safety smoke passed');
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
