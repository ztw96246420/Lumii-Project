#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-place-reward-'));
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
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '1000',
      SMS_DEVICE_DAILY_LIMIT: '1000',
      SMS_IP_DAILY_LIMIT: '1000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
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
    child.kill();
  });
}

async function loginUser(phone) {
  await request('/auth/sms/send', {
    body: { deviceId: `place-reward-${phone}`, phone },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone },
    method: 'POST',
  });
  return payload.data.token;
}

async function loginAdmin(username = 'admin', password = 'LumiiAdmin@2026') {
  const payload = await request('/admin/auth/login', {
    body: { password, username },
    method: 'POST',
  });
  return payload.data.token;
}

async function createAdmin(adminToken, { roleIds, username }) {
  const password = `${username}-Secure2026!`;
  const payload = await request('/admin/accounts', {
    body: {
      displayName: username,
      password,
      reason: `Smoke 创建 ${username}`,
      roleIds,
      username,
    },
    method: 'POST',
    token: adminToken,
  });
  assert.deepEqual(payload.data.account.roleIds, roleIds);
  return loginAdmin(username, password);
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const contributorToken = await loginUser('19900003101');
    const secondToken = await loginUser('19900003102');
    const outsiderToken = await loginUser('19900003103');
    const adminToken = await loginAdmin();

    await request('/admin/places/contributions/adjust', {
      body: { phone: '19900003101', points: 30, reason: 'Smoke 第一名活动贡献' },
      method: 'POST',
      token: adminToken,
    });
    await request('/admin/places/contributions/adjust', {
      body: { phone: '19900003102', points: 15, reason: 'Smoke 第二名活动贡献' },
      method: 'POST',
      token: adminToken,
    });

    await request('/admin/config', {
      body: {
        places: {
          contributionRewardPolicy: {
            enabled: true,
            redemptionEnabled: false,
            settlementEnabled: true,
          },
        },
        reason: 'Smoke 验证未开放领取时禁止结算',
      },
      method: 'PATCH',
      token: adminToken,
    });
    await request('/admin/places/rewards/settle', {
      body: {
        periodEnd: new Date().toISOString(),
        periodStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });

    const config = await request('/admin/config', {
      body: {
        places: {
          contributionLeaderboardEnabled: true,
          contributionRewardPolicy: {
            cycle: 'seasonal',
            description: 'Smoke 活动奖励，用户领取后由履约员发放',
            enabled: true,
            fulfillmentSlaDays: 7,
            minimumPoints: 10,
            redemptionEnabled: true,
            redemptionWindowDays: 14,
            rewardLabel: 'Smoke 地点礼包',
            rewardType: 'coupon',
            settlementEnabled: true,
            topN: 2,
          },
        },
        reason: 'Smoke 开启地点活动结算和兑换',
      },
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(config.data.places.contributionRewardPolicy.settlementEnabled, true);
    assert.equal(config.data.places.contributionRewardPolicy.redemptionEnabled, true);
    assert.equal(config.data.places.contributionRewardPolicy.rewardType, 'coupon');

    const periodStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const periodEnd = new Date(Date.now() + 60 * 1000).toISOString();
    const settled = await request('/admin/places/rewards/settle', {
      body: { periodEnd, periodStart },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(settled.data.duplicate, false);
    assert.equal(settled.data.settlement.eligibleCount, 2);
    assert.equal(settled.data.settlement.policySnapshot.policyVersion, 'place-reward-v1');
    assert.equal(settled.data.claims.length, 2);

    const duplicate = await request('/admin/places/rewards/settle', {
      body: { periodEnd, periodStart },
      method: 'POST',
      token: adminToken,
    });
    assert.equal(duplicate.data.duplicate, true);
    assert.equal(duplicate.data.claims.length, 2);
    await request('/admin/places/rewards/settle', {
      body: { periodEnd, periodStart: new Date(Date.parse(periodStart) - 60_000).toISOString() },
      expectedStatus: 409,
      method: 'POST',
      token: adminToken,
    });

    const contributorRewards = await request('/places/contributions/rewards', { token: contributorToken });
    assert.equal(contributorRewards.data.summary.available, 1);
    assert.equal(contributorRewards.data.claims[0].rank, 1);
    assert.equal(contributorRewards.data.claims[0].rewardLabel, 'Smoke 地点礼包');
    assert.equal(contributorRewards.data.claims[0].rewardTypeLabel, '兑换券');
    const firstClaimId = contributorRewards.data.claims[0].id;

    const secondRewards = await request('/places/contributions/rewards', { token: secondToken });
    assert.equal(secondRewards.data.claims[0].rank, 2);
    const secondClaimId = secondRewards.data.claims[0].id;
    const outsiderRewards = await request('/places/contributions/rewards', { token: outsiderToken });
    assert.equal(outsiderRewards.data.claims.length, 0);
    await request(`/places/contributions/rewards/${encodeURIComponent(firstClaimId)}/redeem`, {
      expectedStatus: 404,
      method: 'POST',
      token: outsiderToken,
    });

    const redeemed = await request(`/places/contributions/rewards/${encodeURIComponent(firstClaimId)}/redeem`, {
      method: 'POST',
      token: contributorToken,
    });
    assert.equal(redeemed.data.claim.status, 'redeemed');
    assert.ok(redeemed.data.claim.fulfillmentSlaAt);
    await request(`/places/contributions/rewards/${encodeURIComponent(firstClaimId)}/redeem`, {
      expectedStatus: 409,
      method: 'POST',
      token: contributorToken,
    });

    const moderatorToken = await createAdmin(adminToken, { roleIds: ['place_moderator'], username: 'place_moderator_01' });
    const fulfillerToken = await createAdmin(adminToken, { roleIds: ['place_reward_operator'], username: 'place_reward_01' });
    const accounts = await request('/admin/accounts', { token: adminToken });
    assert.ok(accounts.data.roles.some((role) => role.key === 'place_moderator'));
    assert.ok(accounts.data.roles.some((role) => role.key === 'place_reward_operator'));

    await request('/admin/places/rewards', { token: moderatorToken });
    const deniedSettlement = await request('/admin/places/rewards/settle', {
      body: { periodEnd, periodStart },
      expectedStatus: 403,
      method: 'POST',
      token: moderatorToken,
    });
    assert.equal(deniedSettlement.data.permission, 'place.reward.settle');
    const deniedAdjustment = await request('/admin/places/contributions/adjust', {
      body: { phone: '19900003101', points: 1, reason: 'Smoke 不应允许调整' },
      expectedStatus: 403,
      method: 'POST',
      token: fulfillerToken,
    });
    assert.equal(deniedAdjustment.data.permission, 'place.reward.settle');

    const fulfilled = await request(`/admin/places/rewards/claims/${encodeURIComponent(firstClaimId)}/fulfill`, {
      body: { fulfillmentReference: 'COUPON-SMOKE-001' },
      method: 'POST',
      token: fulfillerToken,
    });
    assert.equal(fulfilled.data.claim.status, 'fulfilled');
    assert.equal(fulfilled.data.claim.fulfillmentReference, 'COUPON-SMOKE-001');
    const canceled = await request(`/admin/places/rewards/claims/${encodeURIComponent(secondClaimId)}/cancel`, {
      body: { reason: 'Smoke 资格人工复核取消' },
      method: 'POST',
      token: fulfillerToken,
    });
    assert.equal(canceled.data.claim.status, 'canceled');

    const finalProgram = await request('/admin/places/rewards', { token: fulfillerToken });
    assert.equal(finalProgram.data.summary.settlementCount, 1);
    assert.equal(finalProgram.data.summary.fulfilled, 1);
    assert.equal(finalProgram.data.summary.canceled, 1);
    assert.equal(finalProgram.data.summary.redeemed, 0);
    const finalContributorRewards = await request('/places/contributions/rewards', { token: contributorToken });
    assert.equal(finalContributorRewards.data.claims[0].status, 'fulfilled');
    const finalSecondRewards = await request('/places/contributions/rewards', { token: secondToken });
    assert.equal(finalSecondRewards.data.claims[0].status, 'canceled');

    const notifications = await request('/notifications', { token: contributorToken });
    assert.ok(notifications.data.some((item) => item.kind === 'place_reward' && item.placeRewardClaimId === firstClaimId && /已发放/.test(item.title || '')));
    const audit = await request('/admin/audit-logs', { token: adminToken });
    assert.ok(audit.data.items.some((item) => item.action === 'place.reward.settle'));
    assert.ok(audit.data.items.some((item) => item.action === 'place.reward.fulfill'));

    console.log('place reward settlement smoke passed');
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
