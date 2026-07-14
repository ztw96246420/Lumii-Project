#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-place-public-reviews-'));
const statePath = path.join(tmpDir, 'state.json');
const TEST_CODE = '962464';
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
let baseUrl = '';
let backendProcess = null;

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
    body: { deviceId: `place-public-review-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing user token for ${phone}`);
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

async function uploadPlaceReviewImage(token, fileName) {
  const payload = await request('/media/uploads', {
    body: { base64: TINY_PNG_BASE64, fileName, mimeType: 'image/png', source: 'place_review' },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.fileUrl);
  return payload.data.fileUrl;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const reviewerToken = await loginUser('19900004001');
    const reporterToken = await loginUser('19900004002');
    const observerToken = await loginUser('19900004003');
    const photoReviewerToken = await loginUser('19900004004');
    const adminToken = await loginAdmin();

    const nearby = await request('/places/nearby', { token: reviewerToken });
    const place = nearby.data?.find((item) => item?.id);
    assert.ok(place?.id, 'expected at least one place');

    const placeReport = await request(`/places/${encodeURIComponent(place.id)}/report`, {
      body: { content: 'Smoke report incorrect place address and pet-friendly tags' },
      method: 'POST',
      token: reporterToken,
    });
    assert.equal(placeReport.data.reported, true);
    assert.equal(placeReport.data.targetType, 'place');
    assert.equal(placeReport.data.targetId, place.id);

    const placeReports = await request('/admin/social/reports', { token: adminToken });
    const adminPlaceReport = placeReports.data.find((item) => item.id === placeReport.data.id);
    assert.equal(adminPlaceReport?.targetType, 'place');
    assert.equal(adminPlaceReport?.evidenceSnapshot?.targetType, 'place');
    assert.ok(adminPlaceReport?.evidenceSnapshot?.targetLabel, 'place report should include a target label');
    assert.ok(adminPlaceReport?.evidenceSnapshot?.contentText.includes(place.name), 'place report snapshot should include place name');

    const placeReportTaskId = `report:${placeReport.data.id}`;
    const placeReportTasks = await request('/admin/moderation/tasks?status=all', { token: adminToken });
    const placeReportTask = placeReportTasks.data.tasks.find((item) => item.id === placeReportTaskId);
    assert.ok(placeReportTask, 'place report should enter moderation tasks');
    assert.equal(placeReportTask.targetType, 'place');
    assert.ok(placeReportTask.actions.some((item) => item.action === 'valid'), 'place report task should allow valid action');
    assert.equal(placeReportTask.actions.some((item) => item.action === 'hide'), false, 'place report should not expose direct hide action');
    assert.ok(placeReportTasks.data.summary.places >= 1, 'place report should count as a place moderation task');

    const correctedAddress = `${place.address} Smoke corrected`;
    const correctedPlace = await request(`/admin/social/reports/${encodeURIComponent(placeReport.data.id)}/correct-place`, {
      body: {
        address: correctedAddress,
        category: place.category || 'other',
        name: place.name,
        petFriendlyStatus: 'verified',
        reason: 'Smoke corrects place information from report',
        supportedSpecies: place.supportedSpecies || ['cat', 'dog'],
        tags: place.tags || ['smoke corrected'],
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(correctedPlace.data.report.status, 'valid');
    assert.equal(correctedPlace.data.report.sanctionSuggestion, null, 'place catalog report should not generate user sanction suggestion');
    assert.equal(correctedPlace.data.place.address, correctedAddress);

    const correctedPlaceDetail = await request(`/places/${encodeURIComponent(place.id)}`, { token: observerToken });
    assert.equal(correctedPlaceDetail.data.address, correctedAddress, 'mobile place detail should read admin-corrected address');

    const submitted = await request(`/places/${encodeURIComponent(place.id)}/reviews`, {
      body: { content: 'Smoke public review: clean grass, friendly staff, clear leash area.' },
      method: 'POST',
      token: reviewerToken,
    });
    assert.equal(submitted.data.status, 'pending_review');

    const hiddenBeforeApprove = await request(`/places/${encodeURIComponent(place.id)}/reviews`, { token: reporterToken });
    assert.equal(hiddenBeforeApprove.data.some((item) => item.id === submitted.data.id), false);

    const approved = await request(`/admin/places/reviews/${encodeURIComponent(submitted.data.id)}/approve`, {
      body: { reason: 'Smoke approve public place review' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approved.data.status, 'approved');

    await delay(20);
    const placeReviewImageUrl = await uploadPlaceReviewImage(photoReviewerToken, 'place-review-photo.png');
    const photoSubmitted = await request(`/places/${encodeURIComponent(place.id)}/reviews`, {
      body: {
        content: 'Smoke public review with photo: clear fenced lawn and water bowl.',
        imageUrls: [placeReviewImageUrl],
      },
      method: 'POST',
      token: photoReviewerToken,
    });
    assert.equal(photoSubmitted.data.status, 'pending_review');
    assert.equal(photoSubmitted.data.imageUrls.length, 1);
    const photoApproved = await request(`/admin/places/reviews/${encodeURIComponent(photoSubmitted.data.id)}/approve`, {
      body: { reason: 'Smoke approve public place review with photo' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(photoApproved.data.status, 'approved');

    const publicReviews = await request(`/places/${encodeURIComponent(place.id)}/reviews`, { token: reporterToken });
    const visibleReview = publicReviews.data.find((item) => item.id === submitted.data.id);
    assert.ok(visibleReview, 'approved review should appear in public place reviews');
    assert.equal(visibleReview.status, 'approved');
    assert.equal(visibleReview.content, submitted.data.content);
    assert.ok(visibleReview.ownerName, 'public review should include a display owner name');
    assert.equal(Object.hasOwn(visibleReview, 'ownerPhone'), false, 'public review must not expose ownerPhone');
    assert.equal(publicReviews.data[0].id, photoSubmitted.data.id, 'newest approved review should appear first by default');

    const publishedConfig = await request('/admin/config', {
      body: {
        places: {
          contributionBadgeMinPoints: 1,
          contributionBadgesEnabled: false,
          publicReviews: {
            apiLimit: 5,
            detailDisplayLimit: 2,
            requirePhotos: true,
            sort: 'with_photos_first',
          },
        },
        reason: 'Smoke configure place public review policy',
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(publishedConfig.data.places.publicReviews.requirePhotos, true);
    assert.equal(publishedConfig.data.places.publicReviews.sort, 'with_photos_first');
    assert.equal(publishedConfig.data.places.publicReviews.apiLimit, 5);
    assert.equal(publishedConfig.data.places.publicReviews.detailDisplayLimit, 2);

    const appConfig = await request('/app/config');
    assert.equal(appConfig.data.places.publicReviews.requirePhotos, true);
    assert.equal(appConfig.data.places.publicReviews.sort, 'with_photos_first');
    assert.equal(appConfig.data.places.publicReviews.apiLimit, 5);
    assert.equal(appConfig.data.places.publicReviews.detailDisplayLimit, 2);

    const photoOnlyReviews = await request(`/places/${encodeURIComponent(place.id)}/reviews`, { token: reporterToken });
    assert.ok(photoOnlyReviews.data.some((item) => item.id === photoSubmitted.data.id), 'photo review should remain public when photo-only is enabled');
    assert.equal(photoOnlyReviews.data.some((item) => item.id === submitted.data.id), false, 'photo-only policy should hide text-only public reviews');

    const report = await request(`/places/reviews/${encodeURIComponent(photoSubmitted.data.id)}/report`, {
      body: { content: 'Smoke report place review' },
      method: 'POST',
      token: reporterToken,
    });
    assert.equal(report.data.reported, true);
    assert.equal(report.data.targetType, 'place_review');

    const hiddenForReporter = await request(`/places/${encodeURIComponent(place.id)}/reviews`, { token: reporterToken });
    assert.equal(hiddenForReporter.data.some((item) => item.id === photoSubmitted.data.id), false, 'reported review should be hidden for reporter');

    const reports = await request('/admin/social/reports', { token: adminToken });
    const adminReport = reports.data.find((item) => item.id === report.data.id);
    assert.equal(adminReport?.targetType, 'place_review');
    assert.equal(adminReport?.evidenceSnapshot?.targetType, 'place_review');
    assert.equal(adminReport?.evidenceSnapshot?.contentText, photoSubmitted.data.content);

    const taskId = `report:${report.data.id}`;
    const tasks = await request('/admin/moderation/tasks?status=all', { token: adminToken });
    const task = tasks.data.tasks.find((item) => item.id === taskId);
    assert.ok(task, 'place review report should enter moderation tasks');
    assert.ok(task.actions.some((item) => item.action === 'hide'), 'place review report task should allow hide action');

    const hiddenTask = await request(`/admin/moderation/tasks/${encodeURIComponent(taskId)}/hide`, {
      body: { reason: 'Smoke hide reported place review' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(hiddenTask.data.status, 'approved');

    const hiddenForObserver = await request(`/places/${encodeURIComponent(place.id)}/reviews`, { token: observerToken });
    assert.equal(hiddenForObserver.data.some((item) => item.id === photoSubmitted.data.id), false, 'admin hidden review should be removed globally');

    console.log('place public review smoke passed');
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
