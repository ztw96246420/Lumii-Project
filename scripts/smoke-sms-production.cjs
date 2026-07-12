#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-sms-production-'));
const phone = '19900009771';
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/atK3qsAAAAASUVORK5CYII=';
let backendProcess = null;
let baseUrl = '';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    method: options.method || 'GET',
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  assert.equal(response.status, options.expectedStatus || 200, `${options.method || 'GET'} ${pathname}: ${text}`);
  return payload;
}

async function waitForBackend() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('backend start timeout');
}

async function startBackend(name, env = {}) {
  const port = await getFreePort();
  const statePath = path.join(tmpDir, `${name}.json`);
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      APIMART_API_KEY: '',
      AMAP_WEB_SERVICE_KEY: '',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_ADMIN_PASSWORD: 'SmsProductionAdmin-Strong-2026',
      LUMII_ADMIN_USERNAME: 'admin',
      LUMII_BACKEND_STATE_PATH: statePath,
      LUMII_ALLOW_LEGACY_LOCAL_AUTH: 'true',
      LUMII_PUBLIC_API_BASE_URL: '',
      LUMII_REQUIRE_LEGAL_CONSENT: 'true',
      LUMII_TOKEN_SECRET: 'sms-production-smoke-token-secret-32-bytes',
      NODE_ENV: 'production',
      NODE_NO_WARNINGS: '1',
      PET_AVATAR_ANIMATION_PROVIDER: 'mock',
      PET_AVATAR_PROVIDER: 'mock',
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '100',
      SMS_DEVICE_DAILY_LIMIT: '100',
      SMS_IP_DAILY_LIMIT: '100',
      SMS_LOGIN_ACCOUNT_MAX_FAILURES: '6',
      SMS_LOGIN_CLIENT_MAX_FAILURES: '3',
      SMS_LOGIN_FAILURE_WINDOW_MS: '60000',
      SMS_LOGIN_LOCK_MS: '60000',
      SMS_VERIFY_MAX_ATTEMPTS: '3',
      SPUG_SMS_BASE_URL: '',
      SPUG_SMS_TEMPLATE_ID: '',
      STATE_BACKUP_DIR: path.join(tmpDir, `${name}-backups`),
      STATE_BACKUP_MIN_INTERVAL_MS: '0',
      TENCENTCLOUD_SECRET_ID: '',
      TENCENTCLOUD_SECRET_KEY: '',
      TENCENT_CLOUD_SECRET_ID: '',
      TENCENT_CLOUD_SECRET_KEY: '',
      TTAPI_API_KEY: '',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  backendProcess.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
    if (process.env.SMOKE_VERBOSE) process.stderr.write(chunk);
  });
  backendProcess.once('exit', (code) => {
    if (code && stderr && process.env.SMOKE_VERBOSE) process.stderr.write(stderr);
  });
  await waitForBackend();
  return { statePath };
}

async function stopBackend() {
  const child = backendProcess;
  backendProcess = null;
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolve();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

async function expectProductionMockRejected() {
  const port = await getFreePort();
  const child = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      LUMII_ADMIN_PASSWORD: 'SmsProductionAdmin-Strong-2026',
      LUMII_ADMIN_USERNAME: 'admin',
      LUMII_BACKEND_STATE_PATH: path.join(tmpDir, 'forbidden-mock.json'),
      LUMII_TOKEN_SECRET: 'sms-production-smoke-token-secret-32-bytes',
      LUMII_SMS_PROVIDER: 'mock',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const code = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('production mock SMS backend unexpectedly started'));
    }, 10_000);
    child.once('exit', (exitCode) => {
      clearTimeout(timeout);
      resolve(exitCode);
    });
  });
  assert.notEqual(code, 0);
  assert.match(stderr, /Mock SMS provider is forbidden in production/);
}

async function expectProductionConfigRejected(name, overrides, pattern) {
  const port = await getFreePort();
  const child = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      LUMII_ADMIN_PASSWORD: 'SmsProductionAdmin-Strong-2026',
      LUMII_ADMIN_USERNAME: 'admin',
      LUMII_BACKEND_STATE_PATH: path.join(tmpDir, `${name}.json`),
      LUMII_SMS_PROVIDER: 'disabled',
      LUMII_TOKEN_SECRET: 'sms-production-smoke-token-secret-32-bytes',
      NODE_ENV: 'production',
      ...overrides,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const code = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${name} unexpectedly started the backend`));
    }, 10_000);
    child.once('exit', (exitCode) => {
      clearTimeout(timeout);
      resolve(exitCode);
    });
  });
  assert.notEqual(code, 0);
  assert.match(stderr, pattern);
}

async function startTencentSmsMock() {
  const deliveries = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      deliveries.push({ headers: req.headers, payload });
      const index = deliveries.length;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        Response: {
          RequestId: `sms-request-${index}`,
          SendStatusSet: [{
            Code: 'Ok',
            Message: 'send success',
            PhoneNumber: payload.PhoneNumberSet?.[0] || '',
            SerialNo: `sms-serial-${index}`,
          }],
        },
      }));
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    close: () => new Promise((resolve) => server.close(resolve)),
    deliveries,
    endpoint: `http://127.0.0.1:${address.port}`,
  };
}

async function startSpugSmsMock(responseFactory = null) {
  const deliveries = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      deliveries.push({ headers: req.headers, path: req.url, payload });
      const index = deliveries.length;
      const response = responseFactory
        ? responseFactory({ index, payload, req })
        : { body: { code: 200, data: { request_id: `spug-request-${index}` }, msg: '请求成功' }, status: 200 };
      res.writeHead(response.status || 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response.body));
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}/send`,
    close: () => new Promise((resolve) => server.close(resolve)),
    deliveries,
  };
}

async function adminToken() {
  const login = await request('/admin/auth/login', {
    body: { password: 'SmsProductionAdmin-Strong-2026', username: 'admin' },
    method: 'POST',
  });
  return login.data.token;
}

async function main() {
  await expectProductionConfigRejected('missing-token-secret', { LUMII_TOKEN_SECRET: '' }, /Production requires LUMII_TOKEN_SECRET/);
  await expectProductionConfigRejected('missing-admin-password', { LUMII_ADMIN_PASSWORD: '' }, /Production requires explicit LUMII_ADMIN_USERNAME and LUMII_ADMIN_PASSWORD/);
  await expectProductionConfigRejected('default-admin-password', { LUMII_ADMIN_PASSWORD: 'LumiiAdmin@2026' }, /Production admin password must be at least 16 characters/);
  await expectProductionMockRejected();

  await startBackend('disabled', { LUMII_SMS_PROVIDER: 'disabled' });
  try {
    const legacyToken = await request('/me', {
      expectedStatus: 401,
      token: `lumii-local-${phone}`,
    });
    assert.equal(legacyToken.error?.code, 'AUTH_REQUIRED', 'production must reject unsigned legacy phone tokens even when the compatibility flag is set');
    const send = await request('/auth/sms/send', {
      body: { deviceId: 'sms-disabled-device', phone },
      expectedStatus: 503,
      method: 'POST',
    });
    assert.equal(send.error?.code, 'SMS_PROVIDER_UNAVAILABLE');
    const bypass = await request('/auth/sms/verify', {
      body: { code: '962464', phone },
      expectedStatus: 400,
      method: 'POST',
    });
    assert.equal(bypass.error?.code, 'SMS_CODE_INVALID');
    const health = await request('/health');
    assert.equal(health.data.users, 0, 'failed SMS delivery must not create a user');
    const admin = await adminToken();
    const systemHealth = await request('/admin/system/health', { token: admin });
    assert.ok(systemHealth.data.checks.some((item) => item.key === 'sms_provider' && item.status === 'bad'));
    assert.ok(systemHealth.data.checks.some((item) => item.key === 'legacy_local_auth' && item.status === 'ok'));
    const readiness = await request('/admin/launch/readiness', { token: admin });
    assert.equal(readiness.data.gaps.find((item) => item.key === 'sms_delivery')?.status, 'blocked');
    assert.equal(readiness.data.gaps.find((item) => item.key === 'auth_session_security')?.status, 'ready');
  } finally {
    await stopBackend();
  }

  const tencentSmsMock = await startTencentSmsMock();
  await startBackend('tencent-compatibility', {
    LUMII_SMS_PROVIDER: 'tencent',
    TENCENTCLOUD_SECRET_ID: 'AKID_SMS_SMOKE',
    TENCENTCLOUD_SECRET_KEY: 'sms-smoke-secret-key',
    TENCENT_SMS_ENDPOINT: tencentSmsMock.endpoint,
    TENCENT_SMS_REGION: 'ap-guangzhou',
    TENCENT_SMS_SDK_APP_ID: '1400000000',
    TENCENT_SMS_SIGN_NAME: '灵伴',
    TENCENT_SMS_TEMPLATE_ID: '1000000',
  });
  try {
    const sent = await request('/auth/sms/send', {
      body: { deviceId: 'sms-tencent-compatibility-device', phone: '19900009770' },
      method: 'POST',
    });
    assert.equal(sent.data.provider, 'tencent');
    assert.equal(tencentSmsMock.deliveries.length, 1);
    const delivery = tencentSmsMock.deliveries[0];
    assert.equal(delivery.headers['x-tc-action'], 'SendSms');
    assert.match(delivery.headers.authorization || '', /^TC3-HMAC-SHA256 /);
    assert.equal(delivery.payload.PhoneNumberSet[0], '+8619900009770');
  } finally {
    await stopBackend();
    await tencentSmsMock.close();
  }

  const rejectedSpugMock = await startSpugSmsMock(() => ({ body: { code: 403, msg: 'provider rejected request' }, status: 200 }));
  await startBackend('spug-rejected', {
    LUMII_SMS_PROVIDER: 'spug',
    SPUG_SMS_BASE_URL: rejectedSpugMock.baseUrl,
    SPUG_SMS_TEMPLATE_ID: 'SpugRejectedTemplate',
  });
  try {
    const rejected = await request('/auth/sms/send', {
      body: { deviceId: 'sms-spug-rejected-device', phone: '19900009772' },
      expectedStatus: 503,
      method: 'POST',
    });
    assert.equal(rejected.error?.code, 'SMS_PROVIDER_UNAVAILABLE');
    assert.equal(rejectedSpugMock.deliveries.length, 1);
    const health = await request('/health');
    assert.equal(health.data.users, 0, 'rejected Spug delivery must not create a user');
  } finally {
    await stopBackend();
    await rejectedSpugMock.close();
  }

  const smsMock = await startSpugSmsMock();
  const spugTemplateId = 'SpugProductionSmokeTemplate';
  const { statePath } = await startBackend('spug', {
    LUMII_SMS_PROVIDER: 'spug',
    SPUG_SMS_BASE_URL: smsMock.baseUrl,
    SPUG_SMS_SENDER_NAME: '灵伴',
    SPUG_SMS_TEMPLATE_ID: spugTemplateId,
  });
  try {
    const sent = await request('/auth/sms/send', {
      body: { deviceId: 'sms-production-device', phone },
      method: 'POST',
    });
    assert.equal(sent.data.provider, 'spug');
    assert.equal(Object.hasOwn(sent.data, 'code'), false, 'production SMS response must not expose the OTP');
    assert.equal(smsMock.deliveries.length, 1);
    const firstDelivery = smsMock.deliveries[0];
    assert.equal(firstDelivery.path, `/send/${spugTemplateId}`);
    assert.match(firstDelivery.headers['content-type'] || '', /^application\/json/);
    assert.equal(firstDelivery.payload.targets, phone);
    assert.equal(firstDelivery.payload.name, '灵伴');
    const loginCode = firstDelivery.payload.code;
    assert.match(loginCode, /^\d{6}$/);
    const fixedBypassCode = loginCode === '962464' ? '000000' : '962464';

    const persistedBeforeVerify = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(Object.hasOwn(persistedBeforeVerify.sms[phone], 'code'), false);
    assert.match(persistedBeforeVerify.sms[phone].codeHash, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(persistedBeforeVerify).includes(loginCode), false, 'state must not contain the plaintext OTP');

    const fixedBypass = await request('/auth/sms/verify', {
      body: { code: fixedBypassCode, deviceId: 'sms-production-device', phone },
      expectedStatus: 400,
      method: 'POST',
    });
    assert.equal(fixedBypass.error?.code, 'SMS_CODE_INVALID');
    const legalConsentRequired = await request('/auth/sms/verify', {
      body: { code: loginCode, deviceId: 'sms-production-device', phone },
      expectedStatus: 400,
      method: 'POST',
    });
    assert.equal(legalConsentRequired.error?.code, 'LEGAL_CONSENT_REQUIRED');
    const verified = await request('/auth/sms/verify', {
      body: { code: loginCode, deviceId: 'sms-production-device', legalConsentAccepted: true, phone },
      method: 'POST',
    });
    assert.ok(verified.data?.token);
    assert.ok(verified.data.account?.legalConsent?.termsVersion);
    assert.ok(verified.data.account?.legalConsent?.privacyVersion);
    const userToken = verified.data.token;
    const pet = await request('/pets', {
      body: { birthday: '2024-01-01', breed: 'dog', gender: 'male', name: '生产守卫', species: 'dog', weightKg: 8 },
      method: 'POST',
      token: userToken,
    });
    const nearbyWithoutAmap = await request('/places/nearby?lat=23.12911&lng=113.264385', { token: userToken });
    assert.deepEqual(nearbyWithoutAmap.data, [], 'production must not return seed places when Amap is unavailable');
    const submissionWithoutLocation = await request('/places/submissions', {
      body: { address: 'Production Guard Road 1', content: 'pet friendly production guard', name: 'Production Guard Place' },
      expectedStatus: 400,
      method: 'POST',
      token: userToken,
    });
    assert.equal(submissionWithoutLocation.error?.code, 'PLACE_LOCATION_REQUIRED');
    const submissionWithStaleLocation = await request('/places/submissions', {
      body: {
        address: 'Production Guard Road 1',
        content: 'pet friendly production guard',
        location: { latitude: 23.12911, longitude: 113.264385, updatedAt: Date.now() - 11 * 60 * 1000 },
        name: 'Production Guard Place',
      },
      expectedStatus: 400,
      method: 'POST',
      token: userToken,
    });
    assert.equal(submissionWithStaleLocation.error?.code, 'PLACE_LOCATION_STALE');
    const submissionLocation = { accuracy: 16, latitude: 23.12911, longitude: 113.264385, updatedAt: Date.now() };
    const locatedSubmission = await request('/places/submissions', {
      body: {
        address: 'Production Guard Road 1',
        content: 'pet friendly production guard',
        location: submissionLocation,
        name: 'Production Guard Place',
      },
      method: 'POST',
      token: userToken,
    });
    assert.equal(locatedSubmission.data.latitude, submissionLocation.latitude);
    assert.equal(locatedSubmission.data.longitude, submissionLocation.longitude);
    const upload = await request('/media/uploads', {
      body: {
        base64: `data:image/png;base64,${tinyPngBase64}`,
        fileName: 'production-guard.png',
        mimeType: 'image/png',
        source: 'pet_avatar',
      },
      method: 'POST',
      token: userToken,
    });
    const mockAvatarBlocked = await request('/ai/pet-avatar/jobs', {
      body: { mediaId: upload.data.mediaId },
      expectedStatus: 503,
      method: 'POST',
      token: userToken,
    });
    assert.equal(mockAvatarBlocked.error?.code, 'AVATAR_PROVIDER_UNAVAILABLE');
    const usageAfterMockBlock = await request('/ai/usage', { token: userToken });
    assert.equal(usageAfterMockBlock.data.daily.petAvatar.count, 0, 'provider preflight rejection must not consume avatar quota');
    const missingAvatarBlocked = await request(`/pets/${encodeURIComponent(pet.data.id)}/avatar`, {
      body: {},
      expectedStatus: 400,
      method: 'POST',
      token: userToken,
    });
    assert.equal(missingAvatarBlocked.error?.code, 'AVATAR_RESULT_REQUIRED');
    const arbitraryAvatarBlocked = await request(`/pets/${encodeURIComponent(pet.data.id)}/avatar`, {
      body: { avatarUrl: 'https://example.com/not-a-generated-avatar.png' },
      expectedStatus: 400,
      method: 'POST',
      token: userToken,
    });
    assert.equal(arbitraryAvatarBlocked.error?.code, 'AVATAR_RESULT_INVALID');
    const fixtureAvatarBlocked = await request(`/pets/${encodeURIComponent(pet.data.id)}/avatar`, {
      body: { avatarUrl: 'lumii://golden-retriever-avatar' },
      expectedStatus: 503,
      method: 'POST',
      token: userToken,
    });
    assert.equal(fixtureAvatarBlocked.error?.code, 'AVATAR_PROVIDER_UNAVAILABLE');
    const reused = await request('/auth/sms/verify', {
      body: { code: loginCode, deviceId: 'sms-production-device', phone },
      expectedStatus: 400,
      method: 'POST',
    });
    assert.equal(reused.error?.code, 'SMS_CODE_USED');

    const secondSent = await request('/auth/sms/send', {
      body: { deviceId: 'sms-production-device', phone },
      method: 'POST',
    });
    assert.equal(smsMock.deliveries.length, 2);
    const secondLoginCode = smsMock.deliveries[1].payload.code;
    assert.match(secondLoginCode, /^\d{6}$/);
    assert.equal(secondSent.data.provider, 'spug');
    const wrongLoginCode = secondLoginCode === '000000' ? '111111' : '000000';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const failed = await request('/auth/sms/verify', {
        body: { code: wrongLoginCode, deviceId: 'sms-production-device', phone },
        expectedStatus: attempt === 3 ? 429 : 400,
        method: 'POST',
      });
      assert.equal(failed.error?.code, attempt === 3 ? 'SMS_LOGIN_LOCKED' : 'SMS_CODE_INVALID');
    }
    const blockedSend = await request('/auth/sms/send', {
      body: { deviceId: 'sms-production-device', phone },
      expectedStatus: 429,
      method: 'POST',
    });
    assert.equal(blockedSend.error?.code, 'SMS_LOGIN_LOCKED');
    assert.equal(smsMock.deliveries.length, 2, 'locked login must not send another SMS');

    const admin = await adminToken();
    const usersBeforeUnlock = await request('/admin/users', { token: admin });
    const lockedUser = usersBeforeUnlock.data.find((item) => item.phone === phone);
    assert.equal(lockedUser?.loginSecurity?.locked, true);
    assert.equal(lockedUser?.loginSecurity?.clientFailedAttempts, 3);
    const unlocked = await request(`/admin/users/${encodeURIComponent(phone)}/login-lock/unlock`, {
      body: { reason: 'production smoke identity verified' },
      method: 'POST',
      token: admin,
    });
    assert.equal(unlocked.data.loginSecurity.locked, false);
    assert.ok(unlocked.data.clearedRecords >= 1);
    const unlockAudit = await request('/admin/audit-logs?action=user.sms_login.unlock', { token: admin });
    assert.ok(unlockAudit.data.items.some((item) => item.targetId === phone));

    const sentAfterUnlock = await request('/auth/sms/send', {
      body: { deviceId: 'sms-production-device', phone },
      method: 'POST',
    });
    assert.equal(sentAfterUnlock.data.provider, 'spug');
    assert.equal(smsMock.deliveries.length, 3);
    const loginCodeAfterUnlock = smsMock.deliveries[2].payload.code;
    const verifiedAfterUnlock = await request('/auth/sms/verify', {
      body: { code: loginCodeAfterUnlock, deviceId: 'sms-production-device', legalConsentAccepted: true, phone },
      method: 'POST',
    });
    assert.ok(verifiedAfterUnlock.data?.token);
    const systemHealth = await request('/admin/system/health', { token: admin });
    assert.equal(systemHealth.data.smsProvider.provider, 'spug');
    assert.equal(JSON.stringify(systemHealth.data).includes(spugTemplateId), false, 'admin health must not expose the Spug template credential');
    assert.ok(systemHealth.data.checks.some((item) => item.key === 'sms_provider' && item.status === 'ok'));
    assert.ok(systemHealth.data.checks.some((item) => item.key === 'sms_login_lockout' && item.status === 'ok'));
    assert.ok(systemHealth.data.checks.some((item) => item.key === 'pet_avatar_provider' && item.status === 'bad'));
    assert.ok(systemHealth.data.checks.some((item) => item.key === 'amap' && item.status === 'bad'));
    assert.ok(systemHealth.data.checks.some((item) => item.key === 'place_location_integrity' && item.status === 'ok'));
    const readiness = await request('/admin/launch/readiness', { token: admin });
    assert.equal(readiness.data.gaps.find((item) => item.key === 'sms_delivery')?.status, 'ready');
    assert.equal(readiness.data.gaps.find((item) => item.key === 'ai_runtime')?.status, 'blocked');
    assert.equal(readiness.data.gaps.find((item) => item.key === 'place_discovery')?.status, 'blocked');

    const deletion = await request('/account/delete/request', {
      body: { deviceId: 'sms-production-device' },
      method: 'POST',
      token: verifiedAfterUnlock.data.token,
    });
    assert.equal(Object.hasOwn(deletion.data, 'code'), false, 'production account deletion response must not expose the OTP');
    assert.equal(smsMock.deliveries.length, 4);
    const deletionCode = smsMock.deliveries[3].payload.code;
    assert.match(deletionCode, /^\d{6}$/);
    const wrongDeletion = await request('/account/delete/confirm', {
      body: { code: '000000' },
      expectedStatus: 400,
      method: 'POST',
      token: verifiedAfterUnlock.data.token,
    });
    assert.equal(wrongDeletion.error?.code, 'ACCOUNT_DELETE_CODE_INVALID');
    const confirmed = await request('/account/delete/confirm', {
      body: { code: deletionCode },
      method: 'POST',
      token: verifiedAfterUnlock.data.token,
    });
    assert.equal(confirmed.data.status, 'deletion_pending');
  } finally {
    await stopBackend();
    await smsMock.close();
  }

  await startBackend('ai-ready', {
    APIMART_API_KEY: 'apimart-production-smoke-key',
    AMAP_WEB_SERVICE_KEY: 'amap-production-smoke-key',
    DEEPSEEK_API_KEY: 'deepseek-production-smoke-key',
    GPT_IMAGE2_API_KEY: 'gpt-image-production-smoke-key',
    LUMII_SMS_PROVIDER: 'disabled',
    PET_AVATAR_ANIMATION_PROVIDER: 'doubao-seedance-1-5-pro',
    PET_AVATAR_PROVIDER: 'gpt-image-2',
  });
  try {
    const admin = await adminToken();
    const health = await request('/admin/system/health', { token: admin });
    assert.ok(health.data.checks.some((item) => item.key === 'pet_avatar_provider' && item.status === 'ok'));
    assert.ok(health.data.checks.some((item) => item.key === 'pet_avatar_animation_provider' && item.status === 'ok'));
    assert.ok(health.data.checks.some((item) => item.key === 'deepseek' && item.status === 'ok'));
    assert.ok(health.data.checks.some((item) => item.key === 'amap' && item.status === 'ok'));
    const readiness = await request('/admin/launch/readiness', { token: admin });
    assert.equal(readiness.data.gaps.find((item) => item.key === 'ai_runtime')?.status, 'ready');
    assert.equal(readiness.data.gaps.find((item) => item.key === 'place_discovery')?.status, 'ready');
  } finally {
    await stopBackend();
  }

  console.log('production SMS security smoke passed');
}

main().catch(async (error) => {
  await stopBackend();
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  fs.rmSync(tmpDir, { force: true, recursive: true });
});
