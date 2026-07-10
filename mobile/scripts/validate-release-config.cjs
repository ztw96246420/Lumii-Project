#!/usr/bin/env node

const net = require('node:net');

const productionProfiles = new Set(['production', 'store']);
const defaultProductionApiHost = 'api.lumiiapp.cn';

function isProductionBuild(env = process.env) {
  return env.LUMII_PRODUCTION_BUILD === 'true' || productionProfiles.has(String(env.EAS_BUILD_PROFILE || '').trim().toLowerCase());
}

function validateReleaseConfig(env = process.env, options = {}) {
  const production = options.forceProduction === true || isProductionBuild(env);
  const mode = String(env.EXPO_PUBLIC_API_MODE || 'http').trim().toLowerCase();
  const baseUrl = String(env.EXPO_PUBLIC_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const requiresHttps = String(env.EXPO_PUBLIC_REQUIRE_HTTPS || '').trim().toLowerCase() === 'true';
  const allowCleartext = String(env.LUMII_ALLOW_CLEARTEXT || '').trim().toLowerCase() === 'true';

  if (!production) return { allowCleartext, baseUrl, mode, production, requiresHttps };

  const errors = [];
  if (mode !== 'http') errors.push('EXPO_PUBLIC_API_MODE must be http for a production build.');
  if (!requiresHttps) errors.push('EXPO_PUBLIC_REQUIRE_HTTPS must be true for a production build.');
  if (allowCleartext) errors.push('LUMII_ALLOW_CLEARTEXT must not be true for a production build.');
  if (!baseUrl) errors.push('EXPO_PUBLIC_API_BASE_URL is required for a production build.');

  let parsed;
  if (baseUrl) {
    try {
      parsed = new URL(baseUrl);
    } catch {
      errors.push('EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.');
    }
  }
  if (parsed) {
    const allowedHosts = new Set(
      String(env.LUMII_PRODUCTION_API_HOSTS || defaultProductionApiHost)
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:') errors.push('EXPO_PUBLIC_API_BASE_URL must use https.');
    if (parsed.username || parsed.password) errors.push('EXPO_PUBLIC_API_BASE_URL must not contain credentials.');
    if (parsed.search || parsed.hash) errors.push('EXPO_PUBLIC_API_BASE_URL must not contain query parameters or a fragment.');
    if (parsed.port && parsed.port !== '443') errors.push('EXPO_PUBLIC_API_BASE_URL may only use the default HTTPS port 443.');
    if (net.isIP(host) || host === 'localhost' || host.endsWith('.local')) errors.push('EXPO_PUBLIC_API_BASE_URL must use a production DNS hostname, not an IP or local hostname.');
    if (!allowedHosts.has(host)) errors.push(`EXPO_PUBLIC_API_BASE_URL host must be one of: ${[...allowedHosts].join(', ')}.`);
  }

  if (errors.length) {
    const error = new Error(`Invalid Lumii production release configuration:\n- ${errors.join('\n- ')}`);
    error.code = 'LUMII_RELEASE_CONFIG_INVALID';
    error.errors = errors;
    throw error;
  }

  return { allowCleartext, baseUrl, mode, production, requiresHttps };
}

function main() {
  const result = validateReleaseConfig(process.env);
  console.log(`Lumii release config valid: profile=${result.production ? 'production' : 'non-production'} api=${result.baseUrl || '(default)'} httpsRequired=${result.requiresHttps} cleartext=${result.allowCleartext}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { isProductionBuild, validateReleaseConfig };
