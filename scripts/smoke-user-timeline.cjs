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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-user-timeline-'));
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
    body: { deviceId: `user-timeline-smoke-${phone}`, phone },
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
    const authorPhone = '19900006501';
    const reporterPhone = '19900006502';
    const authorToken = await loginUser(authorPhone);
    const reporterToken = await loginUser(reporterPhone);
    const adminToken = await loginAdmin();

    await createPet(authorToken, 'TimeLucky');
    await createPet(reporterToken, 'TimeMochi', 'cat');
    await refreshPresence(authorToken, 22.543096, 114.057865);
    await refreshPresence(reporterToken, 22.5433, 114.058);

    await request('/analytics/events', {
      body: {
        name: 'app.page_view',
        platform: 'android',
        properties: { screen: 'home', sourceCase: 'userTimelineSmoke' },
        route: 'home',
        source: 'smoke',
      },
      method: 'POST',
      token: authorToken,
    });

    await request('/health/memos', {
      body: {
        content: '用户时间线 smoke 备忘内容',
        reminderEnabled: false,
        repeat: 'none',
        title: '时间线备忘',
      },
      method: 'POST',
      token: authorToken,
    });

    await request('/feedback', {
      body: {
        category: 'bug',
        contact: 'timeline-smoke',
        content: '用户时间线 smoke 反馈',
      },
      method: 'POST',
      token: authorToken,
    });

    const post = await request('/social/pet-circle/posts', {
      body: {
        content: 'user timeline smoke target',
        location: { accuracy: 25, latitude: 22.543096, longitude: 114.057865, radiusKm: 3, updatedAt: Date.now() },
        visibility: 'nearby',
      },
      method: 'POST',
      token: authorToken,
    });
    assert.ok(post.data?.id, 'author post should be created');

    await request('/social/greetings', {
      body: {
        ownerId: `user-${authorPhone}`,
        postId: post.data.id,
        source: 'pet_circle',
      },
      method: 'POST',
      token: reporterToken,
    });

    const report = await request(`/social/pet-circle/posts/${encodeURIComponent(post.data.id)}/report`, {
      body: { content: '用户时间线 smoke 举报' },
      method: 'POST',
      token: reporterToken,
    });
    assert.equal(report.data?.reported, true);

    await request(`/admin/social/reports/${encodeURIComponent(report.data.id)}/resolve`, {
      body: { reason: 'User timeline smoke report is valid', status: 'valid' },
      method: 'POST',
      token: adminToken,
    });

    const applied = await request(`/admin/social/reports/${encodeURIComponent(report.data.id)}/sanction`, {
      body: { reason: 'User timeline smoke sanction applied', templateId: 'report_valid_mute_24h' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(applied.data?.sanction?.source, 'social_report');

    const timeline = await request(`/admin/users/${authorPhone}/timeline?limit=200`, { token: adminToken });
    const items = timeline.data?.items || [];
    const kinds = new Set(items.map((item) => item.kind));
    assert.equal(timeline.data?.user?.phone, authorPhone);
    ['account', 'pet', 'health', 'content', 'social', 'safety', 'support', 'notification', 'event'].forEach((kind) => {
      assert.ok(kinds.has(kind), `timeline should include ${kind}`);
      assert.ok(Number(timeline.data?.summary?.[kind] || 0) > 0, `summary should count ${kind}`);
    });
    assert.ok(items.some((item) => item.targetId === post.data.id && item.kind === 'content'), 'post should be in content timeline');
    assert.ok(items.some((item) => item.targetId === applied.data.sanction.id && item.kind === 'safety'), 'sanction should be in safety timeline');
    assert.ok(items.some((item) => item.kind === 'notification' && item.targetId === applied.data.sanction.id), 'sanction notification should be in timeline');

    const safetyTimeline = await request(`/admin/users/${authorPhone}/timeline?kind=safety&limit=50`, { token: adminToken });
    assert.ok((safetyTimeline.data?.items || []).length >= 2, 'safety filter should return report and sanction');
    assert.ok((safetyTimeline.data?.items || []).every((item) => item.kind === 'safety'), 'safety filter should only return safety items');

    const contentTimeline = await request(`/admin/users/${authorPhone}/timeline?kind=content&limit=50`, { token: adminToken });
    assert.ok((contentTimeline.data?.items || []).length >= 1, 'content filter should return content items');
    assert.ok((contentTimeline.data?.items || []).every((item) => item.kind === 'content'), 'content filter should only return content items');

    console.log('user timeline smoke passed');
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
