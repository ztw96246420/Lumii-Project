#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-pet-medical-rules-'));
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

async function request(pathname, { body, method = 'GET', token } = {}) {
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
  assert.equal(response.status, 200, `${method} ${pathname} failed: ${text}`);
  return payload;
}

async function waitForBackend() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const payload = await request('/legal/privacy');
      if (payload.state === 'success') return;
    } catch {}
    await delay(100);
  }
  throw new Error('backend did not become ready');
}

async function startBackend(port) {
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      AMAP_WEB_SERVICE_KEY: '',
      DEEPSEEK_API_KEY: '',
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
    stdio: ['ignore', 'ignore', 'pipe'],
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
  await request('/auth/sms/send', { body: { deviceId: `pet-medical-rules-${phone}`, phone }, method: 'POST' });
  const payload = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 300_000, phone },
    method: 'POST',
  });
  return payload.data.token;
}

async function loginAdmin() {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  return payload.data.token;
}

async function main() {
  const port = await getFreePort();
  await startBackend(port);
  try {
    const userToken = await loginUser('19900007761');
    const adminToken = await loginAdmin();
    await request('/pets', {
      body: { birthday: '2023-02-03', breed: 'British Shorthair', gender: 'male', name: '团团', species: 'cat', weightKg: 5.1 },
      method: 'POST',
      token: userToken,
    });

    const cases = [
      ['团团刚刚吞了一颗人用药片', 'toxic_ingestion', 'critical'],
      ['团团现在张嘴呼吸，喘不过气', 'respiratory_distress', 'critical'],
      ['团团突然抽搐，之后站不起来', 'neurologic_emergency', 'critical'],
      ['团团伤口流血不止', 'major_bleeding', 'critical'],
      ['团团刚刚被车撞了，可能骨折', 'severe_trauma', 'critical'],
      ['团团频繁进猫砂盆但是没有尿', 'urinary_emergency', 'critical'],
      ['团团今天中暑了，现在很虚弱', 'heatstroke', 'critical'],
      ['我家猫生产时胎儿卡住了', 'obstetric_emergency', 'critical'],
      ['团团肚子突然鼓起来，还一直干呕吐不出', 'acute_abdominal_emergency', 'critical'],
      ['团团从今天早上一直呕吐，已经吐了很多次', 'persistent_gastrointestinal', 'urgent'],
      ['团团今天不吃不喝，精神极差不动', 'medical_emergency', 'urgent'],
    ];

    for (const [text, reason, severity] of cases) {
      const reply = await request('/ai/pet-chat/messages', { body: { text }, method: 'POST', token: userToken });
      assert.equal(reply.data.medicalAlert?.reason, reason, `${reason} should be detected`);
      assert.equal(reply.data.medicalAlert?.severity, severity, `${reason} should expose severity`);
      assert.match(reply.data.text || '', /宠物医院|兽医|急诊/, `${reason} should return safety guidance`);
      assert.equal(Object.keys(reply.data).some((key) => key.startsWith('admin')), false, 'medical response must not expose admin fields');
    }

    const negativeCases = [
      '团团今天没有呼吸困难，精神和食欲都很好',
      '怎么判断宠物是否呼吸困难？我想学习一下',
      '我想了解巧克力中毒的表现',
      'My dog has no difficulty breathing and is acting normally.',
      '团团以前摔伤过，不过现在已经完全恢复',
    ];
    for (const text of negativeCases) {
      const reply = await request('/ai/pet-chat/messages', { body: { text }, method: 'POST', token: userToken });
      assert.equal(reply.data.medicalAlert, undefined, `non-current or negated symptom must not trigger: ${text}`);
    }

    const medicalRows = await request('/admin/ai/pet-chat/messages?flag=medical', { token: adminToken });
    assert.equal(medicalRows.data.length, cases.length);
    const reasons = new Set(medicalRows.data.map((row) => row.medicalReason));
    cases.forEach(([, reason]) => assert.equal(reasons.has(reason), true, `admin queue missing ${reason}`));
    medicalRows.data.forEach((row) => {
      assert.ok(row.medicalReasonLabel, 'admin medical row should expose localized risk label');
      assert.ok(['critical', 'urgent'].includes(row.medicalSeverity), 'admin medical row should expose severity');
    });

    const notifications = await request('/notifications', { token: userToken });
    assert.ok(notifications.data.filter((item) => item.kind === 'medical_alert').length >= cases.length);
  } finally {
    await stopBackend();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  fs.rmSync(tmpDir, { force: true, recursive: true });
  console.error(error);
  process.exit(1);
});
