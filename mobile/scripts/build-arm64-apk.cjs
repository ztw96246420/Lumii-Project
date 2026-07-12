const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateReleaseConfig } = require('./validate-release-config.cjs');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const androidRoot = path.join(mobileRoot, 'android');
const sourceApk = path.join(androidRoot, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const distDir = path.join(repoRoot, 'dist');
const appConfig = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'app.json'), 'utf8')).expo;
const appVersion = String(appConfig.version || '').trim();
const appVersionCode = Number(appConfig.android?.versionCode);

if (!appVersion || !Number.isInteger(appVersionCode) || appVersionCode <= 0) {
  throw new Error('app.json must define expo.version and a positive expo.android.versionCode');
}

function run(command, args, cwd, env = process.env) {
  if (process.platform === 'win32' && command.endsWith('.bat')) {
    execFileSync('cmd.exe', ['/d', '/s', '/c', command, ...args], { cwd, env, stdio: 'inherit' });
    return;
  }
  execFileSync(command, args, { cwd, env, stdio: 'inherit' });
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join('');
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

function sizeMb(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

fs.mkdirSync(distDir, { recursive: true });

const allowInsecureTestApi = process.env.LUMII_ALLOW_INSECURE_TEST_API === '1';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || (allowInsecureTestApi ? 'http://193.112.92.111' : 'https://api.lumiiapp.cn');
const buildEnv = {
  ...process.env,
  EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
  EXPO_PUBLIC_API_MODE: 'http',
  EXPO_PUBLIC_REQUIRE_HTTPS: allowInsecureTestApi ? 'false' : 'true',
  LUMII_ALLOW_CLEARTEXT: allowInsecureTestApi ? 'true' : 'false',
  LUMII_PRODUCTION_BUILD: allowInsecureTestApi ? 'false' : 'true',
};
if (!allowInsecureTestApi) validateReleaseConfig(buildEnv, { forceProduction: true });

run(
  process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
  ['assembleRelease', '-PreactNativeArchitectures=arm64-v8a', `-PLUMII_ALLOW_CLEARTEXT=${allowInsecureTestApi ? 'true' : 'false'}`],
  androidRoot,
  buildEnv,
);

if (!fs.existsSync(sourceApk)) {
  throw new Error(`APK not found: ${sourceApk}`);
}

const buildLabel = allowInsecureTestApi ? 'insecure-test-' : '';
const destApk = path.join(distDir, `Lumii-Lingban-${buildLabel}v${appVersion}-vc${appVersionCode}-arm64-${timestamp()}.apk`);
fs.copyFileSync(sourceApk, destApk);

const stats = fs.statSync(destApk);
console.log('');
console.log('Lumii APK build complete');
console.log(`Path: ${destApk}`);
console.log(`SizeMB: ${sizeMb(stats.size)}`);
console.log(`SHA256: ${sha256(destApk)}`);
console.log('PackageName: com.lumii.lingban');
console.log(`VersionCode: ${appVersionCode}`);
console.log('ABI: arm64-v8a');
console.log(`APIBaseURL: ${apiBaseUrl}`);
console.log(`CleartextTraffic: ${allowInsecureTestApi}`);
