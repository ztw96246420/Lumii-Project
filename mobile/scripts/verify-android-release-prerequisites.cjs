#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateReleaseConfig } = require('./validate-release-config.cjs');

const mobileRoot = path.resolve(__dirname, '..');
const androidRoot = path.join(mobileRoot, 'android');
const androidAppRoot = path.join(androidRoot, 'app');
const defaultSigningPropertiesPath = path.join(os.homedir(), '.lumii', 'android', 'lumii-release-signing.properties');
const expectedPackageName = 'com.lumii.lingban';
const expectedFirebaseProjectId = 'lumii-lingban';
const expectedReleaseCertificateSha256 = '05E07854FAF7DF6F80FAA466D0BE44825E50C69E358F0CA4E24BE1CB0A9A5354';
const signingPropertyNames = [
  'LUMII_UPLOAD_STORE_FILE',
  'LUMII_UPLOAD_KEY_ALIAS',
  'LUMII_UPLOAD_STORE_PASSWORD',
  'LUMII_UPLOAD_KEY_PASSWORD',
];

function fail(message) {
  const error = new Error(message);
  error.code = 'LUMII_ANDROID_RELEASE_PREREQUISITE_INVALID';
  throw error;
}

function parseJavaProperties(source) {
  const result = {};
  for (const rawLine of String(source || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const separatorIndex = line.search(/[:=]/);
    if (separatorIndex < 1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

function normalizeFingerprint(value) {
  return String(value || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
}

function parseKeytoolCertificate(output) {
  const sha256 = String(output || '').match(/^\s*SHA256:\s*([0-9a-f:]+)\s*$/im)?.[1];
  const sha1 = String(output || '').match(/^\s*SHA1:\s*([0-9a-f:]+)\s*$/im)?.[1];
  if (!sha256 || !sha1) fail('keytool output did not contain SHA256 and SHA1 certificate fingerprints.');
  return { sha1: normalizeFingerprint(sha1), sha256: normalizeFingerprint(sha256) };
}

function parseApkSignerReport(output) {
  const text = String(output || '');
  const signerCount = Number(text.match(/^Number of signers:\s*(\d+)\s*$/im)?.[1]);
  const sha256 = text.match(/^(?:V\d+ )?Signer:\s*certificate SHA-256 digest:\s*([0-9a-f]+)\s*$/im)?.[1];
  const sha1 = text.match(/^(?:V\d+ )?Signer:\s*certificate SHA-1 digest:\s*([0-9a-f]+)\s*$/im)?.[1];
  const verifies = /^Verifies\s*$/im.test(text);
  const v2Verified = /^Verified using v2 scheme \(APK Signature Scheme v2\): true\s*$/im.test(text);
  if (!verifies || !v2Verified || signerCount !== 1 || !sha256 || !sha1) {
    fail('APK must verify with exactly one signer and APK Signature Scheme v2.');
  }
  return { sha1: normalizeFingerprint(sha1), sha256: normalizeFingerprint(sha256), signerCount, v2Verified };
}

function readSigningConfig(env = process.env, options = {}) {
  const propertiesPath = path.resolve(options.signingPropertiesPath || env.LUMII_ANDROID_SIGNING_PROPERTIES || defaultSigningPropertiesPath);
  const properties = fs.existsSync(propertiesPath)
    ? parseJavaProperties(fs.readFileSync(propertiesPath, 'utf8'))
    : {};
  const resolved = Object.fromEntries(signingPropertyNames.map((name) => [name, properties[name] || env[name] || '']));
  const missing = signingPropertyNames.filter((name) => !String(resolved[name]).trim());
  if (missing.length) {
    fail(`Release signing configuration is missing ${missing.join(', ')}. Expected ${propertiesPath} or matching environment variables.`);
  }
  const rawStoreFile = String(resolved.LUMII_UPLOAD_STORE_FILE).trim();
  const storeFile = path.isAbsolute(rawStoreFile) ? rawStoreFile : path.resolve(androidAppRoot, rawStoreFile);
  if (!fs.existsSync(storeFile)) fail(`Release keystore does not exist: ${storeFile}`);
  return {
    alias: String(resolved.LUMII_UPLOAD_KEY_ALIAS).trim(),
    keyPassword: resolved.LUMII_UPLOAD_KEY_PASSWORD,
    propertiesPath,
    storeFile,
    storePassword: resolved.LUMII_UPLOAD_STORE_PASSWORD,
  };
}

function readReleaseMetadata() {
  const appConfig = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'app.json'), 'utf8')).expo;
  const gradle = fs.readFileSync(path.join(androidAppRoot, 'build.gradle'), 'utf8');
  const googleServices = JSON.parse(fs.readFileSync(path.join(androidAppRoot, 'google-services.json'), 'utf8'));
  const packageName = String(appConfig.android?.package || '').trim();
  const versionName = String(appConfig.version || '').trim();
  const versionCode = Number(appConfig.android?.versionCode);
  if (packageName !== expectedPackageName) fail(`app.json Android package must be ${expectedPackageName}.`);
  if (!versionName || !Number.isInteger(versionCode) || versionCode <= 0) fail('app.json must contain a valid Android version and versionCode.');
  if (gradle.match(/applicationId\s+['"]([^'"]+)['"]/)?.[1] !== packageName) fail('Gradle applicationId must match app.json.');
  if (gradle.match(/namespace\s+['"]([^'"]+)['"]/)?.[1] !== packageName) fail('Gradle namespace must match app.json.');
  if (Number(gradle.match(/versionCode\s+(\d+)/)?.[1]) !== versionCode) fail('Gradle versionCode must match app.json.');
  if (gradle.match(/versionName\s+['"]([^'"]+)['"]/)?.[1] !== versionName) fail('Gradle versionName must match app.json.');
  if (String(googleServices.project_info?.project_id || '').trim() !== expectedFirebaseProjectId) {
    fail(`Firebase project must be ${expectedFirebaseProjectId}.`);
  }
  return { packageName, versionCode, versionName };
}

function verifySigningCertificate(signingConfig, options = {}) {
  const runner = options.execFileSync || execFileSync;
  let output;
  try {
    output = runner(options.keytoolCommand || 'keytool', [
      '-J-Duser.language=en',
      '-J-Duser.country=US',
      '-list',
      '-v',
      '-keystore', signingConfig.storeFile,
      '-storepass', signingConfig.storePassword,
      '-alias', signingConfig.alias,
      '-keypass', signingConfig.keyPassword,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  } catch {
    fail('keytool could not read the configured release signing entry. Check the keystore, alias, and passwords.');
  }
  const certificate = parseKeytoolCertificate(output);
  if (certificate.sha256 !== expectedReleaseCertificateSha256) {
    fail(`Configured keystore certificate SHA-256 does not match the Lumii production signing identity (actual ${certificate.sha256}).`);
  }
  return certificate;
}

function findAndroidBuildTool(toolName, env = process.env) {
  const sdkRoots = [env.ANDROID_SDK_ROOT, env.ANDROID_HOME, process.platform === 'win32' ? path.join(env.LOCALAPPDATA || '', 'Android', 'Sdk') : '']
    .filter(Boolean);
  for (const sdkRoot of sdkRoots) {
    const buildToolsRoot = path.join(sdkRoot, 'build-tools');
    if (!fs.existsSync(buildToolsRoot)) continue;
    const versions = fs.readdirSync(buildToolsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const version of versions) {
      const candidate = path.join(buildToolsRoot, version, toolName);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  fail(`Android SDK build tool not found: ${toolName}`);
}

function runBuildTool(command, args, options = {}) {
  const runner = options.execFileSync || execFileSync;
  const execOptions = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true };
  try {
    if (process.platform === 'win32' && command.toLowerCase().endsWith('.bat')) {
      return runner('cmd.exe', ['/d', '/s', '/c', command, ...args], execOptions);
    }
    return runner(command, args, execOptions);
  } catch {
    fail(`Android build tool failed: ${path.basename(command)}`);
  }
}

function verifyApkArtifact(apkPath, metadata = readReleaseMetadata(), options = {}) {
  const resolvedApk = path.resolve(apkPath);
  if (!fs.existsSync(resolvedApk)) fail(`APK does not exist: ${resolvedApk}`);
  const apksigner = options.apksigner || findAndroidBuildTool(process.platform === 'win32' ? 'apksigner.bat' : 'apksigner', options.env);
  const aapt2 = options.aapt2 || findAndroidBuildTool(process.platform === 'win32' ? 'aapt2.exe' : 'aapt2', options.env);
  const signer = parseApkSignerReport(runBuildTool(apksigner, ['verify', '--verbose', '--print-certs', resolvedApk], options));
  if (signer.sha256 !== expectedReleaseCertificateSha256) fail(`APK signer SHA-256 does not match the Lumii production signing identity (actual ${signer.sha256}).`);
  const badging = runBuildTool(aapt2, ['dump', 'badging', resolvedApk], options);
  const packageMatch = badging.match(/^package:\s+name='([^']+)'\s+versionCode='(\d+)'\s+versionName='([^']+)'/m);
  if (!packageMatch) fail('aapt2 could not read APK package metadata.');
  const [, packageName, versionCode, versionName] = packageMatch;
  if (packageName !== metadata.packageName || Number(versionCode) !== metadata.versionCode || versionName !== metadata.versionName) {
    fail(`APK metadata mismatch: ${packageName} ${versionName} (${versionCode}).`);
  }
  if (!/^native-code:\s+'arm64-v8a'\s*$/m.test(badging)) fail('Release APK must contain only the arm64-v8a ABI.');
  return { ...metadata, apkPath: resolvedApk, certificateSha1: signer.sha1, certificateSha256: signer.sha256 };
}

function verifyAndroidReleasePrerequisites(env = process.env, options = {}) {
  validateReleaseConfig(env, { forceProduction: true });
  const metadata = readReleaseMetadata();
  const signingConfig = readSigningConfig(env, options);
  const certificate = verifySigningCertificate(signingConfig, options);
  return { ...metadata, certificateSha1: certificate.sha1, certificateSha256: certificate.sha256 };
}

function parseArgs(argv) {
  const result = { apkPath: '' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--apk') {
      result.apkPath = argv[index + 1] || '';
      index += 1;
    } else {
      fail(`Unknown argument: ${argv[index]}`);
    }
  }
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = {
    ...process.env,
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.lumiiapp.cn',
    EXPO_PUBLIC_API_MODE: 'http',
    EXPO_PUBLIC_REQUIRE_HTTPS: 'true',
    LUMII_ALLOW_CLEARTEXT: 'false',
    LUMII_PRODUCTION_BUILD: 'true',
  };
  const result = verifyAndroidReleasePrerequisites(env);
  const artifact = args.apkPath ? verifyApkArtifact(args.apkPath, result, { env }) : null;
  console.log(`Lumii Android release prerequisites valid: package=${result.packageName} version=${result.versionName} (${result.versionCode}) signerSha256=${result.certificateSha256}${artifact ? ` apk=${artifact.apkPath}` : ''}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  expectedReleaseCertificateSha256,
  normalizeFingerprint,
  parseApkSignerReport,
  parseJavaProperties,
  parseKeytoolCertificate,
  readReleaseMetadata,
  readSigningConfig,
  verifyAndroidReleasePrerequisites,
  verifyApkArtifact,
  verifySigningCertificate,
};
