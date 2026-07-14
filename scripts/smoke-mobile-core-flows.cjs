#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const PRIMARY_PHONE = '19900008801';
const PEER_PHONE = '19900008802';
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const VALID_PNG_UPLOAD_BASE64 = Buffer.concat([
  Buffer.from(TINY_PNG_BASE64, 'base64'),
  Buffer.alloc(25 * 1024),
]).toString('base64');
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-mobile-core-'));
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
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      PET_AVATAR_ANIMATION_PROVIDER: 'mock',
      PET_AVATAR_PUBLIC_BASE_URL: '',
      PET_AVATAR_PROVIDER: 'mock',
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

async function login(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `mobile-core-smoke-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  assert.equal(payload.state, 'success');
  assert.ok(payload.data?.token, `missing token for ${phone}`);
  return payload.data;
}

async function createPet(token, name, species = 'dog') {
  const payload = await request('/pets', {
    body: {
      birthday: '2023-08',
      breed: species === 'cat' ? 'Domestic Shorthair' : 'Dog',
      gender: species === 'cat' ? 'female' : 'male',
      name,
      species,
      weightKg: species === 'cat' ? 4.2 : 12.5,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `missing pet id for ${name}`);
  assert.equal(payload.data.healthScore, 0, 'a newly created pet must not receive an invented health score');
  assert.deepEqual(payload.data.personality, [], 'a newly created pet must not receive invented personality tags');
  return payload.data;
}

async function refreshDiscoverPresence(token, lat, lng) {
  const query = new URLSearchParams({
    accuracy: '20',
    lat: String(lat),
    lng: String(lng),
    radiusKm: '3',
  });
  const payload = await request(`/social/discover?${query}`, { token });
  assert.equal(Array.isArray(payload.data), true);
  return payload.data;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const terms = await request('/legal/terms');
    assert.ok(terms.data?.version, 'terms should expose a version');

    const appConfig = await request('/app/config');
    assert.equal(appConfig.state, 'success');

    const taxonomy = await request('/pet-taxonomy');
    assert.ok(taxonomy.data?.fieldRules?.supportedSpecies?.includes('dog'), 'taxonomy should include dog');
    assert.ok(taxonomy.data?.fieldRules?.supportedSpecies?.includes('cat'), 'taxonomy should include cat');
    assert.equal(taxonomy.data?.fieldRules?.maxCoatColorLength, 20, 'taxonomy should expose the coat color length limit');

    const primarySession = await login(PRIMARY_PHONE);
    let primaryToken = primarySession.token;
    const peerSession = await login(PEER_PHONE);
    const peerToken = peerSession.token;

    const refreshed = await request('/auth/token/refresh', {
      method: 'POST',
      token: primaryToken,
    });
    assert.ok(refreshed.data?.token, 'refresh should return a token');
    primaryToken = refreshed.data.token;

    const ownerUpdated = await request('/me', {
      body: {
        ownerAvatarUrl: 'https://static.lumii.test/owner-core-smoke.png',
        ownerBio: 'Smoke core profile bio',
        ownerName: 'CoreSmoke',
      },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(ownerUpdated.data.ownerName, 'CoreSmoke');

    const permissionsBefore = await request('/permissions', { token: primaryToken });
    assert.equal(permissionsBefore.data.location, 'unknown');
    const permissionsAfter = await request('/permissions', {
      body: {
        completed: true,
        permissions: {
          location: 'granted',
          media: 'granted',
          notifications: 'denied',
        },
      },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(permissionsAfter.data.location, 'granted');
    assert.equal(permissionsAfter.data.notifications, 'denied');

    const settingsBefore = await request('/settings', { token: primaryToken });
    assert.equal(typeof settingsBefore.data.pushNotifications, 'boolean');
    const settingsAfter = await request('/settings', {
      body: {
        fuzzyLocation: false,
        interactionMessages: false,
        nearbyVisible: true,
        pushNotifications: false,
      },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(settingsAfter.data.pushNotifications, false);
    assert.equal(settingsAfter.data.interactionMessages, false);

    const pushDevice = await request('/devices/push-token', {
      body: {
        deviceId: 'mobile-core-device-1',
        platform: 'android',
        token: 'ExponentPushToken[mobile-core-smoke]',
      },
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(pushDevice.data.platform, 'android');
    assert.equal(pushDevice.data.deviceId, 'mobile-core-device-1');

    const primaryDog = await createPet(primaryToken, 'CoreLucky');
    const primaryCat = await createPet(primaryToken, 'CoreMochi', 'cat');
    const peerPet = await createPet(peerToken, 'CoreBuddy');

    const uploadedPetPhoto = await request('/media/uploads', {
      body: {
        base64: VALID_PNG_UPLOAD_BASE64,
        fileName: 'core-lucky-source.png',
        mimeType: 'image/png',
        source: 'pet_avatar',
      },
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(uploadedPetPhoto.data.analysis.code, 'basic_file_check', 'file validation must not claim visual pet recognition');
    assert.equal(uploadedPetPhoto.data.analysis.qualityScore, 0, 'file validation must not fabricate a visual quality score');
    assert.equal(uploadedPetPhoto.data.analysis.petCount, undefined, 'file validation must not fabricate a pet count');
    assert.equal(uploadedPetPhoto.data.moderationStatus, 'approved');
    assert.ok(uploadedPetPhoto.data.fileUrl, 'valid uploads should expose a durable file URL');
    assert.equal(uploadedPetPhoto.data.previewUrl, uploadedPetPhoto.data.fileUrl, 'preview should use the uploaded file instead of a stock pet image');
    assert.doesNotMatch(JSON.stringify(uploadedPetPhoto.data), /unsplash|golden[-_ ]?retriever/i, 'real uploads must not leak a stock golden retriever image');

    const petsBeforeDefault = await request('/pets', { token: primaryToken });
    assert.equal(petsBeforeDefault.data.length, 2);
    const activeDog = await request(`/pets/${encodeURIComponent(primaryDog.id)}/set-default`, {
      body: {},
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(activeDog.data.id, primaryDog.id);
    const dogDetail = await request(`/pets/${encodeURIComponent(primaryDog.id)}`, { token: primaryToken });
    assert.equal(dogDetail.data.name, 'CoreLucky');
    assert.equal(dogDetail.data.sterilizationStatus, 'unknown', 'new pet sterilization status should default to unknown');
    assert.equal(dogDetail.data.coatColor, undefined, 'new pet must not invent a coat color');

    const invalidSterilization = await request(`/pets/${encodeURIComponent(primaryDog.id)}`, {
      body: { sterilizationStatus: 'maybe' },
      expectedStatus: 400,
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(invalidSterilization.error?.code, 'PET_PROFILE_INVALID');
    const invalidCoatColor = await request(`/pets/${encodeURIComponent(primaryDog.id)}`, {
      body: { coatColor: 'x'.repeat(21) },
      expectedStatus: 400,
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(invalidCoatColor.error?.code, 'PET_PROFILE_INVALID');

    const enrichedDog = await request(`/pets/${encodeURIComponent(primaryDog.id)}`, {
      body: { coatColor: '奶油白', sterilizationStatus: 'sterilized' },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(enrichedDog.data.coatColor, '奶油白');
    assert.equal(enrichedDog.data.sterilizationStatus, 'sterilized');
    const clearedDogFields = await request(`/pets/${encodeURIComponent(primaryDog.id)}`, {
      body: { coatColor: '', weightKg: null },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(clearedDogFields.data.coatColor, undefined, 'empty coat color should clear the previous value');
    assert.equal(clearedDogFields.data.weightKg, undefined, 'null weight should clear the previous value');
    const restoredDogFields = await request(`/pets/${encodeURIComponent(primaryDog.id)}`, {
      body: { coatColor: '奶油白', weightKg: 12.5 },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(restoredDogFields.data.coatColor, '奶油白');
    assert.equal(restoredDogFields.data.weightKg, 12.5);

    const savedAvatar = await request(`/pets/${encodeURIComponent(primaryDog.id)}/avatar`, {
      body: { avatarUrl: 'https://static.lumii.test/core-lucky-avatar.png' },
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(savedAvatar.data.id, primaryDog.id);
    assert.ok(savedAvatar.data.avatarUrl.includes('core-lucky-avatar.png'));

    const healthSummary = await request('/health/summary', { token: primaryToken });
    assert.equal(healthSummary.state, 'success');
    assert.equal(healthSummary.data.healthScore, 0, 'health summary must not expose a fabricated score');
    const calendar = await request('/health/calendar', { token: primaryToken });
    assert.deepEqual(calendar.data, [], 'new pets must not receive a fabricated profile or weight calendar record');

    const earlierWeightDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const latestWeightDate = new Date().toISOString().slice(0, 10);
    const earlierWeight = await request('/health/weights', {
      body: { kg: 10, note: 'Core earlier weight', recordedAt: earlierWeightDate },
      method: 'POST',
      token: primaryToken,
    });
    const latestWeight = await request('/health/weights', {
      body: { kg: 11, note: 'Core latest weight', recordedAt: latestWeightDate },
      method: 'POST',
      token: primaryToken,
    });
    const weightTrendBeforeEdit = await request('/health/weights/trend', { token: primaryToken });
    assert.equal(weightTrendBeforeEdit.data.currentKg, 11);
    assert.equal(weightTrendBeforeEdit.data.previousKg, 10);
    assert.equal(weightTrendBeforeEdit.data.status, 'watch');

    const editedWeight = await request(`/health/weights/${encodeURIComponent(latestWeight.data.id)}`, {
      body: { kg: 10.5, note: 'Core edited weight' },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(editedWeight.data.kg, 10.5);
    assert.equal(editedWeight.data.note, 'Core edited weight');
    const petAfterWeightEdit = await request(`/pets/${encodeURIComponent(primaryDog.id)}`, { token: primaryToken });
    assert.equal(petAfterWeightEdit.data.weightKg, 10.5, 'editing the latest weight should update the active pet');

    const weightsAfterDelete = await request(`/health/weights/${encodeURIComponent(latestWeight.data.id)}`, {
      method: 'DELETE',
      token: primaryToken,
    });
    assert.equal(weightsAfterDelete.data.some((item) => item.id === latestWeight.data.id), false);
    assert.equal(weightsAfterDelete.data.some((item) => item.id === earlierWeight.data.id), true);
    const weightTrendAfterDelete = await request('/health/weights/trend', { token: primaryToken });
    assert.equal(weightTrendAfterDelete.data.currentKg, 10);
    assert.equal(weightTrendAfterDelete.data.status, 'insufficient_data');
    const petAfterWeightDelete = await request(`/pets/${encodeURIComponent(primaryDog.id)}`, { token: primaryToken });
    assert.equal(petAfterWeightDelete.data.weightKg, 10, 'deleting the latest weight should restore the previous pet weight');

    const memoReminderDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const createdMemo = await request('/health/memos', {
      body: {
        content: 'Core memo content',
        reminderEnabled: false,
        repeat: 'none',
        title: 'Core memo',
      },
      method: 'POST',
      token: primaryToken,
    });
    const editedMemo = await request(`/health/memos/${encodeURIComponent(createdMemo.data.id)}`, {
      body: {
        content: 'Core memo edited content',
        reminderAt: `${memoReminderDate} 10:15`,
        reminderEnabled: true,
        repeat: 'monthly',
        title: 'Core memo edited',
      },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(editedMemo.data.title, 'Core memo edited');
    assert.equal(editedMemo.data.reminderAt, `${memoReminderDate} 10:15`);
    assert.equal(editedMemo.data.repeat, 'monthly');
    const memosAfterEdit = await request('/health/memos', { token: primaryToken });
    assert.equal(memosAfterEdit.data.some((item) => item.id === createdMemo.data.id && item.content === 'Core memo edited content'), true);
    const calendarAfterMemoEdit = await request('/health/calendar', { token: primaryToken });
    assert.equal(calendarAfterMemoEdit.data.some((item) => item.sourceId === createdMemo.data.id && item.title === 'Core memo edited'), true);

    const memosAfterDelete = await request(`/health/memos/${encodeURIComponent(createdMemo.data.id)}`, {
      method: 'DELETE',
      token: primaryToken,
    });
    assert.equal(memosAfterDelete.data.some((item) => item.id === createdMemo.data.id), false);
    const calendarAfterMemoDelete = await request('/health/calendar', { token: primaryToken });
    assert.equal(calendarAfterMemoDelete.data.some((item) => item.sourceId === createdMemo.data.id), false);

    const vaccinesInitially = await request('/health/vaccines', { token: primaryToken });
    assert.deepEqual(vaccinesInitially.data, [], 'new pets must not receive default vaccine records');
    const settingsForVaccineNotifications = await request('/settings', {
      body: { pushNotifications: true },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(settingsForVaccineNotifications.data.pushNotifications, true);
    const vaccineDueAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const vaccineEditedDueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const createdVaccine = await request('/health/vaccines', {
      body: { dueAt: vaccineDueAt, name: 'Core vaccine smoke' },
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(createdVaccine.data.status, 'due');
    const vaccineId = createdVaccine.data.id;
    const enabledVaccineReminder = await request(`/health/vaccine-reminders/${encodeURIComponent(vaccineId)}`, {
      body: { enabled: true },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(enabledVaccineReminder.data.includes(vaccineId), true);

    const editedVaccine = await request(`/health/vaccines/${encodeURIComponent(vaccineId)}`, {
      body: { dueAt: vaccineEditedDueAt, name: 'Core vaccine edited' },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(editedVaccine.data.name, 'Core vaccine edited');
    assert.equal(editedVaccine.data.dueAt, vaccineEditedDueAt);
    assert.equal(editedVaccine.data.status, 'due');
    const vaccinesAfterEdit = await request('/health/vaccines', { token: primaryToken });
    assert.equal(vaccinesAfterEdit.data.some((item) => item.id === vaccineId && item.name === 'Core vaccine edited'), true);
    const calendarAfterVaccineEdit = await request('/health/calendar', { token: primaryToken });
    assert.equal(calendarAfterVaccineEdit.data.some((item) => item.sourceId === vaccineId && item.date === vaccineEditedDueAt && item.title === 'Core vaccine edited'), true);

    const completedVaccine = await request(`/health/vaccines/${encodeURIComponent(vaccineId)}`, {
      body: { status: 'done' },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(completedVaccine.data.status, 'done');
    const remindersAfterVaccineDone = await request('/health/vaccine-reminders', { token: primaryToken });
    assert.equal(remindersAfterVaccineDone.data.includes(vaccineId), false);
    const notificationsAfterVaccineDone = await request('/notifications', { token: primaryToken });
    assert.equal(notificationsAfterVaccineDone.data.some((item) => item.vaccineId === vaccineId && item.kind === 'vaccine_done'), true);

    const restoredVaccine = await request(`/health/vaccines/${encodeURIComponent(vaccineId)}`, {
      body: { status: 'due' },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(restoredVaccine.data.status, 'due');
    const notificationsAfterVaccineRestore = await request('/notifications', { token: primaryToken });
    assert.equal(notificationsAfterVaccineRestore.data.some((item) => item.vaccineId === vaccineId && item.kind === 'vaccine_done'), false);

    const invalidVaccinePatch = await request(`/health/vaccines/${encodeURIComponent(vaccineId)}`, {
      body: {},
      expectedStatus: 400,
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(invalidVaccinePatch.error.code, 'HEALTH_VACCINE_INVALID');

    const vaccinesAfterDelete = await request(`/health/vaccines/${encodeURIComponent(vaccineId)}`, {
      method: 'DELETE',
      token: primaryToken,
    });
    assert.equal(vaccinesAfterDelete.data.some((item) => item.id === vaccineId), false);
    const calendarAfterVaccineDelete = await request('/health/calendar', { token: primaryToken });
    assert.equal(calendarAfterVaccineDelete.data.some((item) => item.sourceId === vaccineId), false);
    const notificationsAfterVaccineDelete = await request('/notifications', { token: primaryToken });
    assert.equal(notificationsAfterVaccineDelete.data.some((item) => item.vaccineId === vaccineId), false);

    const nearbyPlaces = await request('/places/nearby', { token: primaryToken });
    const place = nearbyPlaces.data?.find((item) => item?.id);
    assert.ok(place?.id, 'nearby places should include at least one place');
    const searchPlaces = await request(`/places/search?${new URLSearchParams({ q: place.name })}`, { token: primaryToken });
    assert.ok(searchPlaces.data.some((item) => item.id === place.id), 'place search should find the known place');
    const favoriteIds = await request('/places/favorites', { token: primaryToken });
    assert.equal(Array.isArray(favoriteIds.data), true);
    const favoriteAfterAdd = await request(`/places/${encodeURIComponent(place.id)}/favorite`, {
      body: { favorite: true },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(favoriteAfterAdd.data.includes(place.id), true);
    const favoritePlacesAfterAdd = await request('/places/favorites/details', { token: primaryToken });
    assert.equal(favoritePlacesAfterAdd.data.some((item) => item.id === place.id && item.name === place.name), true);
    const favoriteAfterRemove = await request(`/places/${encodeURIComponent(place.id)}/favorite`, {
      body: { favorite: false },
      method: 'PATCH',
      token: primaryToken,
    });
    assert.equal(favoriteAfterRemove.data.includes(place.id), false);
    const favoritePlacesAfterRemove = await request('/places/favorites/details', { token: primaryToken });
    assert.equal(favoritePlacesAfterRemove.data.some((item) => item.id === place.id), false);
    const placeReport = await request(`/places/${encodeURIComponent(place.id)}/report`, {
      body: { content: 'Smoke reports stale opening hours' },
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(placeReport.data.reported, true);
    assert.equal(placeReport.data.targetType, 'place');

    await refreshDiscoverPresence(primaryToken, 22.543096, 114.057865);
    const peerNearbyOwners = await refreshDiscoverPresence(peerToken, 22.5433, 114.058);
    const primaryOwnerCard = peerNearbyOwners.find((item) => item.id === `user-${PRIMARY_PHONE}`);
    assert.equal(primaryOwnerCard?.ownerAvatarUrl, ownerUpdated.data.ownerAvatarUrl, 'nearby owner card should use the real owner avatar');

    await request('/social/greetings', {
      body: { message: 'x'.repeat(121), ownerId: `user-${PEER_PHONE}` },
      expectedStatus: 400,
      method: 'POST',
      token: primaryToken,
    });

    const greetingMessage = '你好 CoreBuddy，我家 CoreLucky 想和你认识一下。';
    const greeting = await request('/social/greetings', {
      body: { message: greetingMessage, ownerId: `user-${PEER_PHONE}` },
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(greeting.data.sent, true);

    const peerRequests = await request('/social/greeting-requests', { token: peerToken });
    const primaryGreetingRequest = peerRequests.data.find((item) => item.id === `user-${PRIMARY_PHONE}`);
    assert.ok(primaryGreetingRequest, 'peer should receive greeting request');
    assert.equal(primaryGreetingRequest.greetingMessage, greetingMessage, 'receiver should see the sender-authored greeting message');
    assert.equal(primaryGreetingRequest.ownerAvatarUrl, ownerUpdated.data.ownerAvatarUrl, 'greeting request should use the real owner avatar');
    assert.equal(Number.isNaN(Date.parse(primaryGreetingRequest.greetingSentAt)), false, 'greeting request should expose its real sent time');
    const accepted = await request(`/social/greeting-requests/${encodeURIComponent(`user-${PRIMARY_PHONE}`)}/accept`, {
      body: {},
      method: 'POST',
      token: peerToken,
    });
    assert.equal(accepted.data.sent, true);

    const primaryConversationId = `c-${PEER_PHONE}`;
    const peerConversationId = `c-${PRIMARY_PHONE}`;
    const conversations = await request('/conversations', { token: primaryToken });
    assert.ok(conversations.data.some((item) => item.id === primaryConversationId), 'primary should see peer conversation');

    const message = await request(`/conversations/${encodeURIComponent(primaryConversationId)}/messages`, {
      body: { text: 'Smoke core conversation message' },
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(message.data.text, 'Smoke core conversation message');

    const peerMessages = await request(`/conversations/${encodeURIComponent(peerConversationId)}/messages`, { token: peerToken });
    const peerVisibleMessage = peerMessages.data.find((item) => item.text === 'Smoke core conversation message');
    assert.ok(peerVisibleMessage?.id, 'peer should see the sent message');
    const readResult = await request(`/conversations/${encodeURIComponent(primaryConversationId)}/read`, {
      body: {},
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(readResult.data, true);

    const messageReport = await request(`/conversations/${encodeURIComponent(peerConversationId)}/messages/${encodeURIComponent(peerVisibleMessage.id)}/report`, {
      body: { content: 'Smoke reports inappropriate message' },
      method: 'POST',
      token: peerToken,
    });
    assert.equal(messageReport.data.reported, true);
    assert.equal(messageReport.data.targetType, 'message');

    const primaryNotifications = await request('/notifications', { token: primaryToken });
    assert.equal(Array.isArray(primaryNotifications.data), true);
    const notificationIds = primaryNotifications.data.map((item) => item.id).filter(Boolean).slice(0, 2);
    const notificationsAfterRead = await request('/notifications/read', {
      body: { ids: notificationIds },
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(Array.isArray(notificationsAfterRead.data), true);

    const logout = await request('/auth/logout', {
      body: {},
      method: 'POST',
      token: primaryToken,
    });
    assert.equal(logout.data, true);
    const revoked = await request('/me', {
      expectedStatus: 401,
      token: primaryToken,
    });
    assert.equal(revoked.state, 'error');

    assert.ok(primaryCat.id, 'secondary pet should be retained during core flow');
    assert.ok(peerPet.id, 'peer pet should be retained during core flow');
    console.log('mobile core flows smoke passed');
  } finally {
    await stopBackend();
  }
}

main().catch(async (error) => {
  await stopBackend();
  console.error(error);
  process.exit(1);
});
