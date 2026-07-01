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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-analytics-events-'));
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
    body: { deviceId: `analytics-smoke-${phone}`, phone },
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
      breed: 'Golden',
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

async function track(token, name, properties = {}) {
  const payload = await request('/analytics/events', {
    body: {
      appBuild: 99,
      appVersion: 'smoke',
      name,
      occurredAt: new Date().toISOString(),
      platform: 'smoke',
      properties,
      route: properties.route || 'home',
      source: 'smoke',
    },
    method: 'POST',
    token,
  });
  assert.equal(payload.data?.accepted, true, `${name} should be accepted`);
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser('19900006001');
    const adminToken = await loginAdmin();
    await createPet(userToken);

    await track(userToken, 'home.module_exposure', { count: 5, module: 'pet_hero' });
    await track(userToken, 'ai_avatar.entry_click', { remaining: 3, source: 'pet_detail' });
    await track(userToken, 'ai_avatar.start', { retry: false, source: 'start_button' });
    await track(userToken, 'ai_avatar.success', { candidateCount: 1, source: 'result_ready' });
    await track(userToken, 'ai_avatar.failure', { errorCode: 'smoke_failed', source: 'retry' });
    await track(userToken, 'discover.view', { source: 'tab_click' });
    await track(userToken, 'discover.pet_circle_loaded', { count: 4, source: 'list_loaded' });
    await track(userToken, 'pet_circle.card_exposure', { count: 4, source: 'discover_load' });
    await track(userToken, 'pet_circle.like_click', { nextLiked: true, source: 'discover_card' });
    await track(userToken, 'pet_circle.comment_click', { source: 'discover_card' });
    await track(userToken, 'pet_circle.greeting_click', { source: 'discover_card' });
    await track(userToken, 'pet_circle.walk_invite_click', { source: 'owner_sheet' });
    await track(userToken, 'config.announcement_impression', { actionRoute: 'discover', hasActionRoute: true, version: 'smoke-announcement' });
    await track(userToken, 'config.announcement_action', { action: 'primary', actionRoute: 'discover', hasActionRoute: true, version: 'smoke-announcement' });
    await track(userToken, 'config.splash_impression', { actionRoute: 'home', hasActionRoute: true, version: 'smoke-splash' });
    await track(userToken, 'config.splash_action', { action: 'primary', actionRoute: 'home', hasActionRoute: true, version: 'smoke-splash' });
    await track(userToken, 'config.update_impression', { force: false, latestVersion: '9.9.9', minVersion: '1.0.0', version: '9.9.9' });
    await track(userToken, 'config.update_action', { action: 'primary', force: false, latestVersion: '9.9.9', minVersion: '1.0.0', urlConfigured: true, version: '9.9.9' });

    const invalid = await request('/analytics/events', {
      body: { name: 'unknown.event' },
      expectedStatus: 400,
      method: 'POST',
      token: userToken,
    });
    assert.equal(invalid.state, 'error');

    const analytics = await request('/admin/analytics?days=7', { token: adminToken });
    const summary = analytics.data.summary;
    assert.equal(summary.events.homeModuleExposures, 5);
    assert.equal(summary.events.petCircleCardExposures, 4);
    assert.equal(summary.ai.avatarEntryClicks, 1);
    assert.equal(summary.ai.avatarFrontendStarts, 1);
    assert.equal(summary.ai.avatarFrontendSuccesses, 1);
    assert.equal(summary.ai.avatarFrontendFailures, 1);
    assert.equal(summary.social.cardExposures, 4);
    assert.equal(summary.social.likeClicks, 1);
    assert.equal(summary.social.commentClicks, 1);
    assert.equal(summary.social.greetingClicks, 1);
    assert.equal(summary.social.walkInviteClicks, 1);
    assert.equal(summary.configPrompts.announcementImpressions, 1);
    assert.equal(summary.configPrompts.announcementActions, 1);
    assert.equal(summary.configPrompts.splashImpressions, 1);
    assert.equal(summary.configPrompts.splashActions, 1);
    assert.equal(summary.configPrompts.updateImpressions, 1);
    assert.equal(summary.configPrompts.updateActions, 1);
    assert.equal(summary.configPrompts.totalImpressions, 3);
    assert.equal(summary.configPrompts.totalActions, 3);
    assert.equal(summary.configPrompts.totalActionRate, 100);
    assert.ok(Array.isArray(analytics.data.funnels), 'funnels should be returned');
    const aiFunnel = analytics.data.funnels.find((item) => item.key === 'aiAvatar');
    assert.ok(aiFunnel, 'AI funnel should exist');
    assert.equal(aiFunnel.steps[0].users, 1);
    assert.equal(aiFunnel.steps[1].users, 1);
    assert.equal(aiFunnel.steps[2].users, 1);
    const petCircleFunnel = analytics.data.funnels.find((item) => item.key === 'petCircle');
    assert.ok(petCircleFunnel, 'pet circle funnel should exist');
    assert.equal(petCircleFunnel.steps[0].users, 1);
    assert.equal(petCircleFunnel.steps[1].users, 1);
    assert.equal(petCircleFunnel.steps[2].users, 1);
    assert.equal(petCircleFunnel.steps[3].users, 1);
    assert.ok(analytics.data.cohorts?.rows?.length, 'cohort rows should be returned');
    assert.equal(analytics.data.cohorts.rows[0].d0.rate, 100);
    assert.ok(analytics.data.eventDetail?.items?.length >= 1, 'event details should be returned');
    assert.ok(analytics.data.buckets.some((bucket) => bucket.homeModuleExposures === 5), 'bucket should include home exposure count');
    assert.ok(analytics.data.buckets.some((bucket) => bucket.petCircleCardExposures === 4), 'bucket should include pet circle card exposure count');
    assert.ok(analytics.data.buckets.some((bucket) => bucket.configAnnouncementImpressions === 1 && bucket.configUpdateActions === 1), 'bucket should include config prompt events');

    const filtered = await request('/admin/analytics?days=7&eventName=pet_circle.card_exposure&source=smoke&q=discover_load', { token: adminToken });
    assert.equal(filtered.data.eventDetail.summary.matched, 1);
    assert.equal(filtered.data.eventDetail.items[0].name, 'pet_circle.card_exposure');
    assert.equal(filtered.data.eventDetail.items[0].source, 'smoke');

    console.log('analytics events smoke passed');
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
