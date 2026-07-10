#!/usr/bin/env node

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const smokeScript = path.join(__dirname, 'smoke-observability-alerts.cjs');
const providers = ['wecom', 'feishu', 'dingtalk'];

for (const provider of providers) {
  process.stdout.write(`[alert-webhook] ${provider} ... `);
  const result = spawnSync(process.execPath, [smokeScript], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    env: {
      ...process.env,
      SMOKE_ALERT_PROVIDER: provider,
    },
    timeout: 60_000,
  });
  if (result.status !== 0) {
    process.stdout.write('failed\n');
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
  process.stdout.write('ok\n');
}

console.log('admin alert webhook providers smoke passed');
