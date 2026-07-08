#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-media-cdn-probe-'));
const statePath = path.join(tmpDir, 'state.json');
let backendProcess = null;
let cdnServer = null;
let originServer = null;
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

function writeProbeState() {
  const now = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify({
    mediaUploads: {
      'media-probe': {
        createdAt: now,
        mediaId: 'media-probe',
        moderationStatus: 'approved',
        objectKey: 'cdn-probe/sample.png',
        objectUrl: 'http://unused.example/storage/objects/cdn-probe%2Fsample.png',
        ownerPhone: '13531850966',
        updatedAt: now,
      },
    },
  }, null, 2));
}

async function startFakeCdn() {
  cdnServer = http.createServer((req, res) => {
    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Cache-Control': 'max-age=3600',
        'Content-Length': '1234',
        'Content-Type': 'image/png',
        'X-Cache-Lookup': 'Cache Miss',
        'X-NWS-LOG-UUID': 'smoke-head',
      });
      res.end();
      return;
    }
    res.writeHead(302, {
      'Cache-Control': 'max-age=3600',
      Location: 'https://dnspod.qcloud.com/static/webblock.html?d=media.lumiiapp.cn',
      Server: 'OverSea_SLT',
      'X-Cache-Lookup': 'Cache Miss',
      'X-NWS-LOG-UUID': 'smoke-get',
    });
    res.end();
  });
  await new Promise((resolve, reject) => {
    cdnServer.once('error', reject);
    cdnServer.listen(0, '127.0.0.1', resolve);
  });
  const address = cdnServer.address();
  return `http://127.0.0.1:${address.port}`;
}

async function startFakeOrigin() {
  originServer = http.createServer((req, res) => {
    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Length': '1234',
        'Content-Type': 'image/png',
        Server: 'origin-smoke',
      });
      res.end();
      return;
    }
    res.writeHead(206, {
      'Content-Length': '1',
      'Content-Range': 'bytes 0-0/1234',
      'Content-Type': 'image/png',
      Server: 'origin-smoke',
    });
    res.end(Buffer.from([0]));
  });
  await new Promise((resolve, reject) => {
    originServer.once('error', reject);
    originServer.listen(0, '127.0.0.1', resolve);
  });
  const address = originServer.address();
  return `http://127.0.0.1:${address.port}`;
}

async function startBackend(port, appBaseUrl, cdnBaseUrl) {
  baseUrl = `http://127.0.0.1:${port}`;
  backendProcess = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      MEDIA_PUBLIC_PROBE_BASE_URL: cdnBaseUrl,
      MEDIA_PUBLIC_PROBE_TIMEOUT_MS: '3000',
      PET_AVATAR_PUBLIC_BASE_URL: appBaseUrl,
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

async function stopFakeCdn() {
  if (!cdnServer) return;
  const server = cdnServer;
  cdnServer = null;
  await new Promise((resolve) => server.close(resolve));
}

async function stopFakeOrigin() {
  if (!originServer) return;
  const server = originServer;
  originServer = null;
  await new Promise((resolve) => server.close(resolve));
}

async function loginAdmin() {
  const payload = await request('/admin/auth/login', {
    body: { password: 'LumiiAdmin@2026', username: 'admin' },
    method: 'POST',
  });
  assert.ok(payload.data?.token, 'missing admin token');
  return payload.data.token;
}

async function main() {
  writeProbeState();
  const appBaseUrl = await startFakeOrigin();
  const cdnBaseUrl = await startFakeCdn();
  const port = await getFreePort();
  await startBackend(port, appBaseUrl, cdnBaseUrl);
  try {
    const adminToken = await loginAdmin();
    const health = await request('/admin/system/health', { token: adminToken });
    const probe = health.data.mediaProbe;
    assert.equal(probe.kind, 'app');
    assert.equal(probe.status, 'ok');
    assert.equal(probe.head.status, 200);
    assert.equal(probe.get.status, 206);
    assert.equal(health.data.checks.some((item) => item.key === 'media_public_get' && item.status === 'ok'), true);

    const cdnProbe = health.data.mediaCdnProbe;
    assert.equal(cdnProbe.kind, 'cdn');
    assert.equal(cdnProbe.status, 'bad');
    assert.equal(cdnProbe.head.status, 200);
    assert.equal(cdnProbe.get.status, 302);
    assert.match(cdnProbe.get.headers.location, /webblock\.html/);
    assert.equal(health.data.checks.some((item) => item.key === 'media_cdn_get' && item.status === 'warn'), true);
    assert.notEqual(health.data.status, 'bad');
    console.log('media CDN probe smoke passed');
  } finally {
    await stopBackend();
    await stopFakeCdn();
    await stopFakeOrigin();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopFakeCdn();
  await stopFakeOrigin();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {
    // ignore cleanup errors
  }
  console.error(error);
  process.exit(1);
});
