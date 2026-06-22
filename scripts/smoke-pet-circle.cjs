const assert = require('assert/strict');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const TEST_CODE = '962464';
const rootDir = path.resolve(__dirname, '..');
const backendScript = path.join(__dirname, 'lumii-backend.cjs');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-pet-circle-smoke-'));
const statePath = path.join(tempDir, 'state.json');

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

function dateToIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysIsoDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateToIsoDate(date);
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

async function expectApiError(pathname, { body, code, method = 'GET', status, token }) {
  const payload = await request(pathname, { body, expectedStatus: status, method, token });
  assert.equal(payload.state, 'error', `${method} ${pathname} should fail`);
  if (code) assert.equal(payload.error?.code, code, `${method} ${pathname} should fail with ${code}`);
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

async function restartBackend(port) {
  await stopBackend();
  await startBackend(port);
}

async function login(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `smoke-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.ok(payload.data?.token, `missing token for ${phone}`);
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

function location(latitude, longitude, radiusKm = 3, updatedAt = Date.now()) {
  return { accuracy: 30, latitude, longitude, radiusKm, updatedAt };
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

function loadState() {
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function patchState(mutator) {
  const state = loadState();
  mutator(state);
  saveState(state);
}

function findByTitle(items, title) {
  return items.find((item) => item.title === title);
}

function findByDetail(items, detail) {
  return items.find((item) => item.detail === detail);
}

async function run() {
  const port = await getFreePort();
  await startBackend(port);

  const ownerPhone = '13900001001';
  const viewerPhone = '13900001002';
  const farPhone = '13900001003';
  const hiddenPhone = '13900001004';
  const noLocationPhone = '13900001005';
  const interactionOffPhone = '13900001006';
  const pushOffPhone = '13900001007';

  const ownerToken = await login(ownerPhone);
  const viewerToken = await login(viewerPhone);
  const farToken = await login(farPhone);
  const hiddenToken = await login(hiddenPhone);
  const noLocationToken = await login(noLocationPhone);
  const interactionOffToken = await login(interactionOffPhone);
  const pushOffToken = await login(pushOffPhone);

  const ownerPet = await createPet(ownerToken, 'Lucky');
  await createPet(viewerToken, 'Mochi', 'cat');
  await createPet(farToken, 'Baozi');
  await createPet(hiddenToken, 'Nana', 'cat');
  await createPet(noLocationToken, 'Solo');
  await createPet(interactionOffToken, 'Quiet');
  await createPet(pushOffToken, 'Mute');

  const backdated = '2026-06-17';
  await request('/health/memos', {
    body: { content: 'backdated memo content', title: 'Backdated Memo' },
    method: 'POST',
    token: ownerToken,
  });
  patchState((state) => {
    const owner = state.users[ownerPhone];
    owner.pets[0].createdAt = `${backdated}T08:30:00.000Z`;
    const memoBucketKey = `${ownerPhone}:${ownerPet.id}`;
    const memo = state.health.memos[memoBucketKey].find((item) => item.title === 'Backdated Memo');
    assert.ok(memo, 'seed memo missing from state');
    memo.id = 'm-1790123456789-backdated';
    memo.createdAt = `${backdated}T09:15:00.000Z`;
    memo.updatedAt = new Date().toISOString();
  });
  await restartBackend(port);

  const calendar = await request('/health/calendar', { token: ownerToken });
  assert.equal(calendar.state, 'success');
  const backdatedMemoEvent = findByTitle(calendar.data, 'Backdated Memo');
  assert.equal(backdatedMemoEvent?.date, backdated, 'backdated memo should remain on its created day');
  const profileEvent = findByTitle(calendar.data, '建档记录');
  assert.equal(profileEvent?.date, backdated, 'profile seed memo should follow pet createdAt');

  const ownerLoc = location(31.2304, 121.4737);
  const viewerLoc = location(31.231, 121.474);
  const farLoc = location(31.9, 121.9);
  await refreshPresence(ownerToken, ownerLoc);
  await refreshPresence(viewerToken, viewerLoc);
  await refreshPresence(farToken, farLoc);
  await refreshPresence(hiddenToken, viewerLoc);
  await refreshPresence(interactionOffToken, ownerLoc);
  await refreshPresence(pushOffToken, ownerLoc);

  const hiddenPost = await request('/social/pet-circle/posts', {
    body: {
      content: 'hidden private post',
      visibility: 'private',
    },
    method: 'POST',
    token: hiddenToken,
  }).catch((error) => {
    throw new Error(`private post setup failed: ${error.message}`);
  });
  assert.ok(hiddenPost.data?.id, 'private post should be creatable without nearby exposure');
  const hiddenCalendar = await request('/health/calendar', { token: hiddenToken });
  assert.ok(
    findByDetail(hiddenCalendar.data, 'hidden private post'),
    'private pet circle post should be saved to health calendar',
  );

  const filteredImagePost = await request('/social/pet-circle/posts', {
    body: {
      content: 'invalid direct image urls are filtered',
      imageUrls: [
        'data:image/png;base64,AA==',
        'file:///tmp/lucky.jpg',
        'https://cdn.example.com/lumii/pet-circle/filter-ok.jpg',
        'https://cdn.example.com/lumii/pet-circle/filter-ok.jpg',
      ],
      photoCount: 4,
      visibility: 'private',
    },
    method: 'POST',
    token: hiddenToken,
  });
  assert.deepEqual(filteredImagePost.data.imageUrls, ['https://cdn.example.com/lumii/pet-circle/filter-ok.jpg'], 'pet circle should only persist deduped http image URLs');
  assert.equal(filteredImagePost.data.photoCount, 1, 'photoCount should reflect valid persisted image URLs');

  await expectApiError('/social/pet-circle/posts', {
    body: { content: 'no location nearby post', visibility: 'nearby' },
    code: 'NEARBY_LOCATION_REQUIRED',
    method: 'POST',
    status: 400,
    token: noLocationToken,
  });

  await expectApiError('/social/pet-circle/posts', {
    body: {
      content: 'stale location nearby post',
      location: location(31.2304, 121.4737, 3, Date.now() - 11 * 60 * 1000),
      visibility: 'nearby',
    },
    code: 'NEARBY_LOCATION_STALE',
    method: 'POST',
    status: 400,
    token: ownerToken,
  });

  await expectApiError('/social/pet-circle/posts', {
    body: {
      content: 'call me 13800138000 for park walk',
      location: ownerLoc,
      visibility: 'nearby',
    },
    code: 'SOCIAL_MOMENT_INVALID',
    method: 'POST',
    status: 400,
    token: ownerToken,
  });

  await expectApiError('/social/pet-circle/posts', {
    body: {
      content: 'please visit https://example.com for park walk details',
      location: ownerLoc,
      visibility: 'nearby',
    },
    code: 'SOCIAL_MOMENT_INVALID',
    method: 'POST',
    status: 400,
    token: ownerToken,
  });

  await expectApiError('/social/pet-circle/posts', {
    body: {
      content: `${'long pet circle post '.repeat(18)}tail`,
      location: ownerLoc,
      visibility: 'nearby',
    },
    code: 'SOCIAL_MOMENT_INVALID',
    method: 'POST',
    status: 400,
    token: ownerToken,
  });

  const publicPostMemoTitle = 'Circle Memo Retained';
  await request('/health/memos', {
    body: {
      content: 'health calendar record paired with a public pet circle post',
      title: publicPostMemoTitle,
    },
    method: 'POST',
    token: ownerToken,
  });

  const publicPost = await request('/social/pet-circle/posts', {
    body: {
      content: 'morning park walk with six photos',
      imageUrls: [
        'https://cdn.example.com/lumii/pet-circle/01.jpg',
        'https://cdn.example.com/lumii/pet-circle/02.jpg',
        'https://cdn.example.com/lumii/pet-circle/03.jpg',
        'https://cdn.example.com/lumii/pet-circle/04.jpg',
        'https://cdn.example.com/lumii/pet-circle/05.jpg',
        'https://cdn.example.com/lumii/pet-circle/06.jpg',
        'https://cdn.example.com/lumii/pet-circle/07.jpg',
      ],
      location: ownerLoc,
      mood: 'happy',
      photoCount: 7,
      visibility: 'nearby',
    },
    method: 'POST',
    token: ownerToken,
  });
  assert.ok(publicPost.data?.id, 'nearby post missing id');
  assert.equal(publicPost.data.imageUrls.length, 6, 'nearby post should cap images at 6');
  assert.equal(publicPost.data.photoCount, 6, 'nearby post photo count should cap at 6');

  const secondPost = await request('/social/pet-circle/posts', {
    body: {
      content: 'second nearby page smoke',
      location: ownerLoc,
      visibility: 'nearby',
    },
    method: 'POST',
    token: ownerToken,
  });
  const thirdPost = await request('/social/pet-circle/posts', {
    body: {
      content: 'third nearby page smoke',
      location: ownerLoc,
      visibility: 'nearby',
    },
    method: 'POST',
    token: ownerToken,
  });
  assert.ok(secondPost.data?.id && thirdPost.data?.id, 'pagination seed posts should be created');
  const expiredOwnPost = await request('/social/pet-circle/posts', {
    body: {
      content: 'expired own post should not remain in pet circle',
      location: ownerLoc,
      visibility: 'nearby',
    },
    method: 'POST',
    token: ownerToken,
  });
  assert.ok(expiredOwnPost.data?.id, 'expired own post seed should be created');
  patchState((state) => {
    const moment = state.socialMoments.find((item) => item.id === expiredOwnPost.data.id);
    assert.ok(moment, 'expired own post missing from state');
    moment.createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  });
  await restartBackend(port);

  const firstPage = await request('/social/pet-circle/posts?lat=31.231&lng=121.474&radiusKm=3&accuracy=30&limit=2', {
    token: viewerToken,
  });
  assert.equal(firstPage.data.items.length, 2, 'first cursor page should honor limit');
  assert.ok(firstPage.data.nextCursor, 'first cursor page should include nextCursor');
  const secondPage = await request(`/social/pet-circle/posts?lat=31.231&lng=121.474&radiusKm=3&accuracy=30&limit=2&cursor=${encodeURIComponent(firstPage.data.nextCursor)}`, {
    token: viewerToken,
  });
  assert.ok(secondPage.data.items.length >= 1, 'second cursor page should return remaining posts');
  const firstPageIds = new Set(firstPage.data.items.map((item) => item.id));
  assert.ok(!secondPage.data.items.some((item) => firstPageIds.has(item.id)), 'cursor pages should not duplicate posts');

  const viewerList = await request('/social/pet-circle/posts?lat=31.231&lng=121.474&radiusKm=3&accuracy=30', {
    token: viewerToken,
  });
  assert.ok(viewerList.data.items.some((item) => item.id === publicPost.data.id), 'near viewer should see nearby post');
  assert.ok(!viewerList.data.items.some((item) => item.id === hiddenPost.data.id), 'private posts should not appear in circle list');
  const ownerList = await request('/social/pet-circle/posts?lat=31.2304&lng=121.4737&radiusKm=3&accuracy=30', {
    token: ownerToken,
  });
  assert.ok(ownerList.data.items.some((item) => item.id === publicPost.data.id && item.ownedByMe), 'pet circle list should include own public posts for management');
  assert.ok(!ownerList.data.items.some((item) => item.id === expiredOwnPost.data.id), 'expired own posts should not remain in pet circle list');
  const ownerNearbyMoments = await request('/social/nearby-moments?lat=31.2304&lng=121.4737&radiusKm=3&accuracy=30', {
    token: ownerToken,
  });
  assert.ok(!ownerNearbyMoments.data.some((item) => item.id === publicPost.data.id), 'nearby moment summary should not include own public posts');
  const viewerNearbyMoments = await request('/social/nearby-moments?lat=31.231&lng=121.474&radiusKm=3&accuracy=30', {
    token: viewerToken,
  });
  assert.ok(viewerNearbyMoments.data.some((item) => item.id === publicPost.data.id), 'nearby moment summary should include other nearby public posts');

  const farList = await request('/social/pet-circle/posts?lat=31.9&lng=121.9&radiusKm=3&accuracy=30', {
    token: farToken,
  });
  assert.ok(!farList.data.items.some((item) => item.id === publicPost.data.id), 'far viewer should not see nearby post');

  const syncedPublicContent = 'public sync to health calendar direct post';
  await request('/social/pet-circle/posts', {
    body: {
      content: syncedPublicContent,
      location: ownerLoc,
      syncToHealthCalendar: true,
      visibility: 'nearby',
    },
    method: 'POST',
    token: ownerToken,
  });
  const syncedPublicCalendar = await request('/health/calendar', { token: ownerToken });
  assert.ok(
    findByDetail(syncedPublicCalendar.data, syncedPublicContent),
    'syncToHealthCalendar=true should save public pet circle post to health calendar',
  );

  await expectApiError(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/like`, {
    code: 'PET_CIRCLE_LIKE_INVALID',
    method: 'POST',
    status: 400,
    token: ownerToken,
  });

  const liked = await request(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/like`, {
    method: 'POST',
    token: viewerToken,
  });
  assert.equal(liked.data.likedByMe, true);
  assert.equal(liked.data.likeCount, 1);
  const unliked = await request(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/like`, {
    method: 'DELETE',
    token: viewerToken,
  });
  assert.equal(unliked.data.likedByMe, false, 'viewer should be able to unlike a post');
  assert.equal(unliked.data.likeCount, 0, 'unlike should decrement like count');
  const ownerNotificationsAfterUnlike = await request('/notifications', { token: ownerToken });
  assert.ok(
    !ownerNotificationsAfterUnlike.data.some((item) => item.id === `n-pet-circle-like-${publicPost.data.id}-${viewerPhone}`),
    'unlike should remove stale pet circle like notification',
  );
  const likedAgain = await request(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/like`, {
    method: 'POST',
    token: viewerToken,
  });
  assert.equal(likedAgain.data.likedByMe, true, 'viewer should be able to like again after unlike');
  assert.equal(likedAgain.data.likeCount, 1, 're-like should restore like count');

  const comments = await request(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/comments`, {
    body: { content: 'looks great for a walk' },
    method: 'POST',
    token: viewerToken,
  });
  assert.equal(comments.data.length, 1, 'comment should be created');
  const commentId = comments.data[0].id;

  const ownerNotifications = await request('/notifications', { token: ownerToken });
  const likeNotification = ownerNotifications.data.find((item) => item.kind === 'pet_circle_like');
  const commentNotification = ownerNotifications.data.find((item) => item.kind === 'pet_circle_comment');
  assert.ok(likeNotification, 'owner should get like notification');
  assert.equal(likeNotification.postId, publicPost.data.id, 'like notification should carry pet circle post id');
  assert.ok(commentNotification, 'owner should get comment notification');
  assert.equal(commentNotification.postId, publicPost.data.id, 'comment notification should carry pet circle post id');
  assert.equal(commentNotification.commentId, commentId, 'comment notification should carry comment id');

  await request('/settings', {
    body: { interactionMessages: false },
    method: 'PATCH',
    token: interactionOffToken,
  });
  const interactionOffPost = await request('/social/pet-circle/posts', {
    body: {
      content: 'interaction messages disabled post',
      location: ownerLoc,
      visibility: 'nearby',
    },
    method: 'POST',
    token: interactionOffToken,
  });
  await request(`/social/pet-circle/posts/${encodeURIComponent(interactionOffPost.data.id)}/like`, {
    method: 'POST',
    token: viewerToken,
  });
  await request(`/social/pet-circle/posts/${encodeURIComponent(interactionOffPost.data.id)}/comments`, {
    body: { content: 'quiet owner should not receive interaction notification' },
    method: 'POST',
    token: viewerToken,
  });
  const interactionOffNotifications = await request('/notifications', { token: interactionOffToken });
  assert.ok(
    !interactionOffNotifications.data.some((item) => item.kind === 'pet_circle_like' || item.kind === 'pet_circle_comment'),
    'interactionMessages=false should suppress pet circle interaction notifications',
  );

  await request('/settings', {
    body: { pushNotifications: false },
    method: 'PATCH',
    token: pushOffToken,
  });
  const pushOffPost = await request('/social/pet-circle/posts', {
    body: {
      content: 'push notifications disabled post',
      location: ownerLoc,
      visibility: 'nearby',
    },
    method: 'POST',
    token: pushOffToken,
  });
  await request(`/social/pet-circle/posts/${encodeURIComponent(pushOffPost.data.id)}/like`, {
    method: 'POST',
    token: viewerToken,
  });
  await request(`/social/pet-circle/posts/${encodeURIComponent(pushOffPost.data.id)}/comments`, {
    body: { content: 'push disabled owner should not receive notification' },
    method: 'POST',
    token: viewerToken,
  });
  const pushOffNotifications = await request('/notifications', { token: pushOffToken });
  assert.ok(
    !pushOffNotifications.data.some((item) => item.kind === 'pet_circle_like' || item.kind === 'pet_circle_comment'),
    'pushNotifications=false should suppress pet circle notifications',
  );

  const commentDeleted = await request(`/social/pet-circle/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    token: viewerToken,
  });
  assert.equal(commentDeleted.data.deleted, true);
  const ownerNotificationsAfterCommentDelete = await request('/notifications', { token: ownerToken });
  assert.ok(
    !ownerNotificationsAfterCommentDelete.data.some((item) => item.id === `n-pet-circle-comment-${commentId}`),
    'deleting a comment should remove stale pet circle comment notification',
  );
  const noComments = await request(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/comments`, {
    token: ownerToken,
  });
  assert.equal(noComments.data.length, 0, 'deleted comment should not be returned');
  const ownerModeratedComments = await request(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/comments`, {
    body: { content: 'owner can moderate this comment' },
    method: 'POST',
    token: viewerToken,
  });
  const moderatedCommentId = ownerModeratedComments.data[0]?.id;
  assert.ok(moderatedCommentId, 'owner moderation comment should be created');
  const ownerDeletedComment = await request(`/social/pet-circle/comments/${encodeURIComponent(moderatedCommentId)}`, {
    method: 'DELETE',
    token: ownerToken,
  });
  assert.equal(ownerDeletedComment.data.deleted, true, 'post owner should be able to delete comments under own post');
  const commentsAfterOwnerModeration = await request(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/comments`, {
    token: ownerToken,
  });
  assert.equal(commentsAfterOwnerModeration.data.length, 0, 'owner-deleted comment should not be returned');

  const reportTargetPost = await request('/social/pet-circle/posts', {
    body: {
      content: 'report target post should hide only for reporter',
      location: ownerLoc,
      visibility: 'nearby',
    },
    method: 'POST',
    token: ownerToken,
  });
  const reportedPost = await request(`/social/pet-circle/posts/${encodeURIComponent(reportTargetPost.data.id)}/report`, {
    body: { reason: 'report smoke post' },
    method: 'POST',
    token: viewerToken,
  });
  assert.equal(reportedPost.data.reported, true, 'post report endpoint should accept report');
  assert.equal(reportedPost.data.targetType, 'post');
  const viewerListAfterPostReport = await request('/social/pet-circle/posts?lat=31.231&lng=121.474&radiusKm=3&accuracy=30', {
    token: viewerToken,
  });
  assert.ok(!viewerListAfterPostReport.data.items.some((item) => item.id === reportTargetPost.data.id), 'reported post should be hidden from reporter list');
  await expectApiError(`/social/pet-circle/posts/${encodeURIComponent(reportTargetPost.data.id)}/like`, {
    code: 'PET_CIRCLE_LIKE_INVALID',
    method: 'POST',
    status: 404,
    token: viewerToken,
  });

  const commentReportPost = await request('/social/pet-circle/posts', {
    body: {
      content: 'comment report target post',
      location: ownerLoc,
      visibility: 'nearby',
    },
    method: 'POST',
    token: ownerToken,
  });
  const reportableComments = await request(`/social/pet-circle/posts/${encodeURIComponent(commentReportPost.data.id)}/comments`, {
    body: { content: 'reportable third party comment' },
    method: 'POST',
    token: hiddenToken,
  });
  const reportableCommentId = reportableComments.data[0]?.id;
  assert.ok(reportableCommentId, 'reportable comment should be created');
  const commentReport = await request(`/social/pet-circle/comments/${encodeURIComponent(reportableCommentId)}/report`, {
    body: { reason: 'report smoke comment' },
    method: 'POST',
    token: viewerToken,
  });
  assert.equal(commentReport.data.reported, true, 'comment report endpoint should accept report');
  assert.equal(commentReport.data.targetType, 'comment');
  const viewerCommentsAfterReport = await request(`/social/pet-circle/posts/${encodeURIComponent(commentReportPost.data.id)}/comments`, {
    token: viewerToken,
  });
  assert.ok(!viewerCommentsAfterReport.data.some((item) => item.id === reportableCommentId), 'reported comment should be hidden from reporter comments');
  const ownerCommentsAfterReport = await request(`/social/pet-circle/posts/${encodeURIComponent(commentReportPost.data.id)}/comments`, {
    token: ownerToken,
  });
  assert.ok(ownerCommentsAfterReport.data.some((item) => item.id === reportableCommentId), 'reported comment should remain visible to non-reporting post owner');
  const reportState = loadState();
  assert.ok(reportState.socialReports.some((item) => item.targetId === reportTargetPost.data.id && item.phone === viewerPhone), 'post report should be persisted with reporter');
  assert.ok(reportState.socialReports.some((item) => item.targetId === reportableCommentId && item.phone === viewerPhone), 'comment report should be persisted with reporter');

  const plainGreeting = await request('/social/greetings', {
    body: { ownerId: publicPost.data.ownerId },
    method: 'POST',
    token: viewerToken,
  });
  assert.equal(plainGreeting.data.sent, true, 'viewer should be able to send a plain greeting before pet circle source');
  await expectApiError('/social/greetings', {
    body: { ownerId: publicPost.data.ownerId, postId: hiddenPost.data.id, source: 'pet_circle' },
    code: 'PET_CIRCLE_POST_GONE',
    method: 'POST',
    status: 404,
    token: viewerToken,
  });
  const greeting = await request('/social/greetings', {
    body: { ownerId: publicPost.data.ownerId, postId: publicPost.data.id, source: 'pet_circle' },
    method: 'POST',
    token: viewerToken,
  });
  assert.equal(greeting.data.sent, true, 'viewer should greet from a pet circle post owner');
  assert.equal(greeting.data.source, 'pet_circle', 'pet circle greeting response should keep source');
  assert.equal(greeting.data.postId, publicPost.data.id, 'pet circle greeting response should keep post id');
  const greetingRequests = await request('/social/greeting-requests', { token: ownerToken });
  assert.ok(greetingRequests.data.some((item) => item.id === `user-${viewerPhone}`), 'post owner should receive greeting request from viewer');
  const ownerNotificationsAfterGreeting = await request('/notifications', { token: ownerToken });
  const petCircleGreetingNotification = ownerNotificationsAfterGreeting.data.find((item) => item.kind === 'pet_circle_greeting');
  assert.ok(petCircleGreetingNotification, 'post owner should receive pet circle greeting notification');
  assert.equal(petCircleGreetingNotification.postId, publicPost.data.id, 'pet circle greeting notification should carry post id');
  assert.equal(petCircleGreetingNotification.ownerId, `user-${viewerPhone}`, 'pet circle greeting notification should carry greeter owner id');
  const greetingStateAfterSource = loadState();
  const pendingGreetingsFromViewer = greetingStateAfterSource.greetings.filter((item) => item.fromPhone === viewerPhone && item.targetPhone === ownerPhone && (item.status || 'pending') === 'pending');
  assert.equal(pendingGreetingsFromViewer.length, 1, 'pet circle source greeting should update existing pending greeting instead of duplicating it');
  assert.equal(pendingGreetingsFromViewer[0].source, 'pet_circle', 'existing pending greeting should keep pet circle source');
  assert.equal(pendingGreetingsFromViewer[0].postId, publicPost.data.id, 'existing pending greeting should keep pet circle post id');

  await expectApiError(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/comments`, {
    body: { content: 'too far to comment' },
    code: 'PET_CIRCLE_COMMENT_INVALID',
    method: 'POST',
    status: 404,
    token: farToken,
  });
  await expectApiError(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/comments`, {
    body: { content: 'please visit https://example.com for details' },
    code: 'PET_CIRCLE_COMMENT_INVALID',
    method: 'POST',
    status: 400,
    token: viewerToken,
  });
  await expectApiError(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/comments`, {
    body: { content: `${'long comment '.repeat(14)}tail` },
    code: 'PET_CIRCLE_COMMENT_INVALID',
    method: 'POST',
    status: 400,
    token: viewerToken,
  });
  await expectApiError(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/like`, {
    code: 'PET_CIRCLE_LIKE_INVALID',
    method: 'POST',
    status: 404,
    token: farToken,
  });

  const postDeleteComments = await request(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/comments`, {
    body: { content: 'comment should be cleaned when post is deleted' },
    method: 'POST',
    token: viewerToken,
  });
  const postDeleteCommentId = postDeleteComments.data[0]?.id;
  assert.ok(postDeleteCommentId, 'post delete cleanup comment should be created');
  const ownerNotificationsBeforePostDelete = await request('/notifications', { token: ownerToken });
  assert.ok(
    ownerNotificationsBeforePostDelete.data.some((item) => item.id === `n-pet-circle-like-${publicPost.data.id}-${viewerPhone}`),
    'post delete cleanup like notification should exist before post deletion',
  );
  assert.ok(
    ownerNotificationsBeforePostDelete.data.some((item) => item.id === `n-pet-circle-comment-${postDeleteCommentId}`),
    'post delete cleanup comment notification should exist before post deletion',
  );
  assert.ok(
    ownerNotificationsBeforePostDelete.data.some((item) => item.id === `n-pet-circle-greeting-${publicPost.data.id}-${viewerPhone}`),
    'post delete cleanup pet circle greeting notification should exist before post deletion',
  );

  await request('/settings', {
    body: { nearbyVisible: false },
    method: 'PATCH',
    token: ownerToken,
  });
  await expectApiError(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/comments`, {
    code: 'PET_CIRCLE_POST_GONE',
    status: 404,
    token: viewerToken,
  });
  await expectApiError(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/like`, {
    code: 'PET_CIRCLE_LIKE_INVALID',
    method: 'POST',
    status: 404,
    token: viewerToken,
  });

  const deletedPost = await request(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}`, {
    method: 'DELETE',
    token: ownerToken,
  });
  assert.equal(deletedPost.data.deleted, true);
  const calendarAfterPostDelete = await request('/health/calendar', { token: ownerToken });
  assert.ok(
    findByTitle(calendarAfterPostDelete.data, publicPostMemoTitle),
    'deleting a pet circle post should keep the health calendar record',
  );
  const ownerNotificationsAfterPostDelete = await request('/notifications', { token: ownerToken });
  assert.ok(
    !ownerNotificationsAfterPostDelete.data.some((item) => (
      item.postId === publicPost.data.id ||
      item.id === `n-pet-circle-like-${publicPost.data.id}-${viewerPhone}` ||
      item.id === `n-pet-circle-comment-${postDeleteCommentId}` ||
      item.id === `n-pet-circle-greeting-${publicPost.data.id}-${viewerPhone}`
    )),
    'deleting a post should remove stale pet circle notifications for that post',
  );
  const postDeleteState = loadState();
  assert.ok(
    !(postDeleteState.socialLikes || []).some((like) => like.postId === publicPost.data.id),
    'deleting a post should remove related likes',
  );
  assert.ok(
    (postDeleteState.socialComments || [])
      .filter((comment) => comment.postId === publicPost.data.id)
      .every((comment) => comment.status === 'deleted'),
    'deleting a post should mark related comments deleted',
  );

  await request('/settings', {
    body: { nearbyVisible: true },
    method: 'PATCH',
    token: ownerToken,
  });
  await expectApiError(`/social/pet-circle/posts/${encodeURIComponent(publicPost.data.id)}/comments`, {
    code: 'PET_CIRCLE_POST_GONE',
    status: 404,
    token: viewerToken,
  });

  const blockerDiscoverBeforeBlock = await request('/social/discover?lat=31.2304&lng=121.4737&radiusKm=3&accuracy=30', {
    token: interactionOffToken,
  });
  assert.ok(
    blockerDiscoverBeforeBlock.data.some((item) => item.id === pushOffPost.data.ownerId),
    'block target should be visible before block',
  );
  await expectApiError('/social/blocks', {
    body: { ownerId: `user-${farPhone}` },
    code: 'SOCIAL_BLOCK_INVALID',
    method: 'POST',
    status: 404,
    token: interactionOffToken,
  });
  const blockPairGreeting = await request('/social/greetings', {
    body: { ownerId: pushOffPost.data.ownerId },
    method: 'POST',
    token: interactionOffToken,
  });
  assert.equal(blockPairGreeting.data.sent, true, 'block smoke pair should be able to greet before block');
  await request(`/social/greeting-requests/${encodeURIComponent(interactionOffPost.data.ownerId)}/accept`, {
    method: 'POST',
    token: pushOffToken,
  });
  const blockerConversationId = `c-${pushOffPhone}`;
  const targetConversationId = `c-${interactionOffPhone}`;
  const blockerConversationsBeforeBlock = await request('/conversations', { token: interactionOffToken });
  assert.ok(
    blockerConversationsBeforeBlock.data.some((conversation) => conversation.id === blockerConversationId && conversation.ownerId === pushOffPost.data.ownerId),
    'accepted conversation should be visible before block',
  );
  await request(`/conversations/${encodeURIComponent(blockerConversationId)}/messages`, {
    body: { text: 'accepted chat before block' },
    method: 'POST',
    token: interactionOffToken,
  });
  const blockResult = await request('/social/blocks', {
    body: { ownerId: pushOffPost.data.ownerId },
    method: 'POST',
    token: interactionOffToken,
  });
  assert.equal(blockResult.data.blocked, true, 'block endpoint should accept visible owner');
  assert.equal(blockResult.data.ownerId, pushOffPost.data.ownerId, 'block endpoint should return blocked owner id');
  const blockerListAfterBlock = await request('/social/pet-circle/posts?lat=31.2304&lng=121.4737&radiusKm=3&accuracy=30', {
    token: interactionOffToken,
  });
  assert.ok(!blockerListAfterBlock.data.items.some((item) => item.id === pushOffPost.data.id), 'blocked owner post should be hidden from blocker list');
  const targetListAfterBlock = await request('/social/pet-circle/posts?lat=31.2304&lng=121.4737&radiusKm=3&accuracy=30', {
    token: pushOffToken,
  });
  assert.ok(!targetListAfterBlock.data.items.some((item) => item.id === interactionOffPost.data.id), 'blocker post should be hidden from blocked user list');
  const blockerDiscoverAfterBlock = await request('/social/discover?lat=31.2304&lng=121.4737&radiusKm=3&accuracy=30', {
    token: interactionOffToken,
  });
  assert.ok(!blockerDiscoverAfterBlock.data.some((item) => item.id === pushOffPost.data.ownerId), 'blocked owner should be hidden from nearby owners');
  const blockerConversationsAfterBlock = await request('/conversations', { token: interactionOffToken });
  assert.ok(
    !blockerConversationsAfterBlock.data.some((conversation) => conversation.ownerId === pushOffPost.data.ownerId),
    'blocked owner conversation should be hidden from blocker inbox',
  );
  const targetConversationsAfterBlock = await request('/conversations', { token: pushOffToken });
  assert.ok(
    !targetConversationsAfterBlock.data.some((conversation) => conversation.ownerId === interactionOffPost.data.ownerId),
    'blocker conversation should be hidden from blocked user inbox',
  );
  await expectApiError(`/conversations/${encodeURIComponent(blockerConversationId)}/messages`, {
    body: { text: 'blocked chat should fail' },
    method: 'POST',
    status: 404,
    token: interactionOffToken,
  });
  await expectApiError(`/conversations/${encodeURIComponent(targetConversationId)}/messages`, {
    status: 404,
    token: pushOffToken,
  });
  await expectApiError('/social/greetings', {
    body: { ownerId: interactionOffPost.data.ownerId },
    method: 'POST',
    status: 404,
    token: pushOffToken,
  });
  const blockState = loadState();
  assert.ok(
    blockState.socialBlocks.some((item) => item.blockerPhone === interactionOffPhone && item.blockedPhone === pushOffPhone),
    'social block should be persisted',
  );
  const listedBlocks = await request('/social/blocks', { token: interactionOffToken });
  assert.ok(listedBlocks.data.some((item) => item.ownerId === pushOffPost.data.ownerId), 'block list should include blocked owner');
  const unblockResult = await request(`/social/blocks/${encodeURIComponent(pushOffPost.data.ownerId)}`, {
    method: 'DELETE',
    token: interactionOffToken,
  });
  assert.equal(unblockResult.data.deleted, true, 'unblock endpoint should delete block');
  const listedBlocksAfterUnblock = await request('/social/blocks', { token: interactionOffToken });
  assert.ok(!listedBlocksAfterUnblock.data.some((item) => item.ownerId === pushOffPost.data.ownerId), 'block list should remove unblocked owner');
  const blockerListAfterUnblock = await request('/social/pet-circle/posts?lat=31.2304&lng=121.4737&radiusKm=3&accuracy=30', {
    token: interactionOffToken,
  });
  assert.ok(blockerListAfterUnblock.data.items.some((item) => item.id === pushOffPost.data.id), 'unblocked owner post should return to blocker list');
  const targetListAfterUnblock = await request('/social/pet-circle/posts?lat=31.2304&lng=121.4737&radiusKm=3&accuracy=30', {
    token: pushOffToken,
  });
  assert.ok(targetListAfterUnblock.data.items.some((item) => item.id === interactionOffPost.data.id), 'blocker post should return to unblocked user list');
  const blockerDiscoverAfterUnblock = await request('/social/discover?lat=31.2304&lng=121.4737&radiusKm=3&accuracy=30', {
    token: interactionOffToken,
  });
  assert.ok(blockerDiscoverAfterUnblock.data.some((item) => item.id === pushOffPost.data.ownerId), 'unblocked owner should return to nearby owners');
  const blockerConversationsAfterUnblock = await request('/conversations', { token: interactionOffToken });
  assert.ok(
    blockerConversationsAfterUnblock.data.some((conversation) => conversation.ownerId === pushOffPost.data.ownerId),
    'unblocked accepted conversation should return to blocker inbox',
  );
  const greetingAfterUnblock = await request('/social/greetings', {
    body: { ownerId: interactionOffPost.data.ownerId },
    method: 'POST',
    token: pushOffToken,
  });
  assert.equal(greetingAfterUnblock.data.sent, true, 'unblocked user should be able to greet again');

  const readSenderPhone = '19900002001';
  const readTargetPhone = '19900002002';
  const readSenderToken = await login(readSenderPhone);
  const readTargetToken = await login(readTargetPhone);
  await createPet(readSenderToken, 'ReadSender');
  await createPet(readTargetToken, 'ReadTarget');
  await refreshPresence(readSenderToken, ownerLoc);
  await refreshPresence(readTargetToken, viewerLoc);
  const readSenderOwnerId = `user-${readSenderPhone}`;
  const readTargetOwnerId = `user-${readTargetPhone}`;
  await request('/social/greetings', {
    body: { ownerId: readTargetOwnerId },
    method: 'POST',
    token: readSenderToken,
  });
  const readTargetNotificationsBeforeAccept = await request('/notifications', { token: readTargetToken });
  const readTargetGreetingRequestNotification = readTargetNotificationsBeforeAccept.data.find((item) => item.kind === 'greeting_request' && item.ownerId === readSenderOwnerId);
  assert.ok(readTargetGreetingRequestNotification, 'incoming greeting should create a request notification for the receiver');
  await request(`/social/greeting-requests/${encodeURIComponent(readSenderOwnerId)}/accept`, {
    method: 'POST',
    token: readTargetToken,
  });
  const readTargetNotificationsAfterAccept = await request('/notifications', { token: readTargetToken });
  assert.ok(
    !readTargetNotificationsAfterAccept.data.some((item) => (item.kind === 'greeting_request' || item.kind === 'pet_circle_greeting') && item.ownerId === readSenderOwnerId),
    'accepting a greeting should remove stale greeting request notifications',
  );
  const readSenderConversationId = `c-${readTargetPhone}`;
  const readTargetConversationId = `c-${readSenderPhone}`;
  const readSenderConversationsBeforeRead = await request('/conversations', { token: readSenderToken });
  const greetingAcceptedConversation = readSenderConversationsBeforeRead.data.find((conversation) => conversation.id === readSenderConversationId);
  assert.equal(greetingAcceptedConversation?.unread, 1, 'accepted greeting should create an unread conversation for sender');
  const readSenderNotificationsBeforeRead = await request('/notifications', { token: readSenderToken });
  const greetingAcceptedNotification = readSenderNotificationsBeforeRead.data.find((item) => item.kind === 'greeting_accepted' && item.conversationId === readSenderConversationId);
  assert.ok(greetingAcceptedNotification, 'accepted greeting should create conversation notification');
  assert.equal(greetingAcceptedNotification.read, false, 'accepted greeting notification should start unread');
  await request(`/conversations/${encodeURIComponent(readSenderConversationId)}/read`, {
    method: 'POST',
    token: readSenderToken,
  });
  const readSenderConversationsAfterRead = await request('/conversations', { token: readSenderToken });
  assert.equal(
    readSenderConversationsAfterRead.data.find((conversation) => conversation.id === readSenderConversationId)?.unread,
    0,
    'reading a conversation should clear the conversation unread count',
  );
  const readSenderNotificationsAfterRead = await request('/notifications', { token: readSenderToken });
  assert.equal(
    readSenderNotificationsAfterRead.data.find((item) => item.id === greetingAcceptedNotification.id)?.read,
    true,
    'reading a conversation should mark related conversation notifications read',
  );
  await request(`/conversations/${encodeURIComponent(readTargetConversationId)}/messages`, {
    body: { text: 'hello unread sync' },
    method: 'POST',
    token: readTargetToken,
  });
  const readSenderConversationsAfterMessage = await request('/conversations', { token: readSenderToken });
  assert.equal(
    readSenderConversationsAfterMessage.data.find((conversation) => conversation.id === readSenderConversationId)?.unread,
    1,
    'incoming chat should increment unread on the target conversation',
  );
  const readSenderNotificationsAfterMessage = await request('/notifications', { token: readSenderToken });
  const messageNotification = readSenderNotificationsAfterMessage.data.find((item) => item.kind === 'conversation_message' && item.conversationId === readSenderConversationId);
  assert.ok(messageNotification, 'incoming chat should retain a routeable conversation notification');
  assert.equal(messageNotification.read, true, 'ordinary chat notifications should not double-count unread outside conversations');
  await request(`/social/walk-invites`, {
    body: { ownerId: readSenderOwnerId, place: 'Smoke Park', placeAddress: 'Smoke Road 1', time: 'today 19:00' },
    method: 'POST',
    token: readTargetToken,
  });
  const readSenderWalkNotificationsBeforeRead = await request('/notifications', { token: readSenderToken });
  const walkNotification = readSenderWalkNotificationsBeforeRead.data.find((item) => item.kind === 'walk_invite' && item.conversationId === readSenderConversationId);
  assert.ok(walkNotification, 'walk invite should create a routeable conversation notification');
  assert.equal(walkNotification.read, false, 'walk invite notification should start unread');
  await request(`/conversations/${encodeURIComponent(readSenderConversationId)}/read`, {
    method: 'POST',
    token: readSenderToken,
  });
  const readSenderWalkNotificationsAfterRead = await request('/notifications', { token: readSenderToken });
  assert.equal(
    readSenderWalkNotificationsAfterRead.data.find((item) => item.id === walkNotification.id)?.read,
    true,
    'reading a walk invite conversation should mark the walk notification read',
  );

  const nearbyPlacesForNotification = await request('/places/nearby', { token: readSenderToken });
  const reviewPlaceId = nearbyPlacesForNotification.data[0]?.id;
  assert.ok(reviewPlaceId, 'nearby places should include a review target');
  const placeReview = await request(`/places/${encodeURIComponent(reviewPlaceId)}/reviews`, {
    body: { content: 'place review notification route smoke' },
    method: 'POST',
    token: readSenderToken,
  });
  assert.ok(placeReview.data.id, 'place review should be created');
  const notificationsAfterPlaceReview = await request('/notifications', { token: readSenderToken });
  const placeReviewNotification = notificationsAfterPlaceReview.data.find((item) => item.id === `notification-${placeReview.data.id}`);
  assert.ok(placeReviewNotification, 'place review notification should exist');
  assert.equal(placeReviewNotification.kind, 'place_review', 'place review notification should carry route kind');
  assert.equal(placeReviewNotification.placeId, reviewPlaceId, 'place review notification should carry place id');

  const placeSubmission = await request('/places/submissions', {
    body: { address: 'Smoke New Place 42', content: 'friendly water bowl and outdoor seats', name: 'Smoke Friendly Yard' },
    method: 'POST',
    token: readSenderToken,
  });
  assert.ok(placeSubmission.data.id, 'place submission should be created');
  const notificationsAfterPlaceSubmission = await request('/notifications', { token: readSenderToken });
  const placeSubmissionNotification = notificationsAfterPlaceSubmission.data.find((item) => item.id === `notification-${placeSubmission.data.id}`);
  assert.ok(placeSubmissionNotification, 'place submission notification should exist');
  assert.equal(placeSubmissionNotification.kind, 'place_submission', 'place submission notification should carry route kind');
  assert.equal(placeSubmissionNotification.submissionId, placeSubmission.data.id, 'place submission notification should carry submission id');

  const petCircleRejectOwnerPhone = '19900002003';
  const petCircleRejectViewerPhone = '19900002004';
  const petCircleRejectOwnerToken = await login(petCircleRejectOwnerPhone);
  const petCircleRejectViewerToken = await login(petCircleRejectViewerPhone);
  await createPet(petCircleRejectOwnerToken, 'RejectOwn');
  await createPet(petCircleRejectViewerToken, 'RejectView');
  await refreshPresence(petCircleRejectOwnerToken, ownerLoc);
  await refreshPresence(petCircleRejectViewerToken, viewerLoc);
  const petCircleRejectPost = await request('/social/pet-circle/posts', {
    body: {
      content: 'pet circle greeting reject notification cleanup',
      location: ownerLoc,
      visibility: 'nearby',
    },
    method: 'POST',
    token: petCircleRejectOwnerToken,
  });
  const petCircleRejectOwnerId = `user-${petCircleRejectOwnerPhone}`;
  const petCircleRejectViewerId = `user-${petCircleRejectViewerPhone}`;
  await request('/social/greetings', {
    body: { ownerId: petCircleRejectOwnerId, postId: petCircleRejectPost.data.id, source: 'pet_circle' },
    method: 'POST',
    token: petCircleRejectViewerToken,
  });
  const petCircleRejectOwnerNotificationsBeforeReject = await request('/notifications', { token: petCircleRejectOwnerToken });
  assert.ok(
    petCircleRejectOwnerNotificationsBeforeReject.data.some((item) => item.kind === 'pet_circle_greeting' && item.ownerId === petCircleRejectViewerId && item.postId === petCircleRejectPost.data.id),
    'pet circle greeting should create a routeable request notification',
  );
  await request(`/social/greeting-requests/${encodeURIComponent(petCircleRejectViewerId)}/reject`, {
    method: 'POST',
    token: petCircleRejectOwnerToken,
  });
  const petCircleRejectOwnerNotificationsAfterReject = await request('/notifications', { token: petCircleRejectOwnerToken });
  assert.ok(
    !petCircleRejectOwnerNotificationsAfterReject.data.some((item) => item.kind === 'pet_circle_greeting' && item.ownerId === petCircleRejectViewerId),
    'rejecting a pet circle greeting should remove the stale pet circle greeting notification',
  );

  const routeVaccine = await request('/health/vaccines', {
    body: { dueAt: addDaysIsoDate(1), name: 'Smoke Route Vaccine' },
    method: 'POST',
    token: readSenderToken,
  });
  assert.ok(routeVaccine.data?.id, 'route vaccine should be created');
  await request(`/health/vaccine-reminders/${encodeURIComponent(routeVaccine.data.id)}`, {
    body: { enabled: true },
    method: 'PATCH',
    token: readSenderToken,
  });
  const notificationsAfterVaccineReminder = await request('/notifications', { token: readSenderToken });
  const vaccineReminderNotification = notificationsAfterVaccineReminder.data.find((item) => item.kind === 'vaccine_reminder' && item.vaccineId === routeVaccine.data.id);
  assert.ok(vaccineReminderNotification, 'vaccine reminder notification should carry route kind and vaccine id');

  await request(`/health/vaccines/${encodeURIComponent(routeVaccine.data.id)}`, {
    body: { status: 'done' },
    method: 'PATCH',
    token: readSenderToken,
  });
  const notificationsAfterVaccineDone = await request('/notifications', { token: readSenderToken });
  const vaccineDoneNotification = notificationsAfterVaccineDone.data.find((item) => item.kind === 'vaccine_done' && item.vaccineId === routeVaccine.data.id);
  assert.ok(vaccineDoneNotification, 'vaccine completion notification should carry route kind and vaccine id');

  const medicalAlertReply = await request('/ai/pet-chat/messages', {
    body: { text: 'my dog ate chocolate and is breathing strangely' },
    method: 'POST',
    token: readSenderToken,
  });
  assert.ok(medicalAlertReply.data?.medicalAlert?.notificationId, 'medical alert reply should include notification id');
  assert.ok(medicalAlertReply.data?.createdMemo?.id, 'medical alert reply should include created memo');
  const notificationsAfterMedicalAlert = await request('/notifications', { token: readSenderToken });
  const medicalAlertNotification = notificationsAfterMedicalAlert.data.find((item) => item.id === medicalAlertReply.data.medicalAlert.notificationId);
  assert.ok(medicalAlertNotification, 'medical alert notification should exist');
  assert.equal(medicalAlertNotification.kind, 'medical_alert', 'medical alert notification should carry route kind');
  assert.equal(medicalAlertNotification.memoId, medicalAlertReply.data.createdMemo.id, 'medical alert notification should carry memo id');

  await request('/feedback', {
    body: {
      category: 'safety',
      content: `Pet circle report smoke: ${publicPost.data.id}`,
    },
    method: 'POST',
    token: viewerToken,
  });

  console.log('pet circle smoke passed');
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopBackend();
    fs.rmSync(tempDir, { force: true, recursive: true });
  });
