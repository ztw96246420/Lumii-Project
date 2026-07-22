#!/usr/bin/env node

const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');
const tls = require('node:tls');

const baseUrl = new URL(process.env.MEDIA_CDN_BASE_URL || 'https://media.lumiiapp.cn');
const objectUrlValue = process.env.MEDIA_CDN_OBJECT_URL || process.argv[2] || '';
const timeoutMs = Math.max(1000, Number(process.env.MEDIA_CDN_PROBE_TIMEOUT_MS || 20000));
const maxBodyBytes = Math.max(1024, Number(process.env.MEDIA_CDN_PROBE_MAX_BYTES || 50 * 1024 * 1024));

if (!objectUrlValue) {
  console.error('Usage: MEDIA_CDN_OBJECT_URL=https://media.lumiiapp.cn/storage/objects/<encoded-key> node scripts/probe-media-cdn-live.cjs');
  process.exit(2);
}

const objectUrl = new URL(objectUrlValue, baseUrl);
if (objectUrl.protocol !== 'https:' || objectUrl.host !== baseUrl.host) {
  console.error(`MEDIA_CDN_OBJECT_URL must use https://${baseUrl.host}`);
  process.exit(2);
}

function request(target, { headers = {}, method = 'GET', maxBytes = maxBodyBytes } = {}) {
  return new Promise((resolve, reject) => {
    const url = target instanceof URL ? target : new URL(target, baseUrl);
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'lumii-media-cdn-readonly-probe/1.0',
        ...headers,
      },
      method,
      timeout: timeoutMs,
    }, (res) => {
      const chunks = [];
      let length = 0;
      res.on('data', (chunk) => {
        length += chunk.length;
        if (length > maxBytes) {
          req.destroy(new Error(`response exceeded ${maxBytes} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({
        body: Buffer.concat(chunks),
        headers: res.headers,
        status: Number(res.statusCode || 0),
      }));
    });
    req.on('timeout', () => req.destroy(new Error(`request timed out after ${timeoutMs}ms`)));
    req.on('error', reject);
    req.end();
  });
}

function negotiateAlpn() {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      ALPNProtocols: ['h2', 'http/1.1'],
      host: baseUrl.hostname,
      port: Number(baseUrl.port || 443),
      rejectUnauthorized: true,
      servername: baseUrl.hostname,
    });
    socket.setTimeout(timeoutMs, () => socket.destroy(new Error(`TLS handshake timed out after ${timeoutMs}ms`)));
    socket.once('secureConnect', () => {
      const certificate = socket.getPeerCertificate();
      const result = {
        alpn: socket.alpnProtocol || '',
        authorized: socket.authorized,
        certificateExpiresAt: certificate.valid_to || '',
        protocol: socket.getProtocol() || '',
      };
      socket.end();
      resolve(result);
    });
    socket.once('error', reject);
  });
}

function cacheSeconds(cacheControl, name) {
  const match = String(cacheControl || '').match(new RegExp(`(?:^|,)\\s*${name}=(\\d+)`, 'i'));
  return match ? Number(match[1]) : null;
}

function totalFromContentRange(contentRange) {
  const match = String(contentRange || '').match(/^bytes\s+\d+-\d+\/(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function safeHeaders(headers) {
  const keys = [
    'age',
    'cache-control',
    'content-length',
    'content-range',
    'content-type',
    'etag',
    'location',
    'strict-transport-security',
    'x-cache-lookup',
  ];
  return Object.fromEntries(keys.filter((key) => headers[key] !== undefined).map((key) => [key, headers[key]]));
}

async function main() {
  const nonce = Date.now().toString(36);
  const httpHealthUrl = new URL(`/health?cdn_readonly_probe=${nonce}`, `http://${baseUrl.host}`);
  const httpsHealthUrl = new URL(`/health?cdn_readonly_probe=${nonce}`, baseUrl);
  const meUrl = new URL(`/me?cdn_readonly_probe=${nonce}`, baseUrl);
  const queryObjectUrl = new URL(objectUrl);
  queryObjectUrl.searchParams.set('cdn_readonly_probe', nonce);

  const [tlsInfo, httpHealth, httpsHealth, me, head, full, range, queryRange] = await Promise.all([
    negotiateAlpn(),
    request(httpHealthUrl, { maxBytes: 64 * 1024 }),
    request(httpsHealthUrl, { maxBytes: 64 * 1024 }),
    request(meUrl, {
      headers: { Authorization: 'Bearer lumii-cdn-readonly-invalid-token' },
      maxBytes: 64 * 1024,
    }),
    request(objectUrl, { method: 'HEAD', maxBytes: 1024 }),
    request(objectUrl),
    request(objectUrl, { headers: { Range: 'bytes=0-0' }, maxBytes: 1024 }),
    request(queryObjectUrl, { headers: { Range: 'bytes=0-0' }, maxBytes: 1024 }),
  ]);

  const checks = [];
  const check = (name, passed, detail) => checks.push({ detail, name, passed: Boolean(passed) });
  const redirectLocation = httpHealth.headers.location ? new URL(httpHealth.headers.location, httpHealthUrl) : null;
  const hsts = String(httpsHealth.headers['strict-transport-security'] || '');
  const hstsMaxAge = Number(hsts.match(/(?:^|;)\s*max-age=(\d+)/i)?.[1] || 0);
  const headLength = Number(head.headers['content-length'] || -1);
  const fullLength = full.body.length;
  const rangeTotal = totalFromContentRange(range.headers['content-range']);
  const queryRangeTotal = totalFromContentRange(queryRange.headers['content-range']);
  const cacheControl = String(full.headers['cache-control'] || '');
  const maxAge = cacheSeconds(cacheControl, 'max-age');
  const sharedMaxAge = cacheSeconds(cacheControl, 's-maxage');

  check('HTTP redirects to HTTPS',
    [301, 302, 307, 308].includes(httpHealth.status)
      && redirectLocation?.protocol === 'https:'
      && redirectLocation?.host === baseUrl.host,
    { location: httpHealth.headers.location || '', status: httpHealth.status });
  check('TLS certificate and HTTP/2', tlsInfo.authorized && tlsInfo.alpn === 'h2', tlsInfo);
  check('HSTS enabled', hstsMaxAge >= 300, { header: hsts, maxAge: hstsMaxAge });
  check('/health is isolated', httpsHealth.status === 404, { headers: safeHeaders(httpsHealth.headers), status: httpsHealth.status });
  check('/me is isolated without a real token', me.status === 404, { headers: safeHeaders(me.headers), status: me.status });
  check('object HEAD succeeds', head.status === 200, { headers: safeHeaders(head.headers), status: head.status });
  check('object full GET succeeds', full.status === 200 && fullLength > 0, {
    bytes: fullLength,
    headers: safeHeaders(full.headers),
    sha256: crypto.createHash('sha256').update(full.body).digest('hex'),
    status: full.status,
  });
  check('object Range succeeds', range.status === 206 && range.body.length === 1, {
    bytes: range.body.length,
    headers: safeHeaders(range.headers),
    status: range.status,
  });
  check('HEAD/full/Range describe one representation',
    headLength === fullLength && rangeTotal === fullLength,
    { fullLength, headLength, rangeTotal });
  check('query-preserving object route reaches the same representation',
    queryRange.status === 206 && queryRange.body.length === 1 && queryRangeTotal === fullLength,
    { headers: safeHeaders(queryRange.headers), queryRangeTotal, status: queryRange.status });
  check('object content type is consistent',
    Boolean(full.headers['content-type'])
      && head.headers['content-type'] === full.headers['content-type']
      && range.headers['content-type'] === full.headers['content-type'],
    {
      full: full.headers['content-type'] || '',
      head: head.headers['content-type'] || '',
      range: range.headers['content-type'] || '',
    });
  check('public media cache is bounded',
    /(?:^|,)\s*public(?:,|$)/i.test(cacheControl)
      && maxAge !== null && maxAge <= 60
      && sharedMaxAge !== null && sharedMaxAge <= 300,
    { cacheControl, maxAge, sharedMaxAge });

  const report = {
    baseUrl: baseUrl.origin,
    failed: checks.filter((item) => !item.passed).length,
    objectPath: objectUrl.pathname,
    passed: checks.filter((item) => item.passed).length,
    checks,
  };
  console.log(JSON.stringify(report, null, 2));
  if (report.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
