#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const mobileDir = path.join(rootDir, 'mobile');
const { validateReleaseConfig } = require(path.join(mobileDir, 'scripts', 'validate-release-config.cjs'));

function expectInvalid(env, pattern) {
  assert.throws(
    () => validateReleaseConfig(env, { forceProduction: true }),
    (error) => error?.code === 'LUMII_RELEASE_CONFIG_INVALID' && pattern.test(error.message),
  );
}

const validProductionEnv = {
  EAS_BUILD_PROFILE: 'production',
  EXPO_PUBLIC_API_BASE_URL: 'https://api.lumiiapp.cn',
  EXPO_PUBLIC_API_MODE: 'http',
  EXPO_PUBLIC_REQUIRE_HTTPS: 'true',
  LUMII_ALLOW_CLEARTEXT: 'false',
};

const valid = validateReleaseConfig(validProductionEnv);
assert.equal(valid.production, true);
assert.equal(valid.baseUrl, 'https://api.lumiiapp.cn');
assert.equal(valid.allowCleartext, false);

expectInvalid({ ...validProductionEnv, EXPO_PUBLIC_API_BASE_URL: 'http://api.lumiiapp.cn' }, /must use https/);
expectInvalid({ ...validProductionEnv, EXPO_PUBLIC_API_BASE_URL: 'https://193.112.92.111' }, /production DNS hostname/);
expectInvalid({ ...validProductionEnv, EXPO_PUBLIC_API_BASE_URL: 'https://localhost:8787' }, /production DNS hostname/);
expectInvalid({ ...validProductionEnv, EXPO_PUBLIC_API_BASE_URL: 'https://example.com' }, /host must be one of/);
expectInvalid({ ...validProductionEnv, EXPO_PUBLIC_API_MODE: 'mock' }, /API_MODE must be http/);
expectInvalid({ ...validProductionEnv, EXPO_PUBLIC_REQUIRE_HTTPS: 'false' }, /REQUIRE_HTTPS must be true/);
expectInvalid({ ...validProductionEnv, LUMII_ALLOW_CLEARTEXT: 'true' }, /ALLOW_CLEARTEXT must not be true/);
assert.equal(validateReleaseConfig({ EXPO_PUBLIC_API_BASE_URL: 'http://193.112.92.111' }).production, false, 'non-production development may keep the explicit test endpoint');

const easConfig = JSON.parse(fs.readFileSync(path.join(mobileDir, 'eas.json'), 'utf8'));
for (const profileName of ['preview', 'production']) {
  const profile = easConfig.build[profileName];
  assert.equal(profile.env.EXPO_PUBLIC_API_BASE_URL, 'https://api.lumiiapp.cn');
  assert.equal(profile.env.EXPO_PUBLIC_REQUIRE_HTTPS, 'true');
  assert.equal(profile.env.LUMII_ALLOW_CLEARTEXT, 'false');
}
assert.equal(easConfig.build.production.environment, 'production');

const manifest = fs.readFileSync(path.join(mobileDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
assert.match(manifest, /android:usesCleartextTraffic="\$\{usesCleartextTraffic\}"/);
assert.doesNotMatch(manifest, /android:usesCleartextTraffic="true"/);

const gradle = fs.readFileSync(path.join(mobileDir, 'android', 'app', 'build.gradle'), 'utf8');
assert.match(gradle, /findProperty\("LUMII_ALLOW_CLEARTEXT"\)/);
assert.match(gradle, /LUMII_ALLOW_CLEARTEXT/);
assert.match(gradle, /\?: "false"/);

const apiSource = fs.readFileSync(path.join(mobileDir, 'src', 'mvp', 'api.ts'), 'utf8');
assert.match(apiSource, /process\.env\.EXPO_PUBLIC_API_BASE_URL/);
assert.match(apiSource, /process\.env\.EXPO_PUBLIC_REQUIRE_HTTPS/);
assert.doesNotMatch(apiSource, /const env = process/);

const buildScript = fs.readFileSync(path.join(mobileDir, 'scripts', 'build-arm64-apk.cjs'), 'utf8');
assert.match(buildScript, /https:\/\/api\.lumiiapp\.cn/);
assert.match(buildScript, /LUMII_ALLOW_INSECURE_TEST_API === '1'/);
assert.match(buildScript, /insecure-test-/);

console.log('mobile release configuration smoke passed');
