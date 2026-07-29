#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');

function serverBlocks(source) {
  const blocks = [];
  const serverPattern = /\bserver\s*\{/g;
  let match;
  while ((match = serverPattern.exec(source))) {
    let depth = 1;
    let cursor = serverPattern.lastIndex;
    while (cursor < source.length && depth > 0) {
      if (source[cursor] === '{') depth += 1;
      if (source[cursor] === '}') depth -= 1;
      cursor += 1;
    }
    assert.equal(depth, 0, 'unterminated Nginx server block');
    blocks.push(source.slice(match.index, cursor));
    serverPattern.lastIndex = cursor;
  }
  return blocks;
}

function publicDomainBlocks(fileName) {
  const source = fs.readFileSync(path.join(rootDir, 'ops', 'nginx', fileName), 'utf8');
  return serverBlocks(source).filter((block) => /\bserver_name\s+lumiiapp\.cn\s+www\.lumiiapp\.cn\s*;/.test(block));
}

function assertRedirects(block, fileName) {
  assert.doesNotMatch(block, /\bproxy_pass\b/, `${fileName} public domain must not proxy into the backend`);
  assert.match(block, /location\s+=\s+\/\s*\{\s*return\s+301\s+https:\/\/api\.lumiiapp\.cn\/legal\/privacy\s*;\s*\}/s, `${fileName} root must lead to the public privacy page`);
  assert.match(block, /location\s+\/\s*\{\s*return\s+301\s+https:\/\/api\.lumiiapp\.cn\$request_uri\s*;\s*\}/s, `${fileName} non-root paths must preserve the request URI on the canonical host`);
}

const bootstrapBlocks = publicDomainBlocks('lumii-bootstrap.conf');
assert.equal(bootstrapBlocks.length, 1, 'bootstrap config must contain one HTTP public-domain vhost');
assert.match(bootstrapBlocks[0], /\blisten\s+80\s*;/);
assert.match(bootstrapBlocks[0], /location\s+\^~\s+\/\.well-known\/acme-challenge\/\s*\{/);
assertRedirects(bootstrapBlocks[0], 'lumii-bootstrap.conf');

const productionBlocks = publicDomainBlocks('lumii.conf');
assert.equal(productionBlocks.length, 2, 'production config must contain HTTP and HTTPS public-domain vhosts');
const httpBlock = productionBlocks.find((block) => /\blisten\s+80\s*;/.test(block));
const httpsBlock = productionBlocks.find((block) => /\blisten\s+443\s+ssl\s+http2\s*;/.test(block));
assert.ok(httpBlock, 'production public-domain HTTP vhost is missing');
assert.ok(httpsBlock, 'production public-domain HTTPS vhost is missing');
assert.match(httpBlock, /location\s+\^~\s+\/\.well-known\/acme-challenge\/\s*\{/);
assertRedirects(httpBlock, 'lumii.conf HTTP');
assertRedirects(httpsBlock, 'lumii.conf HTTPS');
assert.match(httpsBlock, /ssl_certificate\s+\/etc\/letsencrypt\/live\/api\.lumiiapp\.cn\/fullchain\.pem\s*;/);
assert.match(httpsBlock, /ssl_certificate_key\s+\/etc\/letsencrypt\/live\/api\.lumiiapp\.cn\/privkey\.pem\s*;/);
assert.match(httpsBlock, /Strict-Transport-Security\s+"max-age=15552000"\s+always\s*;/);

console.log('public domain config smoke passed');
