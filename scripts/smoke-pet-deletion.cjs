#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const OWNER_PHONE = '19900008901';
const PEER_PHONE = '19900008902';
const REQUESTER_PHONE = '19900008903';
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-pet-deletion-'));
const statePath = path.join(tmpDir, 'state.json');

let backendProcess = null;
let baseUrl = '';
let cosServer = null;
const cosRequests = [];

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

async function startCosServer(port) {
  cosServer = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      cosRequests.push({ bodyBytes: Buffer.concat(chunks).length, method: req.method, path: req.url });
      res.statusCode = req.method === 'DELETE' ? 204 : 200;
      res.end();
    });
  });
  await new Promise((resolve, reject) => {
    cosServer.once('error', reject);
    cosServer.listen(port, '127.0.0.1', resolve);
  });
}

async function startBackend(port, cosPort) {
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      AMAP_WEB_SERVICE_KEY: '',
      AUTH_TOKEN_SECRET: 'pet-deletion-smoke-auth-secret-2026',
      COS_BUCKET: 'lumii-pet-deletion-test',
      COS_ENDPOINT: `http://127.0.0.1:${cosPort}`,
      COS_REGION: 'ap-guangzhou',
      COS_SECRET_ID: 'test-cos-secret-id',
      COS_SECRET_KEY: 'test-cos-secret-key',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      LUMII_STATE_STORAGE_DRIVER: 'json',
      NODE_ENV: 'development',
      PET_AVATAR_ANIMATION_PROVIDER: 'mock',
      PET_AVATAR_PROVIDER: 'mock',
      PET_AVATAR_PUBLIC_BASE_URL: '',
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
      resolve();
    }, 3000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    if (child.exitCode === null) child.kill();
  });
}

async function stopCosServer() {
  if (!cosServer) return;
  const server = cosServer;
  cosServer = null;
  await new Promise((resolve) => server.close(resolve));
}

async function login(phone) {
  const deviceId = `pet-deletion-smoke-${phone}`;
  await request('/auth/sms/send', { body: { deviceId, phone }, method: 'POST' });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, deviceId, expiresAt: Date.now() + 5 * 60 * 1000, phone },
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
      birthday: '2024-01',
      breed: species === 'cat' ? 'Cat' : 'Dog',
      gender: species === 'cat' ? 'female' : 'male',
      name,
      species,
      weightKg: species === 'cat' ? 4.3 : 12.6,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `missing pet id for ${name}`);
  return payload.data;
}

async function setActivePet(token, petId) {
  return request(`/pets/${encodeURIComponent(petId)}/set-default`, { body: {}, method: 'POST', token });
}

function nearbyLocation(latitude = 23.1291, longitude = 113.2644) {
  return { accuracy: 20, latitude, longitude, radiusKm: 10, updatedAt: Date.now() };
}

async function refreshPresence(token, location) {
  const query = new URLSearchParams({
    accuracy: String(location.accuracy),
    lat: String(location.latitude),
    lng: String(location.longitude),
    radiusKm: String(location.radiusKm),
  });
  await request(`/social/discover?${query}`, { token });
}

async function createPost(token, content, location) {
  const payload = await request('/social/pet-circle/posts', {
    body: { content, location, syncToHealthCalendar: true, visibility: 'nearby' },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `missing post id for ${content}`);
  return payload.data;
}

async function waitForAvatarJob(token, jobId) {
  const deadline = Date.now() + 10_000;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await request(`/ai/pet-avatar/jobs/${encodeURIComponent(jobId)}`, { token });
    if (latest.data?.status === 'ready') return latest.data;
    await delay(100);
  }
  throw new Error(`avatar job did not become ready: ${JSON.stringify(latest?.data || {})}`);
}

async function waitForAnimationJob(token, petId) {
  const deadline = Date.now() + 10_000;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await request(`/ai/pet-avatar/animation/latest?petId=${encodeURIComponent(petId)}`, { token });
    if (latest.data?.id && ['processing', 'ready'].includes(latest.data.status)) return latest.data;
    await delay(100);
  }
  throw new Error(`animation job was not created: ${JSON.stringify(latest?.data || {})}`);
}

async function waitFor(predicate, message, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue = null;
  while (Date.now() < deadline) {
    lastValue = await predicate();
    if (lastValue) return lastValue;
    await delay(50);
  }
  throw new Error(`${message}; last=${JSON.stringify(lastValue)}`);
}

function loadState() {
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

async function main() {
  const [port, cosPort] = await Promise.all([getFreePort(), getFreePort()]);
  await startCosServer(cosPort);
  await startBackend(port, cosPort);
  try {
    const ownerToken = await login(OWNER_PHONE);
    const peerToken = await login(PEER_PHONE);
    const requesterToken = await login(REQUESTER_PHONE);
    const adminToken = await loginAdmin();
    const location = nearbyLocation();
    const peerLocation = nearbyLocation(23.1294, 113.2647);

    const dog = await createPet(ownerToken, 'StableDog');
    const peerPet = await createPet(peerToken, 'PeerPet');
    const requesterPet = await createPet(requesterToken, 'RequesterPet');
    await refreshPresence(ownerToken, location);
    await refreshPresence(peerToken, peerLocation);
    await refreshPresence(requesterToken, peerLocation);

    await request('/social/greetings', {
      body: { message: 'Accepted account-level relation', ownerId: `user-${PEER_PHONE}` },
      method: 'POST',
      token: ownerToken,
    });
    const cat = await createPet(ownerToken, 'ScopedCat', 'cat');
    const peerGreetingRequests = await request('/social/greeting-requests', { token: peerToken });
    assert.equal(
      peerGreetingRequests.data.find((item) => item.id === `user-${OWNER_PHONE}`)?.petName,
      dog.name,
      'pending greeting must keep the pet that initiated it after the sender switches pets',
    );
    await request(`/social/greeting-requests/${encodeURIComponent(`user-${OWNER_PHONE}`)}/accept`, {
      body: {},
      method: 'POST',
      token: peerToken,
    });
    const ownerNotificationsAfterAccept = await request('/notifications', { token: ownerToken });
    const acceptedGreetingNotification = ownerNotificationsAfterAccept.data.find((item) => item.kind === 'greeting_accepted');
    assert.equal(acceptedGreetingNotification?.petId, dog.id, 'accepted greeting notification must target the initiating pet');
    assert.equal(acceptedGreetingNotification?.actorPetId, peerPet.id, 'accepted greeting notification must retain the accepting pet');
    await setActivePet(ownerToken, dog.id);
    const peerConversationBeforeSwitch = await request('/conversations', { token: peerToken });
    assert.equal(peerConversationBeforeSwitch.data.find((item) => item.ownerId === `user-${OWNER_PHONE}`)?.petName, dog.name);

    const patchedDog = await request(`/pets/${encodeURIComponent(dog.id)}`, {
      body: { breed: 'Mixed Dog', name: 'StableDog2' },
      method: 'PATCH',
      token: ownerToken,
    });
    assert.equal(patchedDog.data.name, 'StableDog2');
    const dogMemo = await request('/health/memos', {
      body: { content: 'dog data must survive cat deletion', title: 'Dog retained memo' },
      method: 'POST',
      token: ownerToken,
    });
    await request('/ai/pet-chat/messages', { body: { text: 'Remember this dog scoped chat' }, method: 'POST', token: ownerToken });
    const dogPost = await createPost(ownerToken, 'dog post must survive cat deletion', location);

    await setActivePet(ownerToken, cat.id);
    const peerConversationAfterCreate = await request('/conversations', { token: peerToken });
    assert.equal(peerConversationAfterCreate.data.find((item) => item.ownerId === `user-${OWNER_PHONE}`)?.petName, cat.name, 'peer card should follow the newly active pet');
    const patchedCat = await request(`/pets/${encodeURIComponent(cat.id)}`, {
      body: { breed: 'Domestic Shorthair', name: 'ScopedCat2' },
      method: 'PATCH',
      token: ownerToken,
    });
    assert.equal(patchedCat.data.name, 'ScopedCat2');

    const catWeight = await request('/health/weights', {
      body: { kg: 4.6, note: 'cat scoped weight', recordedAt: new Date().toISOString().slice(0, 10) },
      method: 'POST',
      token: ownerToken,
    });
    const catMemo = await request('/health/memos', {
      body: { content: 'cat scoped memo', title: 'Cat deletion memo' },
      method: 'POST',
      token: ownerToken,
    });
    const catVaccine = await request('/health/vaccines', {
      body: { dueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), name: 'Cat vaccine' },
      method: 'POST',
      token: ownerToken,
    });
    await request(`/health/vaccine-reminders/${encodeURIComponent(catVaccine.data.id)}`, {
      body: { enabled: true },
      method: 'PATCH',
      token: ownerToken,
    });
    await request('/ai/pet-chat/messages', { body: { text: 'Remember this cat scoped chat' }, method: 'POST', token: ownerToken });

    const placeReviewUpload = await request('/media/uploads', {
      body: { base64: TINY_PNG_BASE64, fileName: 'account-place-review.png', mimeType: 'image/png', source: 'place_review' },
      method: 'POST',
      token: ownerToken,
    });
    const placeReviewPutPath = cosRequests
      .filter((item) => item.method === 'PUT')
      .map((item) => item.path)
      .findLast((item) => decodeURIComponent(item).includes('/place-review/'));
    assert.ok(placeReviewPutPath, 'place review media should use its account-scoped storage directory');
    assert.equal(decodeURIComponent(placeReviewPutPath).includes(`/${cat.id}/`), false, 'place media must not use the active pet storage prefix');
    const placeAvatarAttempt = await request('/ai/pet-avatar/jobs', {
      body: { mediaId: placeReviewUpload.data.mediaId },
      expectedStatus: 400,
      method: 'POST',
      token: ownerToken,
    });
    assert.equal(placeAvatarAttempt.error.code, 'AVATAR_MEDIA_SCOPE_INVALID');

    const coverUpload = await request('/media/uploads', {
      body: { base64: TINY_PNG_BASE64, fileName: 'scoped-cat-cover.png', mimeType: 'image/png', source: 'pet_circle_cover' },
      method: 'POST',
      token: ownerToken,
    });
    const coverPutPath = cosRequests
      .filter((item) => item.method === 'PUT')
      .map((item) => item.path)
      .findLast((item) => decodeURIComponent(item).includes('/pet-circle-cover-source/'));
    assert.ok(coverPutPath, 'pet-circle cover uploads should use the cover moderation/storage scope');
    assert.ok(decodeURIComponent(coverPutPath).includes(`/${cat.id}/`), 'cover uploads should remain scoped to the selected pet');
    const adminMediaAfterScopedUploads = await request('/admin/ai/media', { token: adminToken });
    const adminPlaceMedia = adminMediaAfterScopedUploads.data.items.find((item) => item.mediaId === placeReviewUpload.data.mediaId);
    const adminCoverMedia = adminMediaAfterScopedUploads.data.items.find((item) => item.mediaId === coverUpload.data.mediaId);
    assert.equal(adminPlaceMedia?.petId, '', 'admin media must not attribute account-scoped place images to the current pet');
    assert.equal(adminPlaceMedia?.canGenerate, false);
    assert.equal(adminPlaceMedia?.scope, 'place_review');
    assert.equal(adminCoverMedia?.petId, cat.id);
    assert.equal(adminCoverMedia?.scope, 'pet_circle_cover');

    const upload = await request('/media/uploads', {
      body: { base64: TINY_PNG_BASE64, fileName: 'scoped-cat.png', mimeType: 'image/png', source: 'pet_avatar' },
      method: 'POST',
      token: ownerToken,
    });
    assert.equal(upload.data.petId, undefined, 'public upload response should not expose internal pet id');
    const avatarStarted = await request('/ai/pet-avatar/jobs', {
      body: { mediaId: upload.data.mediaId },
      method: 'POST',
      token: ownerToken,
    });
    await setActivePet(ownerToken, dog.id);
    const avatarReady = await waitForAvatarJob(ownerToken, avatarStarted.data.id);
    const avatarAccepted = await request(`/ai/pet-avatar/jobs/${encodeURIComponent(avatarReady.id)}/accept`, {
      body: {},
      method: 'POST',
      token: ownerToken,
    });
    assert.equal(avatarAccepted.data.id, cat.id, 'avatar acceptance must apply to the pet locked when the photo was uploaded');
    const dogAfterCatAvatarAccept = await request(`/pets/${encodeURIComponent(dog.id)}`, { token: ownerToken });
    assert.equal(dogAfterCatAvatarAccept.data.avatarUrl, undefined, 'switching pets while a job runs must not overwrite the active pet');
    await request(`/pets/${encodeURIComponent(cat.id)}/avatar`, {
      body: { avatarUrl: 'https://example.com/scoped-cat-avatar.png' },
      method: 'POST',
      token: ownerToken,
    });
    const catAnimation = await waitForAnimationJob(ownerToken, cat.id);
    assert.ok(catAnimation.id, 'saving an HTTP cat avatar should create its animation job');

    const catPost = await createPost(ownerToken, 'cat post and all interactions must be deleted', location);
    const peerPost = await createPost(peerToken, 'peer post must retain only peer interactions', peerLocation);
    await request(`/social/pet-circle/posts/${encodeURIComponent(catPost.id)}/like`, { method: 'POST', token: peerToken });
    const catPostComments = await request(`/social/pet-circle/posts/${encodeURIComponent(catPost.id)}/comments`, {
      body: { text: 'peer comment on cat post' },
      method: 'POST',
      token: peerToken,
    });
    const peerCommentOnCat = catPostComments.data.find((item) => item.text === 'peer comment on cat post');
    assert.ok(peerCommentOnCat?.id);
    const catPostReport = await request(`/social/pet-circle/posts/${encodeURIComponent(catPost.id)}/report`, {
      body: { content: 'pet deletion target report' },
      method: 'POST',
      token: peerToken,
    });
    await request('/social/greetings', {
      body: { ownerId: `user-${OWNER_PHONE}`, postId: catPost.id, source: 'pet_circle' },
      method: 'POST',
      token: requesterToken,
    });
    await createPet(requesterToken, 'RequesterNew');
    const ownerRequestsAfterRequesterSwitch = await request('/social/greeting-requests', { token: ownerToken });
    assert.equal(
      ownerRequestsAfterRequesterSwitch.data.find((item) => item.id === `user-${REQUESTER_PHONE}`)?.petName,
      requesterPet.name,
      'pet-circle greeting must retain the requester pet after the requester switches pets',
    );

    await request('/analytics/events', {
      body: {
        name: 'pet_circle.card_exposure',
        petId: peerPet.id,
        properties: { postId: catPost.id },
      },
      method: 'POST',
      token: peerToken,
    });

    await request(`/social/pet-circle/posts/${encodeURIComponent(peerPost.id)}/like`, { method: 'POST', token: ownerToken });
    const peerPostComments = await request(`/social/pet-circle/posts/${encodeURIComponent(peerPost.id)}/comments`, {
      body: { text: 'cat authored comment on peer post' },
      method: 'POST',
      token: ownerToken,
    });
    const catCommentOnPeer = peerPostComments.data.find((item) => item.text === 'cat authored comment on peer post');
    assert.ok(catCommentOnPeer?.id);

    const catProfile = await request('/social/pet-circle/profiles/me/posts', { token: ownerToken });
    assert.ok(catProfile.data.items.some((item) => item.id === catPost.id));
    assert.equal(catProfile.data.items.some((item) => item.id === dogPost.id), false, 'current cat profile must not mix dog posts');

    await stopBackend();
    const legacyState = loadState();
    const legacyDogPost = legacyState.socialMoments.find((item) => item.id === dogPost.id);
    assert.equal(legacyDogPost.petId, dog.id);
    delete legacyDogPost.petId;
    const legacyPlaceReviewMedia = legacyState.mediaUploads[placeReviewUpload.data.mediaId];
    legacyPlaceReviewMedia.petId = cat.id;
    delete legacyPlaceReviewMedia.scope;
    saveState(legacyState);
    await startBackend(port, cosPort);
    const migratedState = loadState();
    assert.equal(migratedState.socialMoments.find((item) => item.id === dogPost.id)?.petId, dog.id, 'legacy post migration should recover the pet from its linked calendar memo');
    assert.equal(migratedState.mediaUploads[placeReviewUpload.data.mediaId]?.petId, undefined, 'legacy migration must remove pet ownership from place media');
    assert.equal(migratedState.mediaUploads[placeReviewUpload.data.mediaId]?.scope, 'place_review');

    await setActivePet(ownerToken, dog.id);
    const peerConversationAfterSwitch = await request('/conversations', { token: peerToken });
    assert.equal(peerConversationAfterSwitch.data.find((item) => item.ownerId === `user-${OWNER_PHONE}`)?.petName, 'StableDog2', 'switching pets should refresh the peer conversation card');
    const immutableCatPost = await request(`/social/pet-circle/posts/${encodeURIComponent(catPost.id)}`, { token: ownerToken });
    assert.equal(immutableCatPost.data.petId, cat.id);
    assert.equal(immutableCatPost.data.petName, 'ScopedCat2');
    assert.equal(immutableCatPost.data.species, 'cat');
    const adminSocialPostsAfterSwitch = await request('/admin/social/posts', { token: adminToken });
    const adminCatPost = adminSocialPostsAfterSwitch.data.find((item) => item.id === catPost.id);
    assert.equal(adminCatPost?.petId, cat.id, 'admin review must retain the pet that authored the post');
    assert.equal(adminCatPost?.petName, 'ScopedCat2');
    const dogProfile = await request('/social/pet-circle/profiles/me/posts', { token: ownerToken });
    assert.ok(dogProfile.data.items.some((item) => item.id === dogPost.id));
    assert.equal(dogProfile.data.items.some((item) => item.id === catPost.id), false, 'current dog profile must not mix cat posts');

    const ownerHash = crypto.createHash('sha256').update(OWNER_PHONE).digest('hex').slice(0, 16);
    const catPutPaths = cosRequests
      .filter((item) => item.method === 'PUT')
      .filter((item) => decodeURIComponent(item.path).includes(`/${ownerHash}/${cat.id}/`))
      .map((item) => item.path);
    assert.ok(catPutPaths.length >= 1, 'cat media should be persisted to its own storage prefix');

    const remainingPets = await request(`/pets/${encodeURIComponent(cat.id)}`, { method: 'DELETE', token: ownerToken });
    assert.deepEqual(remainingPets.data.map((item) => item.id), [dog.id]);
    const ownerAfterCatDelete = await request('/me', { token: ownerToken });
    assert.equal(ownerAfterCatDelete.data.activePet.id, dog.id, 'deleting a non-active pet must preserve the active pet');
    await request(`/pets/${encodeURIComponent(cat.id)}`, { expectedStatus: 404, token: ownerToken });
    await request(`/social/pet-circle/posts/${encodeURIComponent(catPost.id)}`, { expectedStatus: 404, token: ownerToken });
    const dogPostAfterDelete = await request(`/social/pet-circle/posts/${encodeURIComponent(dogPost.id)}`, { token: ownerToken });
    assert.equal(dogPostAfterDelete.data.petId, dog.id);
    const peerPostAfterDelete = await request(`/social/pet-circle/posts/${encodeURIComponent(peerPost.id)}`, { token: peerToken });
    assert.equal(peerPostAfterDelete.data.likedByMe, false);
    const peerCommentsAfterDelete = await request(`/social/pet-circle/posts/${encodeURIComponent(peerPost.id)}/comments`, { token: peerToken });
    assert.equal(peerCommentsAfterDelete.data.some((item) => item.id === catCommentOnPeer.id), false);
    const ownerGreetingRequests = await request('/social/greeting-requests', { token: ownerToken });
    assert.equal(ownerGreetingRequests.data.some((item) => item.id === `user-${REQUESTER_PHONE}`), false, 'pending cat greeting should be removed');
    const peerConversationAfterDelete = await request('/conversations', { token: peerToken });
    assert.equal(peerConversationAfterDelete.data.find((item) => item.ownerId === `user-${OWNER_PHONE}`)?.petName, 'StableDog2');
    assert.equal(peerConversationAfterDelete.data.find((item) => item.ownerId === `user-${OWNER_PHONE}`)?.canSendMessage, true, 'accepted relation must survive deleting one pet');
    const latestDeletedAvatar = await request(`/ai/pet-avatar/jobs/latest?petId=${encodeURIComponent(cat.id)}`, { token: ownerToken });
    assert.equal(latestDeletedAvatar.data, null);
    const latestDeletedAnimation = await request(`/ai/pet-avatar/animation/latest?petId=${encodeURIComponent(cat.id)}`, { token: ownerToken });
    assert.equal(latestDeletedAnimation.data, null);

    await waitFor(
      () => catPutPaths.every((putPath) => cosRequests.some((item) => item.method === 'DELETE' && item.path === putPath)),
      'cat COS objects were not permanently deleted',
    );
    const deletedState = await waitFor(() => {
      const snapshot = loadState();
      const queueItems = Object.values(snapshot.accountDeletionObjectCleanup || {}).filter((item) => item.deletionType === 'pet_deletion');
      return queueItems.length === 0 ? snapshot : null;
    }, 'pet object cleanup queue did not drain');

    const catKey = `${OWNER_PHONE}:${cat.id}`;
    const dogKey = `${OWNER_PHONE}:${dog.id}`;
    assert.equal(deletedState.health.weights[catKey], undefined);
    assert.equal(deletedState.health.vaccines[catKey], undefined);
    assert.equal(deletedState.health.memos[catKey], undefined);
    assert.equal(deletedState.health.vaccineReminders[catKey], undefined);
    assert.ok(deletedState.health.memos[dogKey].some((item) => item.id === dogMemo.data.id));
    assert.equal(deletedState.petChatMessages[catKey], undefined);
    assert.ok(Array.isArray(deletedState.petChatMessages[dogKey]));
    assert.equal(Object.values(deletedState.avatarJobs || {}).some((job) => job.petId === cat.id || job.acceptedPetId === cat.id), false);
    assert.equal(Object.values(deletedState.avatarAnimationJobs || {}).some((job) => job.petId === cat.id), false);
    assert.equal(Object.values(deletedState.mediaUploads || {}).some((media) => media.petId === cat.id), false);
    assert.equal(deletedState.mediaUploads?.[coverUpload.data.mediaId], undefined, 'pet-circle cover upload media should be removed with the pet');
    assert.ok(deletedState.mediaUploads?.[placeReviewUpload.data.mediaId], 'deleting a pet must preserve account-scoped place media');
    assert.equal(
      cosRequests.some((item) => item.method === 'DELETE' && item.path === placeReviewPutPath),
      false,
      'deleting a pet must not delete account-scoped place media objects',
    );
    assert.equal(deletedState.socialMoments.some((item) => item.id === catPost.id || item.petId === cat.id), false);
    assert.equal(deletedState.socialComments.some((item) => item.id === peerCommentOnCat.id || item.id === catCommentOnPeer.id || item.petId === cat.id || item.postId === catPost.id), false);
    assert.equal(deletedState.socialLikes.some((item) => item.petId === cat.id || item.postId === catPost.id), false);
    assert.equal(deletedState.socialReports.some((item) => item.id === catPostReport.data.id || item.petId === cat.id || item.targetId === catPost.id), false);
    assert.equal(deletedState.greetings.some((item) => item.fromPetId === cat.id || item.targetPetId === cat.id || item.postId === catPost.id), false);
    assert.equal(Object.values(deletedState.notifications || {}).flat().some((item) => (
      item.petId === cat.id || item.actorPetId === cat.id || item.postId === catPost.id || item.commentId === catCommentOnPeer.id
    )), false);
    assert.equal((deletedState.appEvents || []).some((item) => item.properties?.postId === catPost.id), false, 'cross-user analytics references to the deleted post must be removed');
    const petTombstones = Object.values(deletedState.accountDeletionTombstones || {}).filter((item) => item.type === 'pet_deletion');
    assert.equal(petTombstones.length, 1);
    assert.equal(JSON.stringify(petTombstones[0]).includes(OWNER_PHONE), false);
    assert.equal(JSON.stringify(petTombstones[0]).includes(cat.id), false);

    const adminHealth = await request('/admin/system/health', { token: adminToken });
    assert.equal(adminHealth.data.accountDeletions.tombstones, 0, 'pet tombstones must not inflate account deletion operations');
    assert.equal(adminHealth.data.petDeletions.tombstones, 1);
    assert.equal(adminHealth.data.petDeletions.cleanupPending, 0);
    assert.equal(adminHealth.data.checks.find((item) => item.key === 'pet_deletion_processor')?.status, 'ok');

    const noPets = await request(`/pets/${encodeURIComponent(dog.id)}`, { method: 'DELETE', token: ownerToken });
    assert.deepEqual(noPets.data, []);
    const ownerWithoutPets = await request('/me', { token: ownerToken });
    assert.equal(ownerWithoutPets.data.activePet, null);
    const peerConversationsWithoutOwnerPet = await request('/conversations', { token: peerToken });
    assert.equal(peerConversationsWithoutOwnerPet.data.some((item) => item.ownerId === `user-${OWNER_PHONE}`), false);

    const replacementPet = await createPet(ownerToken, 'NewPet');
    const peerConversationsAfterReplacement = await request('/conversations', { token: peerToken });
    const restoredConversation = peerConversationsAfterReplacement.data.find((item) => item.ownerId === `user-${OWNER_PHONE}`);
    assert.equal(restoredConversation?.petName, replacementPet.name, 'accepted account relation should return when the user creates a replacement pet');
    assert.equal(restoredConversation?.canSendMessage, true);

    const mergeSourcePet = await createPet(ownerToken, 'MergeSource');
    const mergeSourceUpload = await request('/media/uploads', {
      body: { base64: TINY_PNG_BASE64, fileName: 'merge-source.png', mimeType: 'image/png', source: 'pet_avatar' },
      method: 'POST',
      token: ownerToken,
    });
    const mergeSourcePutPath = cosRequests
      .filter((item) => item.method === 'PUT')
      .map((item) => item.path)
      .findLast((item) => decodeURIComponent(item).includes(`/${ownerHash}/${mergeSourcePet.id}/`));
    assert.ok(mergeSourcePutPath, 'merged source pet media should use the source pet storage prefix');
    const mergeTargetPet = await createPet(ownerToken, 'MergeTarget');
    const merged = await request(`/admin/pets/${encodeURIComponent(mergeSourcePet.id)}/merge`, {
      body: {
        confirmation: mergeSourcePet.id,
        reason: 'verify merged pet storage deletion',
        targetPetId: mergeTargetPet.id,
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(merged.data.targetPetId, mergeTargetPet.id);
    await request(`/pets/${encodeURIComponent(mergeTargetPet.id)}`, { method: 'DELETE', token: ownerToken });
    await waitFor(
      () => cosRequests.some((item) => item.method === 'DELETE' && item.path === mergeSourcePutPath),
      'media retained from a merged source pet was not permanently deleted with the target pet',
    );
    const stateAfterMergedPetDelete = loadState();
    assert.equal(stateAfterMergedPetDelete.mediaUploads?.[mergeSourceUpload.data.mediaId], undefined);

    assert.ok(peerPet.id);
    assert.ok(catWeight.data.id);
    assert.ok(catMemo.data.id);
    console.log('pet deletion smoke passed');
  } finally {
    await stopBackend();
    await stopCosServer();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopCosServer();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
