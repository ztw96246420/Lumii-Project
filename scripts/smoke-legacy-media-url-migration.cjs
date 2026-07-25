#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const TEST_PHONE = '19900008987';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-legacy-media-url-'));
const statePath = path.join(tmpDir, 'state.json');
const legacyBaseUrl = 'http://193.112.92.111';
const publicBaseUrl = 'https://media.lumiiapp.cn';
const objectKeys = {
  animation: 'pet-animation/owner/pet/video.mp4',
  avatar: 'pet-avatar/owner/pet/avatar.png',
  cover: 'pet-source/owner/pet/cover.jpg',
  post: 'pet-source/owner/pet/post.jpg',
  source: 'pet-source/owner/pet/source.jpg',
};

let backendProcess = null;
let baseUrl = '';

function storageUrl(base, objectKey) {
  return `${base}/storage/objects/${encodeURIComponent(objectKey)}`;
}

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

async function request(pathname, { body, method = 'GET', token } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    method,
  });
  const payload = await response.json();
  assert.equal(response.status, 200, `${method} ${pathname}: ${JSON.stringify(payload)}`);
  assert.equal(payload.state, 'success');
  return payload.data;
}

async function waitForBackend() {
  const deadline = Date.now() + 10_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      await request('/health');
      return;
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
      LUMII_STATE_STORAGE_DRIVER: 'json',
      PET_AVATAR_ANIMATION_PROVIDER: 'disabled',
      PET_AVATAR_PROVIDER: 'mock',
      PET_AVATAR_PUBLIC_BASE_URL: publicBaseUrl,
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
  backendProcess.stderr.on('data', (chunk) => {
    if (process.env.SMOKE_VERBOSE) process.stderr.write(chunk);
  });
  await waitForBackend();
}

async function stopBackend() {
  if (!backendProcess || backendProcess.exitCode !== null) return;
  const child = backendProcess;
  backendProcess = null;
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

async function login() {
  await request('/auth/sms/send', {
    body: { deviceId: 'legacy-media-migration-device', phone: TEST_PHONE },
    method: 'POST',
  });
  return request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 300_000, phone: TEST_PHONE },
    method: 'POST',
  });
}

function expectCanonicalUrl(value, objectKey) {
  assert.equal(value, storageUrl(publicBaseUrl, objectKey));
  assert.equal(decodeURIComponent(new URL(value).pathname.split('/storage/objects/')[1]), objectKey);
}

async function main() {
  const oldUrls = Object.fromEntries(Object.entries(objectKeys).map(([key, objectKey]) => [key, storageUrl(legacyBaseUrl, objectKey)]));
  const externalProviderUrl = 'https://provider.example/generated/result.png';
  fs.writeFileSync(statePath, JSON.stringify({
    adminAuditLogs: [{ action: 'pet.update', after: { avatarUrl: oldUrls.avatar }, id: 'audit-1' }],
    avatarAnimationJobs: {
      'animation-1': { id: 'animation-1', ownerPhone: TEST_PHONE, petId: 'pet-1', videoUrl: oldUrls.animation },
    },
    avatarJobs: {
      'job-1': { id: 'job-1', ownerPhone: TEST_PHONE, petId: 'pet-1', resultUrl: oldUrls.avatar, sourceResultUrl: externalProviderUrl },
    },
    mediaUploads: {
      'media-1': {
        mediaId: 'media-1',
        moderationStatus: 'approved',
        objectKey: objectKeys.source,
        objectUrl: oldUrls.source,
        ownerPhone: TEST_PHONE,
        previewUrl: oldUrls.source,
        source: 'pet_avatar',
      },
    },
    socialMoments: [{ id: 'moment-1', imageUrls: [oldUrls.post], phone: TEST_PHONE, status: 'published' }],
    socialReports: [{ evidenceSnapshot: { mediaUrls: [oldUrls.post] }, id: 'report-1', ownerPhone: TEST_PHONE }],
    users: {
      [TEST_PHONE]: {
        createdAt: Date.now() - 1000,
        ownerAvatarUrl: oldUrls.avatar,
        ownerName: 'LegacyMediaUser',
        pets: [{
          avatarAnimationUrl: oldUrls.animation,
          avatarUrl: oldUrls.avatar,
          id: 'pet-1',
          name: 'LegacyPet',
          petCircleCoverImageUrl: oldUrls.cover,
          species: 'dog',
        }],
        phone: TEST_PHONE,
      },
    },
  }, null, 2));

  const port = await getFreePort();
  await startBackend(port);
  try {
    const session = await login();
    const pets = await request('/pets', { token: session.token });
    expectCanonicalUrl(pets[0].avatarUrl, objectKeys.avatar);
    expectCanonicalUrl(pets[0].petCircleCoverImageUrl, objectKeys.cover);
    expectCanonicalUrl(pets[0].avatarAnimationUrl, objectKeys.animation);

    const persisted = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    expectCanonicalUrl(persisted.users[TEST_PHONE].ownerAvatarUrl, objectKeys.avatar);
    expectCanonicalUrl(persisted.mediaUploads['media-1'].objectUrl, objectKeys.source);
    expectCanonicalUrl(persisted.mediaUploads['media-1'].previewUrl, objectKeys.source);
    expectCanonicalUrl(persisted.avatarJobs['job-1'].resultUrl, objectKeys.avatar);
    expectCanonicalUrl(persisted.avatarAnimationJobs['animation-1'].videoUrl, objectKeys.animation);
    expectCanonicalUrl(persisted.socialMoments[0].imageUrls[0], objectKeys.post);
    expectCanonicalUrl(persisted.socialReports[0].evidenceSnapshot.mediaUrls[0], objectKeys.post);
    assert.equal(persisted.avatarJobs['job-1'].sourceResultUrl, externalProviderUrl, 'external provider URLs must not be rewritten');
    assert.equal(persisted.adminAuditLogs[0].after.avatarUrl, oldUrls.avatar, 'immutable audit snapshots must retain original URLs');
    console.log('legacy media URL migration smoke passed');
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  await stopBackend();
  fs.rmSync(tmpDir, { force: true, recursive: true });
  process.exit(1);
});
