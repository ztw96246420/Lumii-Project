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
      AMAP_WEB_SERVICE_KEY: '',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_ADMIN_PASSWORD: 'SmsProductionAdmin-Strong-2026',
      LUMII_ADMIN_USERNAME: 'admin',
      LUMII_BACKEND_STATE_PATH: statePath,
      LUMII_PUBLIC_API_BASE_URL: '',
      LUMII_TOKEN_SECRET: 'sms-production-smoke-token-secret-32-bytes',
      NODE_ENV: 'production',
      NODE_NO_WARNINGS: '1',
      PET_AVATAR_ANIMATION_PROVIDER: 'mock',
      PET_AVATAR_PROVIDER: 'mock',
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '100',
      SMS_DEVICE_DAILY_LIMIT: '100',
      SMS_IP_DAILY_LIMIT: '100',
      STATE_BACKUP_DIR: path.join(tmpDir, `${name}-backups`),
      STATE_BACKUP_MIN_INTERVAL_MS: '0',
      TENCENTCLOUD_SECRET_ID: '',
      TENCENTCLOUD_SECRET_KEY: '',
      TENCENT_CLOUD_SECRET_ID: '',
      TENCENT_CLOUD_SECRET_KEY: '',
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
    const readiness = await request('/admin/launch/readiness', { token: admin });
    assert.equal(readiness.data.gaps.find((item) => item.key === 'sms_delivery')?.status, 'blocked');
  } finally {
    await stopBackend();
  }

  const smsMock = await startTencentSmsMock();
  const { statePath } = await startBackend('tencent', {
    LUMII_SMS_PROVIDER: 'tencent',
    TENCENTCLOUD_SECRET_ID: 'AKID_SMS_SMOKE',
    TENCENTCLOUD_SECRET_KEY: 'sms-smoke-secret-key',
    TENCENT_SMS_ENDPOINT: smsMock.endpoint,
    TENCENT_SMS_REGION: 'ap-guangzhou',
    TENCENT_SMS_SDK_APP_ID: '1400000000',
    TENCENT_SMS_SIGN_NAME: '灵伴',
    TENCENT_SMS_TEMPLATE_ID: '1000000',
  });
  try {
    const sent = await request('/auth/sms/send', {
      body: { deviceId: 'sms-production-device', phone },
      method: 'POST',
    });
    assert.equal(sent.data.provider, 'tencent');
    assert.equal(Object.hasOwn(sent.data, 'code'), false, 'production SMS response must not expose the OTP');
    assert.equal(smsMock.deliveries.length, 1);
    const firstDelivery = smsMock.deliveries[0];
    assert.equal(firstDelivery.headers['x-tc-action'], 'SendSms');
    assert.match(firstDelivery.headers.authorization || '', /^TC3-HMAC-SHA256 /);
    assert.equal(firstDelivery.payload.PhoneNumberSet[0], `+86${phone}`);
    assert.equal(firstDelivery.payload.SmsSdkAppId, '1400000000');
    assert.equal(firstDelivery.payload.SignName, '灵伴');
    assert.equal(firstDelivery.payload.TemplateId, '1000000');
    const loginCode = firstDelivery.payload.TemplateParamSet[0];
    assert.match(loginCode, /^\d{6}$/);

    const persistedBeforeVerify = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(Object.hasOwn(persistedBeforeVerify.sms[phone], 'code'), false);
    assert.match(persistedBeforeVerify.sms[phone].codeHash, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(persistedBeforeVerify).includes(loginCode), false, 'state must not contain the plaintext OTP');

    const fixedBypass = await request('/auth/sms/verify', {
      body: { code: '962464', phone },
      expectedStatus: 400,
      method: 'POST',
    });
    assert.equal(fixedBypass.error?.code, 'SMS_CODE_INVALID');
    const verified = await request('/auth/sms/verify', {
      body: { code: loginCode, phone },
      method: 'POST',
    });
    assert.ok(verified.data?.token);
    const reused = await request('/auth/sms/verify', {
      body: { code: loginCode, phone },
      expectedStatus: 400,
      method: 'POST',
    });
    assert.equal(reused.error?.code, 'SMS_CODE_USED');

    const admin = await adminToken();
    const systemHealth = await request('/admin/system/health', { token: admin });
    assert.ok(systemHealth.data.checks.some((item) => item.key === 'sms_provider' && item.status === 'ok'));
    const readiness = await request('/admin/launch/readiness', { token: admin });
    assert.equal(readiness.data.gaps.find((item) => item.key === 'sms_delivery')?.status, 'ready');

    const deletion = await request('/account/delete/request', {
      body: { deviceId: 'sms-production-device' },
      method: 'POST',
      token: verified.data.token,
    });
    assert.equal(Object.hasOwn(deletion.data, 'code'), false, 'production account deletion response must not expose the OTP');
    assert.equal(smsMock.deliveries.length, 2);
    const deletionCode = smsMock.deliveries[1].payload.TemplateParamSet[0];
    assert.match(deletionCode, /^\d{6}$/);
    const wrongDeletion = await request('/account/delete/confirm', {
      body: { code: '000000' },
      expectedStatus: 400,
      method: 'POST',
      token: verified.data.token,
    });
    assert.equal(wrongDeletion.error?.code, 'ACCOUNT_DELETE_CODE_INVALID');
    const confirmed = await request('/account/delete/confirm', {
      body: { code: deletionCode },
      method: 'POST',
      token: verified.data.token,
    });
    assert.equal(confirmed.data.status, 'deletion_pending');
  } finally {
    await stopBackend();
    await smsMock.close();
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
