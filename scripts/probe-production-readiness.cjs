#!/usr/bin/env node

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const serviceName = process.env.LUMII_PROBE_SERVICE_NAME || 'lumii-backend';
const baseUrl = String(process.env.LUMII_PROBE_BASE_URL || 'http://127.0.0.1:8787').replace(/\/+$/u, '');

function serviceEnvironment() {
  const pid = execFileSync('systemctl', ['show', serviceName, '--property=MainPID', '--value'], { encoding: 'utf8' }).trim();
  if (!/^\d+$/u.test(pid) || pid === '0') throw new Error(`${serviceName} is not running`);
  const values = fs.readFileSync(`/proc/${pid}/environ`).toString('utf8').split('\0');
  return Object.fromEntries(values.filter((value) => value.includes('=')).map((value) => {
    const separator = value.indexOf('=');
    return [value.slice(0, separator), value.slice(separator + 1)];
  }));
}

async function request(pathname, { body, token } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    method: body === undefined ? 'GET' : 'POST',
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.state === 'error') {
    throw new Error(`${pathname} failed (${response.status}): ${payload.error?.code || payload.error?.message || text || 'unknown error'}`);
  }
  return payload.data;
}

function pick(value, keys) {
  return Object.fromEntries(keys.map((key) => [key, value?.[key]]));
}

async function main() {
  const environment = serviceEnvironment();
  const username = environment.LUMII_ADMIN_USERNAME || '';
  const password = environment.LUMII_ADMIN_PASSWORD || '';
  if (!username || !password) throw new Error('Production admin credentials are not configured in the service environment');

  const login = await request('/admin/auth/login', { body: { password, username } });
  if (!login?.token) throw new Error('Admin login did not return a token');
  const [readiness, health, accounts, config, notifications, pushDevices] = await Promise.all([
    request('/admin/launch/readiness', { token: login.token }),
    request('/admin/system/health', { token: login.token }),
    request('/admin/accounts', { token: login.token }),
    request('/admin/config', { token: login.token }),
    request('/admin/notifications', { token: login.token }),
    request('/admin/push-devices', { token: login.token }),
  ]);

  const result = {
    adminSecurity: {
      ipAllowlist: {
        allowed: Boolean(accounts?.security?.ipAllowlist?.allowed),
        configured: Boolean(accounts?.security?.ipAllowlist?.configured),
        entryCount: Array.isArray(accounts?.security?.ipAllowlist?.entries) ? accounts.security.ipAllowlist.entries.length : 0,
      },
      mfa: accounts?.security?.mfa || {},
      passwordRotation: pick(accounts?.security?.passwordRotation, ['configured', 'enabled', 'maxAgeDays', 'activeAccounts']),
      summary: accounts?.summary || {},
    },
    approvalPolicy: {
      configApproval: config?.configApproval || {},
      highRiskApproval: config?.highRiskApproval || {},
      notifications: pick(config?.notifications, ['requireApproval']),
    },
    generatedAt: new Date().toISOString(),
    gaps: (readiness?.gaps || [])
      .filter((item) => item.status !== 'ready')
      .map((item) => pick(item, ['key', 'area', 'severity', 'status', 'issue', 'requiredAction'])),
    healthIssues: (health?.checks || [])
      .filter((item) => !['ok', 'ready'].includes(item.status))
      .map((item) => pick(item, ['key', 'label', 'status', 'detail', 'evidence'])),
    publicApiProbe: pick(health?.publicApiProbe, ['baseUrl', 'connectAddress', 'probeMode', 'status', 'ok', 'detail', 'evidence']),
    publicApiExternalProof: pick(health?.publicApiExternalProof, ['status', 'ok', 'fresh', 'observedAt', 'ageMinutes', 'maxAgeMinutes', 'source', 'detail', 'evidence']),
    push: {
      devices: Array.isArray(pushDevices) ? pushDevices.length : 0,
      disabledDevices: Array.isArray(pushDevices) ? pushDevices.filter((item) => !item.enabled).length : 0,
      enabledDevices: Array.isArray(pushDevices) ? pushDevices.filter((item) => item.enabled).length : 0,
      summary: pick(notifications?.summary, ['pushEnabled', 'pushProvider', 'pushReceiptEnabled', 'pushAttempted', 'pushSent', 'pushFailed', 'pushSuccessRate', 'pushReceiptAttempted', 'pushReceiptOk', 'pushReceiptFailed', 'pushReceiptPending', 'pushReceiptSuccessRate']),
    },
    healthSummary: health?.summary || {},
    modules: (readiness?.modules || [])
      .filter((item) => item.status !== 'ready')
      .map((item) => pick(item, ['key', 'module', 'group', 'status', 'nextStep'])),
    questions: (readiness?.questions || [])
      .filter((item) => !['closed', 'ready'].includes(item.status))
      .map((item) => pick(item, ['id', 'priority', 'status', 'question', 'owner', 'note'])),
    signoff: readiness?.signoff || {},
    summary: readiness?.summary || {},
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`Production readiness probe failed: ${error.message}`);
  process.exit(1);
});
