#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'ops', 'systemd', 'journald.conf.d', '60-lumii-persistent.conf');
const backendLoggingPath = path.join(rootDir, 'ops', 'systemd', 'lumii-backend.service.d', '70-http-access-logging.conf');

function parseIni(text) {
  const sections = {};
  let section = '';
  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) return;
    const sectionMatch = line.match(/^\[([^\]]+)]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      sections[section] ||= {};
      return;
    }
    const index = line.indexOf('=');
    assert.ok(index > 0, `invalid journald config line: ${line}`);
    assert.ok(section, `journald config key is outside a section: ${line}`);
    sections[section][line.slice(0, index).trim()] = line.slice(index + 1).trim();
  });
  return sections;
}

function storageBytes(value) {
  const match = String(value || '').match(/^(\d+)([KMGT])$/i);
  assert.ok(match, `invalid storage size: ${value}`);
  const multiplier = { K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 }[match[2].toUpperCase()];
  return Number(match[1]) * multiplier;
}

const config = parseIni(fs.readFileSync(configPath, 'utf8')).Journal;
assert.ok(config, 'missing [Journal] section');
assert.equal(config.Storage, 'persistent');
assert.equal(config.Compress, 'yes');
assert.equal(config.MaxRetentionSec, '30day');
assert.equal(config.MaxFileSec, '1day');
assert.equal(config.RateLimitIntervalSec, '30s');
assert.ok(Number(config.RateLimitBurst) >= 1000);
assert.ok(storageBytes(config.SystemMaxUse) >= 512 * 1024 ** 2);
assert.ok(storageBytes(config.SystemMaxUse) <= 2 * 1024 ** 3);
assert.ok(storageBytes(config.SystemKeepFree) >= 4 * 1024 ** 3);
assert.ok(storageBytes(config.SystemMaxFileSize) <= 256 * 1024 ** 2);
assert.ok(storageBytes(config.SystemMaxFileSize) < storageBytes(config.SystemMaxUse));

const backendLogging = parseIni(fs.readFileSync(backendLoggingPath, 'utf8')).Service;
assert.equal(backendLogging.StandardOutput, 'journal');
assert.equal(backendLogging.StandardError, 'journal');
assert.equal(backendLogging['Environment'], '"LUMII_HTTP_ACCESS_LOG_SLOW_MS=2000"');
