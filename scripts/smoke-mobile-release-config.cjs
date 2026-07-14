#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const typescript = require(path.join(__dirname, '..', 'mobile', 'node_modules', 'typescript'));

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
assert.match(manifest, /android:allowBackup="false"/);
assert.doesNotMatch(manifest, /android\.permission\.(?:RECORD_AUDIO|SYSTEM_ALERT_WINDOW)/);

const appConfig = JSON.parse(fs.readFileSync(path.join(mobileDir, 'app.json'), 'utf8'));
assert.equal(appConfig.expo.android.allowBackup, false);
assert.ok(!appConfig.expo.android.permissions.includes('android.permission.RECORD_AUDIO'));
assert.ok(!appConfig.expo.android.permissions.includes('android.permission.SYSTEM_ALERT_WINDOW'));
assert.ok(appConfig.expo.android.versionCode >= 15, 'the release candidate must be versionCode 15 or newer');

const gradle = fs.readFileSync(path.join(mobileDir, 'android', 'app', 'build.gradle'), 'utf8');
assert.match(gradle, /findProperty\("LUMII_ALLOW_CLEARTEXT"\)/);
assert.match(gradle, /LUMII_ALLOW_CLEARTEXT/);
assert.match(gradle, /\?: "false"/);
assert.equal(Number(gradle.match(/versionCode\s+(\d+)/)?.[1]), appConfig.expo.android.versionCode, 'Gradle and app.json version codes must match');
assert.equal(gradle.match(/versionName\s+"([^"]+)"/)?.[1], appConfig.expo.version, 'Gradle and app.json versions must match');

const appVersionSource = fs.readFileSync(path.join(mobileDir, 'src', 'mvp', 'appVersion.ts'), 'utf8');
const appVersionCompiled = typescript.transpileModule(appVersionSource, {
  compilerOptions: {
    esModuleInterop: true,
    module: typescript.ModuleKind.CommonJS,
    resolveJsonModule: true,
    target: typescript.ScriptTarget.ES2022,
  },
}).outputText;

function loadAppVersionPolicy(nativeApplicationVersion, nativeBuildVersion) {
  const module = { exports: {} };
  const localRequire = (request) => {
    if (request === 'expo-application') return { nativeApplicationVersion, nativeBuildVersion };
    if (request === '../../app.json') return appConfig;
    throw new Error(`Unexpected app version module dependency: ${request}`);
  };
  new Function('require', 'module', 'exports', appVersionCompiled)(localRequire, module, module.exports);
  return module.exports;
}

const nativeVersionPolicy = loadAppVersionPolicy('2.4.1', '99');
assert.equal(nativeVersionPolicy.lumiiAppVersion, '2.4.1', 'installed native version must override bundled config');
assert.equal(nativeVersionPolicy.lumiiAppBuildNumber, 99, 'installed native build must override bundled config');
const fallbackVersionPolicy = loadAppVersionPolicy(null, null);
assert.equal(fallbackVersionPolicy.lumiiAppVersion, appConfig.expo.version, 'web preview must fall back to app.json version');
assert.equal(fallbackVersionPolicy.lumiiAppBuildNumber, appConfig.expo.android.versionCode, 'web preview must fall back to app.json build');
const currentReleaseBuild = appConfig.expo.android.versionCode;
assert.equal(fallbackVersionPolicy.isAppBuildTargetNewer('1.0.0', currentReleaseBuild - 1, '1.0.0', currentReleaseBuild), true, 'same version with a newer build must update');
assert.equal(fallbackVersionPolicy.isAppBuildTargetNewer('1.0.0', currentReleaseBuild, '1.0.0', currentReleaseBuild), false, 'the current build must not update itself');
assert.equal(fallbackVersionPolicy.isAppBuildTargetNewer('1.0.0', 99, '1.1.0', 1), true, 'a newer semantic version must update regardless of build reset');
assert.equal(fallbackVersionPolicy.isAppBuildTargetNewer('1.1.0', 1, '1.0.0', 99), false, 'an older semantic version must not override by build number');
assert.equal(fallbackVersionPolicy.isAppBuildTargetNewer('1.0.0', currentReleaseBuild - 1, '', currentReleaseBuild), true, 'a build-only target must be supported');
assert.equal(fallbackVersionPolicy.appBuildTargetKey('1.0.0', currentReleaseBuild), `1.0.0#${currentReleaseBuild}`);
assert.equal(fallbackVersionPolicy.formatAppBuildTarget('1.0.0', currentReleaseBuild), `1.0.0 (${currentReleaseBuild})`);

const appSource = fs.readFileSync(path.join(mobileDir, 'src', 'mvp', 'LumiiMvpApp.tsx'), 'utf8');
assert.match(appSource, /from '\.\/appVersion'/);
assert.doesNotMatch(appSource, /const\s+lumiiAppBuildNumber\s*=\s*\d+/);
assert.doesNotMatch(appSource, /const\s+lumiiAppVersion\s*=\s*['"][^'"]+['"]/);

const apiSource = fs.readFileSync(path.join(mobileDir, 'src', 'mvp', 'api.ts'), 'utf8');
assert.match(apiSource, /process\.env\.EXPO_PUBLIC_API_BASE_URL/);
assert.match(apiSource, /process\.env\.EXPO_PUBLIC_REQUIRE_HTTPS/);
assert.doesNotMatch(apiSource, /const env = process/);

const buildScript = fs.readFileSync(path.join(mobileDir, 'scripts', 'build-arm64-apk.cjs'), 'utf8');
assert.match(buildScript, /https:\/\/api\.lumiiapp\.cn/);
assert.match(buildScript, /LUMII_ALLOW_INSECURE_TEST_API === '1'/);
assert.match(buildScript, /insecure-test-/);

console.log('mobile release configuration smoke passed');
