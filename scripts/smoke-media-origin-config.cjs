#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const nginxFiles = [
  path.join(rootDir, 'ops', 'nginx', 'lumii.conf'),
  path.join(rootDir, 'ops', 'nginx', 'lumii-bootstrap.conf'),
];

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

for (const configPath of nginxFiles) {
  const source = fs.readFileSync(configPath, 'utf8');
  const mediaBlocks = serverBlocks(source).filter((block) => /\bserver_name\s+media\.lumiiapp\.cn\s*;/.test(block));
  assert.equal(mediaBlocks.length, 1, `${path.basename(configPath)} must have one exact media vhost`);

  const block = mediaBlocks[0];
  assert.match(block, /\blisten\s+80\s*;/, 'media origin must keep HTTP port 80 for CDN fetches');
  assert.doesNotMatch(block, /\breturn\s+30[1278]\b/, 'media origin must not redirect back to the CDN');
  assert.match(block, /location\s+\^~\s+\/storage\/objects\/\s*\{/, 'storage object route is missing');
  assert.match(block, /location\s+~\s+\^\/media\/uploads\/\[\^\/\]\+\/file\$\s*\{/, 'media upload file route is missing');
  assert.equal((block.match(/limit_except\s+GET\s+HEAD\s+OPTIONS\s*\{/g) || []).length, 2, 'both media routes must be read-only');
  assert.equal((block.match(/proxy_set_header\s+Authorization\s+""\s*;/g) || []).length, 2, 'credentials must be stripped on both media routes');
  assert.equal((block.match(/proxy_pass\s+http:\/\/127\.0\.0\.1:8787\s*;/g) || []).length, 2, 'only the two media routes may reach the backend');
  assert.match(block, /location\s+\/\s*\{\s*return\s+404\s*;\s*\}/s, 'media vhost must fail closed for every other path');
}

const systemdExample = fs.readFileSync(
  path.join(rootDir, 'ops', 'systemd', 'lumii-backend.service.d', '45-media-cdn.example.conf'),
  'utf8',
);
assert.match(systemdExample, /PET_AVATAR_PUBLIC_BASE_URL=https:\/\/media\.lumiiapp\.cn/);
assert.match(systemdExample, /MEDIA_PUBLIC_PROBE_BASE_URL=https:\/\/media\.lumiiapp\.cn/);

console.log('media origin config smoke passed');
