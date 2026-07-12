#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const confirmText = '确认发布高风险配置';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-content-safety-e2e-'));
const statePath = path.join(tmpDir, 'state.json');

let backendProcess = null;
let baseUrl = '';
let tencentMockServer = null;
let tencentMockPort = 0;
let mockRequestCount = 0;

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

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function moderationSuggestionFromText(text) {
  if (/machine-block/i.test(text)) return 'Block';
  if (/machine-review/i.test(text)) return 'Review';
  return 'Pass';
}

async function startTencentMock() {
  const port = await getFreePort();
  tencentMockPort = port;
  tencentMockServer = http.createServer(async (req, res) => {
    try {
      const bodyText = await collectRequestBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};
      const action = String(req.headers['x-tc-action'] || '').toLowerCase();
      const decodedText = body.Content ? Buffer.from(String(body.Content), 'base64').toString('utf8') : '';
      const decodedImage = body.FileContent ? Buffer.from(String(body.FileContent), 'base64').toString('utf8') : '';
      const inspectionText = [action, decodedText, decodedImage, body.DataId, body.FileUrl, body.BizType].filter(Boolean).join(' ');
      const suggestion = moderationSuggestionFromText(inspectionText);
      mockRequestCount += 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        Response: {
          Keywords: suggestion === 'Pass' ? [] : ['machine-smoke'],
          Label: suggestion === 'Pass' ? 'Normal' : (action.includes('image') ? 'ImageRisk' : 'TextRisk'),
          RequestId: `mock-cms-${mockRequestCount}`,
          Score: suggestion === 'Block' ? 96 : suggestion === 'Review' ? 73 : 0,
          Suggestion: suggestion,
        },
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ Response: { Error: { Message: String(error?.message || error) } } }));
    }
  });
  await new Promise((resolve, reject) => {
    tencentMockServer.once('error', reject);
    tencentMockServer.listen(port, '127.0.0.1', resolve);
  });
}

async function stopTencentMock() {
  if (!tencentMockServer) return;
  const server = tencentMockServer;
  tencentMockServer = null;
  await new Promise((resolve) => server.close(resolve));
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
      TENCENTCLOUD_SECRET_ID: 'AKID_SMOKE_CONTENT_SAFETY_E2E',
      TENCENTCLOUD_SECRET_KEY: 'SMOKE_CONTENT_SAFETY_E2E_SECRET',
      TENCENT_CMS_IMAGE_ENDPOINT: `http://127.0.0.1:${tencentMockPort}/tencent`,
      TENCENT_CMS_TEXT_ENDPOINT: `http://127.0.0.1:${tencentMockPort}/tencent`,
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

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `content-safety-e2e-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing user token for ${phone}`);
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

function location(latitude, longitude, radiusKm = 3) {
  return { accuracy: 30, latitude, longitude, radiusKm, updatedAt: Date.now() };
}

function pngDataUrlWithMarker(marker) {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const payload = Buffer.concat([pngHeader, Buffer.from(String(marker || ''), 'utf8')]);
  return `data:image/png;base64,${payload.toString('base64')}`;
}

async function refreshPresence(token, loc) {
  const query = new URLSearchParams({
    accuracy: String(loc.accuracy),
    lat: String(loc.latitude),
    lng: String(loc.longitude),
    radiusKm: String(loc.radiusKm),
  });
  await request(`/social/discover?${query}`, { token });
}

async function enableMachineModeration(adminToken) {
  const payload = await request('/admin/config', {
    body: {
      moderation: {
        enabled: true,
        machineImageEnabled: true,
        machineTextEnabled: true,
        textRulesEnabled: false,
      },
      reason: 'content safety e2e smoke enables machine moderation',
      riskAcknowledged: true,
      riskConfirmText: confirmText,
    },
    method: 'PATCH',
    token: adminToken,
  });
  assert.equal(payload.data.contentSafety.credentialsConfigured, true);
  assert.equal(payload.data.contentSafety.text.enabled, true);
  assert.equal(payload.data.contentSafety.image.enabled, true);
}

function findTask(tasksPayload, predicate, message) {
  const task = tasksPayload.data.tasks.find(predicate);
  assert.ok(task, message);
  return task;
}

async function adminTasks(adminToken) {
  return request('/admin/moderation/tasks?status=all', { token: adminToken });
}

async function main() {
  await startTencentMock();
  const port = await getFreePort();
  await startBackend(port);
  try {
    const adminToken = await loginAdmin();
    await enableMachineModeration(adminToken);

    const ownerToken = await loginUser('19900006001');
    const commenterToken = await loginUser('19900006002');
    await createPet(ownerToken, 'Safety');
    await createPet(commenterToken, 'Reviewer', 'cat');
    const ownerLocation = location(22.5431, 114.0579);
    const commenterLocation = location(22.5437, 114.0584);
    await refreshPresence(ownerToken, ownerLocation);
    await refreshPresence(commenterToken, commenterLocation);

    const reviewPost = await request('/social/pet-circle/posts', {
      body: {
        content: 'machine-review social post from content safety smoke',
        location: ownerLocation,
        visibility: 'nearby',
      },
      method: 'POST',
      token: ownerToken,
    });
    assert.equal(reviewPost.data.moderationStatus, 'pending_review');
    const hiddenBeforeApprove = await request('/social/pet-circle/posts', { token: ownerToken });
    assert.equal(hiddenBeforeApprove.data.items.some((item) => item.id === reviewPost.data.id), false);

    let tasks = await adminTasks(adminToken);
    const postTask = findTask(
      tasks,
      (item) => item.id === `post:${reviewPost.data.id}` && item.source === 'tencent_cms',
      'Tencent review pet circle post should enter moderation tasks',
    );
    assert.equal(postTask.status, 'pending');
    assert.ok(postTask.actions.some((item) => item.action === 'approve'));

    await request(`/admin/moderation/tasks/${encodeURIComponent(postTask.id)}/approve`, {
      body: { reason: 'Smoke approves Tencent-reviewed pet circle post' },
      method: 'POST',
      token: adminToken,
    });
    const visibleAfterApprove = await request('/social/pet-circle/posts', { token: ownerToken });
    const visibleAfterApproveIds = visibleAfterApprove.data.items.map((item) => item.id);
    const stateAfterPostApprove = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const storedReviewPost = stateAfterPostApprove.socialMoments.find((item) => item.id === reviewPost.data.id);
    assert.ok(
      visibleAfterApproveIds.includes(reviewPost.data.id),
      `approved post should be visible: ${JSON.stringify({
        configuredRadiusKm: stateAfterPostApprove.opsConfig?.social?.discoverRadiusKm,
        ownerLocation: stateAfterPostApprove.users?.['19900006001']?.location,
        postLocation: storedReviewPost?.location,
        postStatus: storedReviewPost?.status,
        visibleAfterApproveIds,
      })}`,
    );
    const notificationsAfterPostApprove = await request('/notifications', { token: ownerToken });
    const postApproveNotification = notificationsAfterPostApprove.data.find((item) => item.id === `n-pet-circle-moderation-${reviewPost.data.id}-approved`);
    assert.ok(postApproveNotification, 'approved pet circle post should notify its author');
    assert.equal(postApproveNotification.actionRoute, 'petCircleProfile');
    assert.equal(postApproveNotification.targetId, reviewPost.data.id);
    assert.equal(postApproveNotification.postId, undefined, 'moderation result should route to owner archive instead of a public-only post deep link');

    const rejectedReviewPost = await request('/social/pet-circle/posts', {
      body: {
        content: 'machine-review rejected social post from content safety smoke',
        location: ownerLocation,
        visibility: 'nearby',
      },
      method: 'POST',
      token: ownerToken,
    });
    assert.equal(rejectedReviewPost.data.moderationStatus, 'pending_review');
    tasks = await adminTasks(adminToken);
    const rejectedPostTask = findTask(
      tasks,
      (item) => item.id === `post:${rejectedReviewPost.data.id}` && item.source === 'tencent_cms',
      'second Tencent review pet circle post should enter moderation tasks',
    );
    const rejectedReason = 'Smoke rejects this pet circle post';
    await request(`/admin/moderation/tasks/${encodeURIComponent(rejectedPostTask.id)}/hide`, {
      body: { reason: rejectedReason },
      method: 'POST',
      token: adminToken,
    });
    const ownerProfileAfterPostReject = await request('/social/pet-circle/profiles/me/posts', { token: ownerToken });
    const rejectedProfilePost = ownerProfileAfterPostReject.data.items.find((item) => item.id === rejectedReviewPost.data.id);
    assert.equal(rejectedProfilePost?.moderationStatus, 'rejected', 'author archive should retain a rejected post');
    assert.equal(rejectedProfilePost?.moderationReason, rejectedReason, 'author archive should expose the moderation reason');
    const viewerFeedAfterPostReject = await request('/social/pet-circle/posts', { token: commenterToken });
    assert.equal(viewerFeedAfterPostReject.data.items.some((item) => item.id === rejectedReviewPost.data.id), false, 'rejected post must stay hidden from other users');
    const notificationsAfterPostReject = await request('/notifications', { token: ownerToken });
    const postRejectNotification = notificationsAfterPostReject.data.find((item) => item.id === `n-pet-circle-moderation-${rejectedReviewPost.data.id}-rejected`);
    assert.ok(postRejectNotification, 'rejected pet circle post should notify its author');
    assert.equal(postRejectNotification.actionRoute, 'petCircleProfile');
    assert.match(postRejectNotification.text, /Smoke rejects this pet circle post/);

    const blockedPost = await request('/social/pet-circle/posts', {
      body: {
        content: 'machine-block social post from content safety smoke',
        location: ownerLocation,
        visibility: 'nearby',
      },
      expectedStatus: 400,
      method: 'POST',
      token: ownerToken,
    });
    assert.equal(blockedPost.state, 'error');

    const reviewComment = await request(`/social/pet-circle/posts/${encodeURIComponent(reviewPost.data.id)}/comments`, {
      body: { content: 'machine-review comment from content safety smoke' },
      method: 'POST',
      token: commenterToken,
    });
    assert.equal(reviewComment.data.some((item) => /machine-review comment/.test(item.content)), false);
    tasks = await adminTasks(adminToken);
    const commentTask = findTask(
      tasks,
      (item) => item.kind === 'pet_circle_comment' && item.contentText.includes('machine-review comment') && item.source === 'tencent_cms',
      'Tencent review pet circle comment should enter moderation tasks',
    );
    await request(`/admin/moderation/tasks/${encodeURIComponent(commentTask.id)}/approve`, {
      body: { reason: 'Smoke approves Tencent-reviewed pet circle comment' },
      method: 'POST',
      token: adminToken,
    });
    const commentsAfterApprove = await request(`/social/pet-circle/posts/${encodeURIComponent(reviewPost.data.id)}/comments`, { token: ownerToken });
    assert.ok(commentsAfterApprove.data.some((item) => /machine-review comment/.test(item.content)));

    const imageReviewUpload = await request('/media/uploads', {
      body: {
        base64: pngDataUrlWithMarker('machine-review-image-content'),
        fileName: 'machine-review-image.png',
        mimeType: 'image/png',
        source: 'pet_circle_photo',
      },
      method: 'POST',
      token: ownerToken,
    });
    assert.equal(imageReviewUpload.data.moderationStatus, 'pending_review');
    await request('/social/pet-circle/posts', {
      body: {
        content: 'normal post with pending image should be blocked',
        imageUrls: [imageReviewUpload.data.fileUrl],
        location: ownerLocation,
        visibility: 'nearby',
      },
      expectedStatus: 400,
      method: 'POST',
      token: ownerToken,
    });
    tasks = await adminTasks(adminToken);
    const mediaTask = findTask(
      tasks,
      (item) => item.id === `media:${imageReviewUpload.data.mediaId}` && item.status === 'pending',
      'Tencent review media upload should enter moderation tasks',
    );
    assert.equal(mediaTask.source, 'pet_circle_photo');

    const imageBlockUpload = await request('/media/uploads', {
      body: {
        base64: pngDataUrlWithMarker('machine-block-image-content'),
        fileName: 'machine-block-image.png',
        mimeType: 'image/png',
        source: 'pet_circle_photo',
      },
      method: 'POST',
      token: ownerToken,
    });
    assert.equal(imageBlockUpload.data.moderationStatus, 'rejected');

    const nearbyPlaces = await request('/places/nearby', { token: ownerToken });
    const place = nearbyPlaces.data.find((item) => item?.id);
    assert.ok(place?.id, 'expected seed place for place review moderation');
    const placeReview = await request(`/places/${encodeURIComponent(place.id)}/reviews`, {
      body: { content: 'machine-review place review from content safety smoke' },
      method: 'POST',
      token: ownerToken,
    });
    assert.equal(placeReview.data.status, 'pending_review');
    tasks = await adminTasks(adminToken);
    const placeReviewTask = findTask(
      tasks,
      (item) => item.id === `placeReview:${placeReview.data.id}` && item.source === 'tencent_cms',
      'Tencent review place review should enter moderation tasks',
    );
    assert.ok(placeReviewTask.actions.some((item) => item.action === 'approve'));

    const blockedPlaceReview = await request(`/places/${encodeURIComponent(place.id)}/reviews`, {
      body: { content: 'machine-block place review from content safety smoke' },
      expectedStatus: 400,
      method: 'POST',
      token: commenterToken,
    });
    assert.equal(blockedPlaceReview.state, 'error');

    assert.ok(mockRequestCount >= 7, 'Tencent mock should receive text and image moderation calls');
    console.log('content safety e2e smoke passed');
  } finally {
    await stopBackend();
    await stopTencentMock();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopTencentMock();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {
    // ignore cleanup errors
  }
  console.error(error);
  process.exit(1);
});
