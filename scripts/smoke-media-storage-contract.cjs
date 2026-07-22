#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');

const TEST_CODE = '962464';
const TEST_PHONE = '19900008991';
const rootDir = path.join(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-media-storage-contract-'));
const statePath = path.join(tmpDir, 'state.json');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const expectedMediaCacheControl = 'public, max-age=60, s-maxage=300';

let backendProcess = null;
let cosServer = null;
let baseUrl = '';
let cosBaseUrl = '';
const cosObjects = new Map();
const cosPuts = [];

function pngCrc32(buffer) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const value of buffer) crc = table[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(pngCrc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function createFlatBackgroundPng() {
  const width = 100;
  const height = 100;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const foreground = x >= 30 && x < 70 && y >= 30 && y < 70;
      rgba[offset] = foreground ? 30 : 248;
      rgba[offset + 1] = foreground ? 40 : 248;
      rgba[offset + 2] = foreground ? 50 : 248;
      rgba[offset + 3] = 255;
    }
  }
  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    pngSignature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND'),
  ]);
}

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

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function startFakeCos(sourcePng, rawObjectKey) {
  cosObjects.set(rawObjectKey, sourcePng);
  cosServer = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://cos.test').pathname;
    if (req.method === 'GET' && pathname === '/source.png') {
      res.writeHead(200, {
        'Content-Length': sourcePng.length,
        'Content-Type': 'image/png',
      });
      res.end(sourcePng);
      return;
    }

    const objectKey = decodeURIComponent(pathname.replace(/^\/+/, ''));
    if (req.method === 'PUT') {
      const body = await readRequestBody(req);
      cosObjects.set(objectKey, body);
      cosPuts.push({ body, headers: req.headers, objectKey });
      res.writeHead(200, { ETag: '"put-etag"' });
      res.end();
      return;
    }

    const object = cosObjects.get(objectKey);
    if (!object) {
      res.writeHead(404, { 'Content-Type': 'application/xml' });
      res.end('<Error><Message>Not found</Message></Error>');
      return;
    }
    const commonHeaders = {
      'Accept-Ranges': 'bytes',
      'Content-Type': 'image/png',
      ETag: '"storage-contract-etag"',
    };
    if (req.method === 'HEAD') {
      res.writeHead(200, { ...commonHeaders, 'Content-Length': object.length });
      res.end();
      return;
    }
    if (req.method === 'GET') {
      const match = String(req.headers.range || '').match(/^bytes=(\d+)-(\d+)$/);
      if (match) {
        const start = Number(match[1]);
        const end = Math.min(Number(match[2]), object.length - 1);
        const body = object.subarray(start, end + 1);
        res.writeHead(206, {
          ...commonHeaders,
          'Content-Length': body.length,
          'Content-Range': `bytes ${start}-${end}/${object.length}`,
        });
        res.end(body);
        return;
      }
      res.writeHead(200, { ...commonHeaders, 'Content-Length': object.length });
      res.end(object);
      return;
    }
    res.writeHead(405);
    res.end();
  });
  await new Promise((resolve, reject) => {
    cosServer.once('error', reject);
    cosServer.listen(0, '127.0.0.1', resolve);
  });
  const address = cosServer.address();
  cosBaseUrl = `http://127.0.0.1:${address.port}`;
}

async function request(pathname, { body, expectedStatus = 200, headers = {}, method = 'GET', raw = false, token } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: raw ? '*/*' : 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    method,
  });
  const responseBody = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, expectedStatus, `${method} ${pathname} expected ${expectedStatus}, got ${response.status}: ${responseBody.toString('utf8')}`);
  if (response.headers.get('content-type')?.includes('application/json')) {
    assert.equal(response.headers.get('cache-control'), 'no-store', `${method} ${pathname} JSON must not be cached`);
    assert.equal(response.headers.get('access-control-allow-origin'), '*', `${method} ${pathname} must preserve CORS`);
  }
  return {
    body: responseBody,
    headers: response.headers,
    payload: raw || !responseBody.length ? undefined : JSON.parse(responseBody.toString('utf8')),
  };
}

async function waitForBackend() {
  const deadline = Date.now() + 10_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const result = await request('/health');
      if (result.payload?.state === 'success') return;
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
      COS_BUCKET: 'lumii-storage-contract',
      COS_ENDPOINT: cosBaseUrl,
      COS_PROXY_BROWSER_CACHE_SECONDS: '120',
      COS_PROXY_CACHE_SECONDS: '3600',
      COS_REGION: 'ap-guangzhou',
      COS_SECRET_ID: 'storage-contract-secret-id',
      COS_SECRET_KEY: 'storage-contract-secret-key',
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      LUMII_STATE_STORAGE_DRIVER: 'json',
      PET_AVATAR_ANIMATION_PROVIDER: 'disabled',
      PET_AVATAR_PUBLIC_BASE_URL: baseUrl,
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
    }, 3000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill();
  });
}

async function stopFakeCos() {
  if (!cosServer) return;
  const server = cosServer;
  cosServer = null;
  await new Promise((resolve) => server.close(resolve));
}

async function login() {
  await request('/auth/sms/send', {
    body: { deviceId: 'media-storage-contract-device', phone: TEST_PHONE },
    method: 'POST',
  });
  const verified = await request('/auth/sms/verify', {
    body: { code: TEST_CODE, expiresAt: Date.now() + 5 * 60 * 1000, phone: TEST_PHONE },
    method: 'POST',
  });
  assert.ok(verified.payload?.data?.token, 'missing user token');
  return verified.payload.data.token;
}

async function createPet(token) {
  const created = await request('/pets', {
    body: {
      birthday: '2024-01',
      breed: 'Dog',
      gender: 'male',
      name: 'StoragePet',
      species: 'dog',
      weightKg: 8.5,
    },
    method: 'POST',
    token,
  });
  assert.ok(created.payload?.data?.id, 'missing pet id');
  return created.payload.data;
}

async function main() {
  const sourcePng = createFlatBackgroundPng();
  const rawObjectKey = 'pet-avatar/read-contract/raw-flat-background.png';
  const cosFixtureMediaId = 'media-storage-cos-fixture';
  const fallbackMediaId = 'media-storage-fallback';
  const fallbackBytes = Buffer.from('legacy-state-media-response-contract');
  fs.writeFileSync(statePath, JSON.stringify({
    mediaUploads: {
      [cosFixtureMediaId]: {
        createdAt: Date.now(),
        mediaId: cosFixtureMediaId,
        mimeType: 'image/jpeg',
        moderationStatus: 'approved',
        objectKey: rawObjectKey,
        ownerPhone: TEST_PHONE,
        source: 'pet_avatar',
      },
      [fallbackMediaId]: {
        createdAt: Date.now(),
        dataUrl: `data:image/png;base64,${fallbackBytes.toString('base64')}`,
        mediaId: fallbackMediaId,
        mimeType: 'image/png',
        moderationStatus: 'approved',
        ownerPhone: TEST_PHONE,
        source: 'pet_avatar',
      },
    },
  }));
  await startFakeCos(sourcePng, rawObjectKey);
  const port = await getFreePort();
  await startBackend(port);
  try {
    const token = await login();
    const pet = await createPet(token);
    const saved = await request(`/pets/${encodeURIComponent(pet.id)}/avatar`, {
      body: { avatarUrl: `${cosBaseUrl}/source.png` },
      method: 'POST',
      token,
    });
    assert.match(saved.payload.data.avatarUrl, /\/storage\/objects\//);
    const avatarPut = cosPuts.find((item) => item.objectKey.startsWith('pet-avatar/'));
    assert.ok(avatarPut, 'pet avatar must be uploaded to COS');
    assert.equal(avatarPut.headers['content-type'], 'image/png');
    assert.notDeepEqual(avatarPut.body, sourcePng, 'pet avatar background cleanup must still happen before COS upload');

    const rawPath = `/storage/objects/${encodeURIComponent(rawObjectKey)}`;
    const full = await request(rawPath, { raw: true });
    assert.deepEqual(full.body, sourcePng, 'full GET must return the exact COS representation');
    assert.equal(Number(full.headers.get('content-length')), sourcePng.length);
    assert.equal(full.headers.get('content-type'), 'image/png');
    assert.equal(full.headers.get('cache-control'), expectedMediaCacheControl);

    const head = await request(rawPath, { method: 'HEAD', raw: true });
    assert.equal(head.body.length, 0);
    assert.equal(Number(head.headers.get('content-length')), sourcePng.length, 'HEAD length must describe the full COS representation');
    assert.equal(head.headers.get('content-type'), full.headers.get('content-type'));
    assert.equal(head.headers.get('cache-control'), expectedMediaCacheControl);

    const range = await request(rawPath, {
      expectedStatus: 206,
      headers: { Range: 'bytes=10-29' },
      raw: true,
    });
    assert.deepEqual(range.body, sourcePng.subarray(10, 30), 'Range GET must return the requested COS bytes');
    assert.equal(Number(range.headers.get('content-length')), 20);
    assert.equal(range.headers.get('content-range'), `bytes 10-29/${sourcePng.length}`);
    assert.equal(range.headers.get('content-type'), full.headers.get('content-type'));
    assert.equal(range.headers.get('etag'), full.headers.get('etag'));
    assert.equal(range.headers.get('cache-control'), expectedMediaCacheControl);

    const cosFixturePath = `/media/uploads/${encodeURIComponent(cosFixtureMediaId)}/file`;
    const cosFixture = await request(cosFixturePath, { raw: true });
    assert.deepEqual(cosFixture.body, sourcePng);
    assert.equal(cosFixture.headers.get('content-type'), 'image/png', 'media proxy must preserve the COS representation content type');
    assert.equal(cosFixture.headers.get('etag'), full.headers.get('etag'));
    assert.equal(cosFixture.headers.get('cache-control'), expectedMediaCacheControl);

    const uploadedPath = new URL(saved.payload.data.avatarUrl).pathname;
    const uploaded = await request(uploadedPath, { raw: true });
    assert.deepEqual(uploaded.body, avatarPut.body, 'uploaded pet avatar must be served without a second read-time transform');
    assert.equal(uploaded.headers.get('cache-control'), expectedMediaCacheControl);

    const uploadedMediaBytes = Buffer.concat([sourcePng, Buffer.alloc(25 * 1024)]);
    const uploadedMedia = await request('/media/uploads', {
      body: {
        base64: uploadedMediaBytes.toString('base64'),
        fileName: 'media-storage-contract.png',
        mimeType: 'image/png',
        source: 'pet_avatar',
      },
      method: 'POST',
      token,
    });
    const mediaId = uploadedMedia.payload?.data?.mediaId;
    assert.ok(mediaId, 'missing uploaded media id');
    const mediaPut = cosPuts.find((item) => item.objectKey.startsWith('pet-source/'));
    assert.ok(mediaPut, 'media upload must be stored in COS');
    const mediaPath = `/media/uploads/${encodeURIComponent(mediaId)}/file`;
    const mediaFull = await request(mediaPath, { raw: true });
    assert.deepEqual(mediaFull.body, mediaPut.body);
    assert.equal(Number(mediaFull.headers.get('content-length')), mediaPut.body.length);
    assert.equal(mediaFull.headers.get('cache-control'), expectedMediaCacheControl);
    const mediaHead = await request(mediaPath, { method: 'HEAD', raw: true });
    assert.equal(mediaHead.body.length, 0);
    assert.equal(Number(mediaHead.headers.get('content-length')), mediaPut.body.length);
    assert.equal(mediaHead.headers.get('content-type'), mediaFull.headers.get('content-type'));
    assert.equal(mediaHead.headers.get('etag'), mediaFull.headers.get('etag'));
    assert.equal(mediaHead.headers.get('cache-control'), expectedMediaCacheControl);
    const mediaRange = await request(mediaPath, {
      expectedStatus: 206,
      headers: { Range: 'bytes=5-17' },
      raw: true,
    });
    assert.deepEqual(mediaRange.body, mediaPut.body.subarray(5, 18));
    assert.equal(Number(mediaRange.headers.get('content-length')), 13);
    assert.equal(mediaRange.headers.get('content-range'), `bytes 5-17/${mediaPut.body.length}`);
    assert.equal(mediaRange.headers.get('cache-control'), expectedMediaCacheControl);

    const fallbackPath = `/media/uploads/${encodeURIComponent(fallbackMediaId)}/file`;
    const fallbackFull = await request(fallbackPath, { raw: true });
    assert.deepEqual(fallbackFull.body, fallbackBytes);
    assert.equal(fallbackFull.headers.get('cache-control'), expectedMediaCacheControl);
    const fallbackHead = await request(fallbackPath, { method: 'HEAD', raw: true });
    assert.equal(fallbackHead.body.length, 0);
    assert.equal(Number(fallbackHead.headers.get('content-length')), fallbackBytes.length);
    assert.equal(fallbackHead.headers.get('cache-control'), expectedMediaCacheControl);
    const fallbackRange = await request(fallbackPath, {
      expectedStatus: 206,
      headers: { Range: 'bytes=2-8' },
      raw: true,
    });
    assert.deepEqual(fallbackRange.body, fallbackBytes.subarray(2, 9));
    assert.equal(Number(fallbackRange.headers.get('content-length')), 7);
    assert.equal(fallbackRange.headers.get('content-range'), `bytes 2-8/${fallbackBytes.length}`);
    assert.equal(fallbackRange.headers.get('cache-control'), expectedMediaCacheControl);
    const fallbackUnsatisfiable = await request(fallbackPath, {
      expectedStatus: 416,
      headers: { Range: `bytes=${fallbackBytes.length}-` },
      raw: true,
    });
    assert.equal(fallbackUnsatisfiable.body.length, 0);
    assert.equal(fallbackUnsatisfiable.headers.get('content-range'), `bytes */${fallbackBytes.length}`);
    assert.equal(fallbackUnsatisfiable.headers.get('cache-control'), 'no-store');
    console.log('media storage response contract smoke passed');
  } finally {
    await stopBackend();
    await stopFakeCos();
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

main().catch(async (error) => {
  await stopBackend();
  await stopFakeCos();
  try {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  } catch {
    // ignore cleanup errors
  }
  console.error(error);
  process.exit(1);
});
