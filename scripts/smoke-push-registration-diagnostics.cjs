#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const PHONE = '19900006411';
const DEVICE_ID = 'push-diagnostic-device-1';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-push-registration-diagnostics-'));
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
  let lastError;
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

async function loginUser() {
  await request('/auth/sms/send', {
    body: { deviceId: 'push-registration-smoke-login', phone: PHONE },
    method: 'POST',
  });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 300_000, phone: PHONE },
    method: 'POST',
  });
  assert.ok(payload.data?.token);
  return payload.data.token;
}

async function loginAdmin() {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  assert.ok(payload.data?.token);
  return payload.data.token;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser();
    const adminToken = await loginAdmin();

    const initial = await request(`/devices/push-registration?deviceId=${DEVICE_ID}&platform=android`, { token: userToken });
    assert.equal(initial.data.status, 'not_attempted');
    assert.equal(initial.data.attemptCount, 0);

    await request('/devices/push-registration', {
      body: {
        appBuildNumber: 17,
        appVersion: '1.0.0',
        deviceId: DEVICE_ID,
        platform: 'android',
        stage: 'native_token',
        status: 'registering',
      },
      method: 'POST',
      token: userToken,
    });
    const failed = await request('/devices/push-registration', {
      body: {
        appBuildNumber: 17,
        appVersion: '1.0.0',
        deviceId: DEVICE_ID,
        failureCode: 'native_config_missing',
        platform: 'android',
        stage: 'native_token',
        status: 'failed',
      },
      method: 'POST',
      token: userToken,
    });
    assert.equal(failed.data.status, 'failed');
    assert.equal(failed.data.failureCode, 'native_config_missing');
    assert.equal(failed.data.attemptCount, 1);

    const invalid = await request('/devices/push-registration', {
      body: {
        deviceId: DEVICE_ID,
        failureCode: 'raw-provider-error-must-not-pass',
        platform: 'android',
        stage: 'native_token',
        status: 'failed',
      },
      expectedStatus: 400,
      method: 'POST',
      token: userToken,
    });
    assert.equal(invalid.error?.code, 'PUSH_REGISTRATION_INVALID');

    const notificationsBefore = await request('/admin/notifications', { token: adminToken });
    assert.equal(notificationsBefore.data.summary.devices, 0);
    assert.equal(notificationsBefore.data.summary.registrationFailures, 1);
    assert.equal(notificationsBefore.data.summary.registrationNativeConfigFailures, 1);
    const failedDevice = notificationsBefore.data.devices.find((item) => item.deviceId === DEVICE_ID);
    assert.equal(failedDevice.hasToken, false);
    assert.equal(failedDevice.registrationStatus, 'failed');
    assert.equal(failedDevice.registrationFailureCode, 'native_config_missing');

    const healthBefore = await request('/admin/system/health', { token: adminToken });
    const pushHealthBefore = healthBefore.data.checks.find((item) => item.key === 'expo_push');
    assert.equal(pushHealthBefore.status, 'warn');
    assert.match(pushHealthBefore.detail, /Firebase/);

    await request('/devices/push-token', {
      body: {
        deviceId: DEVICE_ID,
        platform: 'android',
        token: 'ExponentPushToken[push-registration-diagnostic-smoke]',
      },
      method: 'POST',
      token: userToken,
    });

    const registered = await request(`/devices/push-registration?deviceId=${DEVICE_ID}&platform=android`, { token: userToken });
    assert.equal(registered.data.status, 'registered');
    assert.equal(registered.data.stage, 'backend');
    assert.equal(registered.data.failureCode, undefined);
    assert.ok(registered.data.registeredAt);

    const notificationsAfter = await request('/admin/notifications', { token: adminToken });
    assert.equal(notificationsAfter.data.summary.devices, 1);
    assert.equal(notificationsAfter.data.summary.registeredDevices, 1);
    assert.equal(notificationsAfter.data.summary.registrationFailures, 0);
    const registeredDevice = notificationsAfter.data.devices.find((item) => item.deviceId === DEVICE_ID);
    assert.equal(registeredDevice.hasToken, true);
    assert.equal(registeredDevice.registrationStatus, 'registered');
    assert.equal(registeredDevice.tokenTail.length, 8);

    console.log('push registration diagnostics smoke passed');
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  fs.rmSync(tmpDir, { force: true, recursive: true });
  console.error(error);
  process.exitCode = 1;
});
