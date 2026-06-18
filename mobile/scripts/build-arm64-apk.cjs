const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const androidRoot = path.join(mobileRoot, 'android');
const sourceApk = path.join(androidRoot, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const distDir = path.join(repoRoot, 'dist');

function run(command, args, cwd) {
  if (process.platform === 'win32' && command.endsWith('.bat')) {
    execFileSync('cmd.exe', ['/d', '/s', '/c', command, ...args], { cwd, stdio: 'inherit' });
    return;
  }
  execFileSync(command, args, { cwd, stdio: 'inherit' });
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

run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['assembleRelease', '-PreactNativeArchitectures=arm64-v8a'], androidRoot);

if (!fs.existsSync(sourceApk)) {
  throw new Error(`APK not found: ${sourceApk}`);
}

const destApk = path.join(distDir, `Lumii-Lingban-v1.0.0-vc11-arm64-${timestamp()}.apk`);
fs.copyFileSync(sourceApk, destApk);

const stats = fs.statSync(destApk);
console.log('');
console.log('Lumii APK build complete');
console.log(`Path: ${destApk}`);
console.log(`SizeMB: ${sizeMb(stats.size)}`);
console.log(`SHA256: ${sha256(destApk)}`);
console.log('PackageName: com.lumii.lingban');
console.log('VersionCode: 11');
console.log('ABI: arm64-v8a');
