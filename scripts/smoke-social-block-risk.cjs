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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-social-block-risk-'));
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
    body: { deviceId: `social-block-risk-${phone}`, phone },
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
    const targetPhone = '19900007100';
    const blockerPhones = ['19900007101', '19900007102', '19900007103'];
    const targetOwnerId = `user-${targetPhone}`;

    const targetToken = await loginUser(targetPhone);
    const blockerTokens = [];
    for (const phone of blockerPhones) blockerTokens.push(await loginUser(phone));
    const adminToken = await loginAdmin();

    await createPet(targetToken, 'BlockedPet');
    for (let index = 0; index < blockerTokens.length; index += 1) {
      await createPet(blockerTokens[index], `Blocker${index + 1}`, index === 1 ? 'cat' : 'dog');
    }

    await refreshPresence(targetToken, 22.543096, 114.057865);
    for (let index = 0; index < blockerTokens.length; index += 1) {
      await refreshPresence(blockerTokens[index], 22.5432 + index * 0.0001, 114.058);
      const visible = await request('/social/discover?lat=22.5432&lng=114.058&radiusKm=3&accuracy=25', {
        token: blockerTokens[index],
      });
      assert.ok(
        visible.data.some((item) => item.id === targetOwnerId),
        `target should be visible to blocker ${index + 1} before block`,
      );
    }

    const reasons = [
      { reason: 'spam cards from nearby feed', reasonCode: 'spam' },
      { reason: 'unsafe offline invite', reasonCode: 'unsafe' },
      { reason: 'keeps sending uncomfortable greetings', reasonCode: 'harassment' },
    ];
    for (let index = 0; index < blockerTokens.length; index += 1) {
      const result = await request('/social/blocks', {
        body: { ownerId: targetOwnerId, ...reasons[index] },
        method: 'POST',
        token: blockerTokens[index],
      });
      assert.equal(result.data?.blocked, true, `block ${index + 1} should succeed`);
      assert.equal(result.data?.ownerId, targetOwnerId, `block ${index + 1} should return target owner id`);
      assert.equal(result.data?.reasonCode, reasons[index].reasonCode, `block ${index + 1} should persist reason code`);
      assert.equal(Boolean(result.data?.riskTagApplied), index === 2, 'third unique blocker should apply risk tag');
    }

    const firstBlockList = await request('/social/blocks', { token: blockerTokens[0] });
    const firstBlock = firstBlockList.data.find((item) => item.ownerId === targetOwnerId);
    assert.equal(firstBlock?.reasonCode, 'spam', 'block list should expose reason code');
    assert.equal(firstBlock?.reasonDetail, 'spam cards from nearby feed', 'block list should expose reason detail');

    const relations = await request('/admin/social-relations?kind=block&status=blocked', { token: adminToken });
    assert.ok(relations.data?.summary?.blocks >= 3, 'admin relations summary should count block rows');
    assert.ok(relations.data?.summary?.blockedTargetUsers >= 1, 'admin relations should count blocked target users');
    assert.ok(
      (relations.data?.items || []).filter((item) => item.targetPhone === targetPhone && item.kind === 'block').length >= 3,
      'admin relations should include one block row per blocker',
    );
    const reasonKeys = new Set((relations.data?.summary?.blockReasonRows || []).map((item) => item.key));
    ['spam', 'unsafe', 'harassment'].forEach((key) => {
      assert.ok(reasonKeys.has(key), `admin reason stats should include ${key}`);
    });

    const users = await request(`/admin/users?q=${encodeURIComponent(targetPhone)}`, { token: adminToken });
    const targetUser = users.data.find((item) => item.phone === targetPhone);
    assert.ok(targetUser, 'target user should be returned from admin search');
    assert.ok(targetUser.adminRiskTags.includes('frequently_blocked'), 'target user should receive frequent block risk tag');
    assert.equal(targetUser.socialBlockStats.uniqueBlockerCount, 3, 'target user should count unique blockers');

    const timeline = await request(`/admin/users/${targetPhone}/timeline?kind=social&limit=50`, { token: adminToken });
    assert.ok(
      (timeline.data?.items || []).some((item) => item.kind === 'social' && item.targetType === 'block'),
      'admin user timeline should include social block entries',
    );

    const audit = await request('/admin/audit-logs?limit=100', { token: adminToken });
    assert.ok(
      (audit.data?.items || []).some((item) => item.action === 'user.risk_tags.auto_blocked' && item.targetId === targetPhone),
      'auto risk tag should write audit log',
    );

    console.log('social block risk smoke passed');
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
