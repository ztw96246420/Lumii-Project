#!/usr/bin/env node

process.env.NODE_NO_WARNINGS = '1';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { createSqliteStateStore } = require('./state-sqlite.cjs');

const TEST_CODE = '962464';
const TEST_PHONE = '19900009881';
const rootDir = path.resolve(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-state-sqlite-'));
const statePath = path.join(tmpDir, 'state.json');
const databasePath = path.join(tmpDir, 'state.sqlite');
const backupDir = path.join(tmpDir, 'state-backups');
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

async function startBackend(driver) {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      AMAP_WEB_SERVICE_KEY: '',
      DEEPSEEK_API_KEY: '',
      GPT_IMAGE2_API_KEY: '',
      LUMII_BACKEND_STATE_PATH: statePath,
      LUMII_PUBLIC_API_BASE_URL: '',
      LUMII_STATE_SQLITE_PATH: databasePath,
      LUMII_STATE_STORAGE_DRIVER: driver,
      NODE_ENV: 'test',
      PET_AVATAR_ANIMATION_PROVIDER: 'mock',
      PET_AVATAR_PROVIDER: 'mock',
      SMS_COOLDOWN_MS: '0',
      STATE_BACKUP_DIR: backupDir,
      STATE_BACKUP_MIN_INTERVAL_MS: '0',
      STATE_BACKUP_RETAIN: '20',
      TENCENTCLOUD_SECRET_ID: '',
      TENCENTCLOUD_SECRET_KEY: '',
      TENCENT_CLOUD_SECRET_ID: '',
      TENCENT_CLOUD_SECRET_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  backendProcess.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
    if (process.env.SMOKE_VERBOSE) process.stderr.write(chunk);
  });
  backendProcess.stdout.on('data', (chunk) => {
    if (process.env.SMOKE_VERBOSE) process.stdout.write(chunk);
  });
  backendProcess.once('exit', (code) => {
    if (code && stderr) process.stderr.write(stderr);
  });
  await waitForBackend();
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

async function login() {
  await request('/auth/sms/send', {
    body: { deviceId: 'sqlite-state-smoke', phone: TEST_PHONE },
    method: 'POST',
  });
  const verified = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, phone: TEST_PHONE },
    method: 'POST',
  });
  assert.ok(verified.data?.token);
  return verified.data.token;
}

async function adminToken() {
  const loginResult = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  return loginResult.data.token;
}

function verifyRevisionConflict() {
  const conflictPath = path.join(tmpDir, 'conflict.sqlite');
  const firstStore = createSqliteStateStore({ databasePath: conflictPath });
  const secondStore = createSqliteStateStore({ databasePath: conflictPath });
  try {
    const initial = firstStore.initialize(JSON.stringify({ users: {} }), 'smoke_initial');
    const secondLoaded = secondStore.load();
    assert.equal(secondLoaded.revision, initial.revision);
    const saved = firstStore.save(JSON.stringify({ users: { first: {} } }), initial.revision, 'smoke_first');
    assert.equal(saved.revision, initial.revision + 1);
    assert.throws(
      () => secondStore.save(JSON.stringify({ users: { second: {} } }), secondLoaded.revision, 'smoke_conflict'),
      (error) => error?.code === 'STATE_SQLITE_REVISION_CONFLICT',
    );
    const latest = secondStore.load();
    assert.equal(latest.revision, saved.revision);
    assert.equal(firstStore.info().healthy, true);
    assert.equal(firstStore.info().journalMode, 'wal');
  } finally {
    secondStore.close();
    firstStore.close();
  }
}

async function verifyInvalidMigrationFailsClosed() {
  const invalidDir = path.join(tmpDir, 'invalid-migration');
  const invalidStatePath = path.join(invalidDir, 'state.json');
  const invalidDatabasePath = path.join(invalidDir, 'state.sqlite');
  const invalidBackupDir = path.join(invalidDir, 'backups');
  fs.mkdirSync(invalidBackupDir, { recursive: true });
  fs.writeFileSync(invalidStatePath, '{invalid-json');
  const port = await getFreePort();
  const child = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      LUMII_BACKEND_STATE_PATH: invalidStatePath,
      LUMII_STATE_SQLITE_PATH: invalidDatabasePath,
      LUMII_STATE_STORAGE_DRIVER: 'sqlite',
      NODE_NO_WARNINGS: '1',
      STATE_BACKUP_DIR: invalidBackupDir,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const exitCode = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('invalid SQLite migration unexpectedly started the backend'));
    }, 10_000);
    child.once('exit', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  assert.notEqual(exitCode, 0);
  assert.match(stderr, /Refusing to initialize SQLite from invalid JSON state without a valid backup/);
}

async function main() {
  verifyRevisionConflict();
  await verifyInvalidMigrationFailsClosed();

  await startBackend('json');
  let token;
  try {
    token = await login();
    const updated = await request('/me', {
      body: { ownerBio: 'SQLite migration smoke', ownerName: 'JsonOwner' },
      method: 'PATCH',
      token,
    });
    assert.equal(updated.data.ownerName, 'JsonOwner');
  } finally {
    await stopBackend();
  }
  assert.equal(fs.existsSync(statePath), true);
  assert.ok(fs.readdirSync(backupDir).some((name) => name.endsWith('.json.gz')));

  await startBackend('sqlite');
  try {
    const profile = await request('/me', { token });
    assert.equal(profile.data.ownerName, 'JsonOwner');
    const updated = await request('/me', {
      body: { ownerBio: 'SQLite authoritative state', ownerName: 'SqliteOwner' },
      method: 'PATCH',
      token,
    });
    assert.equal(updated.data.ownerName, 'SqliteOwner');
    const admin = await adminToken();
    const health = await request('/admin/system/health', { token: admin });
    assert.equal(health.data.stateStorage.driver, 'sqlite');
    assert.equal(health.data.stateStorage.healthy, true);
    assert.equal(health.data.stateStorage.journalMode, 'wal');
    assert.ok(health.data.checks.some((item) => item.key === 'state_database' && item.status === 'ok'));
    const readiness = await request('/admin/launch/readiness', { token: admin });
    const storageGap = readiness.data.gaps.find((item) => item.key === 'state_storage');
    assert.equal(storageGap.status, 'ready');
  } finally {
    await stopBackend();
  }

  const store = createSqliteStateStore({ databasePath });
  try {
    const snapshot = store.load();
    assert.ok(snapshot.revision >= 2);
    assert.equal(JSON.parse(snapshot.jsonText).users[TEST_PHONE].ownerName, 'SqliteOwner');
    assert.equal(store.info().quickCheck, 'ok');
  } finally {
    store.close();
  }

  fs.unlinkSync(statePath);
  await startBackend('sqlite');
  try {
    const profile = await request('/me', { token });
    assert.equal(profile.data.ownerName, 'SqliteOwner');
    assert.equal(fs.existsSync(statePath), true, 'SQLite startup should rebuild the JSON rollback mirror');
  } finally {
    await stopBackend();
  }

  const database = new DatabaseSync(databasePath);
  database.prepare("UPDATE lumii_state_snapshot SET checksum_sha256 = 'corrupt' WHERE singleton_id = 1").run();
  database.close();
  await startBackend('sqlite');
  try {
    const profile = await request('/me', { token });
    assert.equal(profile.data.ownerName, 'SqliteOwner');
    const admin = await adminToken();
    const health = await request('/admin/system/health', { token: admin });
    assert.equal(health.data.stateStorage.healthy, true);
    assert.equal(health.data.stateBackups.loadedFromBackup, true);
  } finally {
    await stopBackend();
  }

  console.log('SQLite state migration and recovery smoke passed');
}

main().catch(async (error) => {
  await stopBackend();
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  fs.rmSync(tmpDir, { force: true, recursive: true });
});
