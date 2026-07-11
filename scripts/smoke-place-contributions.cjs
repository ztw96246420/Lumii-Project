#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-place-contrib-'));
const statePath = path.join(tmpDir, 'state.json');
const TEST_CODE = '962464';
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

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `place-contrib-${phone}`, phone },
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

async function createSubmission(token, suffix) {
  const location = {
    accuracy: 18,
    latitude: 23.12911,
    longitude: 113.264385,
    updatedAt: Date.now(),
  };
  const payload = await request('/places/submissions', {
    body: {
      address: `Smoke Contribution Road ${suffix}`,
      content: `Smoke contribution place ${suffix}: friendly grass, water bowls, leash friendly.`,
      location,
      name: `Smoke Contribution Yard ${suffix}`,
    },
    method: 'POST',
    token,
  });
  assert.ok(payload.data?.id, `missing submission id for ${suffix}`);
  assert.equal(payload.data.status, 'pending_review');
  assert.equal(payload.data.latitude, location.latitude);
  assert.equal(payload.data.longitude, location.longitude);
  assert.equal(payload.data.locationAccuracy, location.accuracy);
  assert.ok(payload.data.locationCapturedAt);
  return payload.data;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser('19900003001');
    const adminToken = await loginAdmin();

    const createdSubmission = await createSubmission(userToken, 'create');
    const approvePayload = await request(`/admin/places/submissions/${encodeURIComponent(createdSubmission.id)}/approve`, {
      body: { reason: 'Smoke approve created place' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approvePayload.data.status, 'approved');
    assert.equal(approvePayload.data.contributionPoints, 10);
    assert.equal(approvePayload.data.contributionAction, 'created');
    assert.ok(approvePayload.data.approvedPlaceId, 'approve should create an approved place id');

    const mySubmissionsAfterCreate = await request('/places/submissions/my', { token: userToken });
    const createdMySubmission = mySubmissionsAfterCreate.data.find((item) => item.id === createdSubmission.id);
    assert.equal(createdMySubmission?.contributionPoints, 10);
    assert.equal(createdMySubmission?.contributionActionLabel, '发现新地点');

    const catalog = await request('/admin/places', { token: adminToken });
    const createdPlace = catalog.data.places.find((place) => place.id === createdMySubmission.approvedPlaceId);
    assert.equal(createdPlace?.latitude, createdSubmission.latitude, 'approved place should inherit submission latitude');
    assert.equal(createdPlace?.longitude, createdSubmission.longitude, 'approved place should inherit submission longitude');
    const nearbyAtSubmission = await request(`/places/nearby?lat=${createdSubmission.latitude}&lng=${createdSubmission.longitude}`, { token: userToken });
    assert.ok(nearbyAtSubmission.data.some((place) => place.id === createdMySubmission.approvedPlaceId), 'approved manual place should be visible near its submitted coordinates');
    const nearbyFromFarAway = await request('/places/nearby?lat=39.9042&lng=116.4074', { token: userToken });
    assert.equal(nearbyFromFarAway.data.some((place) => place.id === createdMySubmission.approvedPlaceId), false, 'approved manual place must not follow the user to another city');
    const targetPlaceId = catalog.data.places.find((place) => place.id !== createdMySubmission.approvedPlaceId)?.id;
    assert.ok(targetPlaceId, 'expected an existing target place');

    const linkedSubmission = await createSubmission(userToken, 'linked');
    const linkPayload = await request(`/admin/places/submissions/${encodeURIComponent(linkedSubmission.id)}/link-existing`, {
      body: { placeId: targetPlaceId, reason: 'Smoke link existing place' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(linkPayload.data.submission.status, 'approved');
    assert.equal(linkPayload.data.contribution.points, 5);
    assert.equal(linkPayload.data.contribution.action, 'linked_existing');
    assert.equal(linkPayload.data.submission.linkedExistingPlaceId, targetPlaceId);

    const contributionPayload = await request('/admin/places/contributions', { token: adminToken });
    assert.equal(contributionPayload.data.summary.total, 2);
    assert.equal(contributionPayload.data.summary.points, 15);
    assert.equal(contributionPayload.data.summary.linkedExisting, 1);
    assert.equal(contributionPayload.data.summary.manualAdjustments, 0);
    assert.equal(contributionPayload.data.summary.voided, 0);
    assert.equal(contributionPayload.data.leaderboard[0].phone, '19900003001');
    assert.equal(contributionPayload.data.leaderboard[0].rank, 1);
    assert.equal(contributionPayload.data.leaderboard[0].points, 15);
    assert.equal(contributionPayload.data.rewardPolicy.publicEnabled, false);

    const adjustmentPayload = await request('/admin/places/contributions/adjust', {
      body: {
        phone: '19900003001',
        points: 7,
        reason: 'Smoke manual correction',
      },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(adjustmentPayload.data.contribution.action, 'manual_adjustment');
    assert.equal(adjustmentPayload.data.contribution.points, 7);
    assert.equal(adjustmentPayload.data.contribution.status, 'active');
    assert.equal(adjustmentPayload.data.summary.points, 22);

    const contributionAfterAdjust = await request('/admin/places/contributions', { token: adminToken });
    assert.equal(contributionAfterAdjust.data.summary.total, 3);
    assert.equal(contributionAfterAdjust.data.summary.points, 22);
    assert.equal(contributionAfterAdjust.data.summary.manualAdjustments, 1);
    assert.equal(contributionAfterAdjust.data.summary.voided, 0);

    const profileAfterAdjust = await request('/me', { token: userToken });
    assert.equal(profileAfterAdjust.data.placeContributionSummary.points, 22);
    assert.equal(profileAfterAdjust.data.placeContributionSummary.rawPoints, 22);
    assert.equal(profileAfterAdjust.data.placeContributionSummary.manualAdjustments, 1);

    const voidPayload = await request(`/admin/places/contributions/${encodeURIComponent(adjustmentPayload.data.contribution.id)}/void`, {
      body: { reason: 'Smoke void manual correction' },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(voidPayload.data.contribution.status, 'voided');
    assert.equal(voidPayload.data.summary.points, 15);

    const contributionAfterVoid = await request('/admin/places/contributions', { token: adminToken });
    assert.equal(contributionAfterVoid.data.summary.total, 2);
    assert.equal(contributionAfterVoid.data.summary.points, 15);
    assert.equal(contributionAfterVoid.data.summary.manualAdjustments, 0);
    assert.equal(contributionAfterVoid.data.summary.voided, 1);

    const profileBeforeBadgeConfig = await request('/me', { token: userToken });
    assert.equal(profileBeforeBadgeConfig.data.placeContributionSummary.points, 15);
    assert.equal(profileBeforeBadgeConfig.data.placeContributionSummary.total, 2);
    assert.equal(profileBeforeBadgeConfig.data.placeContributionSummary.level.key, 'starter');
    assert.equal(profileBeforeBadgeConfig.data.placeContributionSummary.publicEligible, true);

    const configBeforeBadge = await request('/app/config');
    assert.equal(configBeforeBadge.data.places.contributionBadgesEnabled, false);
    assert.equal(configBeforeBadge.data.places.contributionLeaderboardEnabled, false);

    const leaderboardBeforeConfig = await request('/places/contributions/leaderboard', { token: userToken });
    assert.equal(leaderboardBeforeConfig.data.enabled, false);
    assert.equal(leaderboardBeforeConfig.data.items.length, 0);
    assert.equal(leaderboardBeforeConfig.data.mySummary.rank, 1);
    assert.equal(leaderboardBeforeConfig.data.mySummary.rankTotal, 1);
    assert.equal(leaderboardBeforeConfig.data.rewardPolicy.publicEnabled, false);

    const publishedConfig = await request('/admin/config', {
      body: {
        places: {
          contributionBadgeMinPoints: 10,
          contributionBadgesEnabled: true,
          contributionLeaderboardEnabled: true,
          contributionLeaderboardLimit: 5,
          contributionRewardPolicy: {
            cycle: 'monthly',
            description: 'Smoke 荣誉展示，不含现金兑换',
            enabled: true,
            rewardLabel: 'Smoke 地点共建荣誉',
            topN: 3,
          },
        },
        reason: 'Smoke enable place contribution badge and leaderboard',
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(publishedConfig.data.places.contributionBadgesEnabled, true);
    assert.equal(publishedConfig.data.places.contributionBadgeMinPoints, 10);
    assert.equal(publishedConfig.data.places.contributionLeaderboardEnabled, true);
    assert.equal(publishedConfig.data.places.contributionLeaderboardLimit, 5);
    assert.equal(publishedConfig.data.places.contributionRewardPolicy.enabled, true);
    assert.equal(publishedConfig.data.places.contributionRewardPolicy.rewardLabel, 'Smoke 地点共建荣誉');

    const appConfigAfterBadge = await request('/app/config');
    assert.equal(appConfigAfterBadge.data.places.contributionBadgesEnabled, true);
    assert.equal(appConfigAfterBadge.data.places.contributionBadgeMinPoints, 10);
    assert.equal(appConfigAfterBadge.data.places.contributionLeaderboardEnabled, true);
    assert.equal(appConfigAfterBadge.data.places.contributionLeaderboardLimit, 5);
    assert.equal(appConfigAfterBadge.data.places.contributionRewardPolicy.enabled, true);
    assert.equal(appConfigAfterBadge.data.places.contributionRewardPolicy.publicEnabled, true);
    assert.equal(appConfigAfterBadge.data.places.contributionRewardPolicy.cycleLabel, '每月');
    assert.equal(appConfigAfterBadge.data.places.contributionRewardPolicy.topN, 3);

    const profileAfterBadgeConfig = await request('/me', { token: userToken });
    assert.equal(profileAfterBadgeConfig.data.placeContributionSummary.points, 15);
    assert.equal(profileAfterBadgeConfig.data.placeContributionSummary.minPublicPoints, 10);
    assert.equal(profileAfterBadgeConfig.data.placeContributionSummary.publicEligible, true);
    assert.equal(profileAfterBadgeConfig.data.placeContributionSummary.leaderboardEnabled, true);
    assert.equal(profileAfterBadgeConfig.data.placeContributionSummary.rank, 1);
    assert.equal(profileAfterBadgeConfig.data.placeContributionSummary.rankTotal, 1);
    assert.equal(profileAfterBadgeConfig.data.placeContributionSummary.nextLevelRemainingPoints, 5);
    assert.equal(profileAfterBadgeConfig.data.placeContributionSummary.rewardEligible, true);
    assert.equal(profileAfterBadgeConfig.data.placeContributionSummary.rewardPolicy.publicEnabled, true);

    const leaderboardAfterConfig = await request('/places/contributions/leaderboard', { token: userToken });
    assert.equal(leaderboardAfterConfig.data.enabled, true);
    assert.equal(leaderboardAfterConfig.data.items[0].rank, 1);
    assert.equal(leaderboardAfterConfig.data.items[0].points, 15);
    assert.equal(leaderboardAfterConfig.data.items[0].phone, undefined);
    assert.equal(leaderboardAfterConfig.data.items[0].publicName, leaderboardAfterConfig.data.items[0].ownerName);
    assert.equal(leaderboardAfterConfig.data.mySummary.rank, 1);
    assert.equal(leaderboardAfterConfig.data.mySummary.rewardEligible, true);
    assert.equal(leaderboardAfterConfig.data.rewardPolicy.publicEnabled, true);

    const notifications = await request('/notifications', { token: userToken });
    const contributionNotifications = notifications.data.filter((item) => item.kind === 'place_submission' && /\+\d+贡献分/.test(item.text || ''));
    assert.equal(contributionNotifications.length, 2, 'expected contribution notifications for both submission outcomes');

    const finalSubmissions = await request('/places/submissions/my', { token: userToken });
    const linkedMySubmission = finalSubmissions.data.find((item) => item.id === linkedSubmission.id);
    assert.equal(linkedMySubmission?.contributionPoints, 5);
    assert.equal(linkedMySubmission?.contributionActionLabel, '补充已有地点');

    console.log('place contribution smoke passed');
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
