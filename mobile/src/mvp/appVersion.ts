import * as Application from 'expo-application';

import appConfig from '../../app.json';

export function normalizeAppBuildNumber(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function normalizeAppVersionNumbers(value?: null | string) {
  return String(value || '')
    .trim()
    .split(/[^\d]+/)
    .filter(Boolean)
    .map((part) => Number(part));
}

export function compareAppVersions(left?: null | string, right?: null | string) {
  const leftParts = normalizeAppVersionNumbers(left);
  const rightParts = normalizeAppVersionNumbers(right);
  if (!rightParts.length) return 0;
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff > 0) return 1;
    if (diff < 0) return -1;
  }
  return 0;
}

export function isAppBuildTargetNewer(
  currentVersion: string,
  currentBuildNumber: number,
  targetVersion?: string,
  targetBuildNumber?: number,
) {
  const normalizedTargetVersion = String(targetVersion || '').trim();
  const normalizedTargetBuildNumber = normalizeAppBuildNumber(targetBuildNumber);
  if (!normalizedTargetVersion && !normalizedTargetBuildNumber) return false;

  if (normalizedTargetVersion) {
    const versionComparison = compareAppVersions(currentVersion, normalizedTargetVersion);
    if (versionComparison < 0) return true;
    if (versionComparison > 0) return false;
  }

  return normalizedTargetBuildNumber > normalizeAppBuildNumber(currentBuildNumber);
}

export function appBuildTargetKey(version?: string, buildNumber?: number) {
  const normalizedVersion = String(version || '').trim();
  const normalizedBuildNumber = normalizeAppBuildNumber(buildNumber);
  if (!normalizedVersion && !normalizedBuildNumber) return '';
  return `${normalizedVersion || 'same-version'}#${normalizedBuildNumber || 0}`;
}

export function formatAppBuildTarget(version?: string, buildNumber?: number) {
  const normalizedVersion = String(version || '').trim();
  const normalizedBuildNumber = normalizeAppBuildNumber(buildNumber);
  if (normalizedVersion && normalizedBuildNumber) return `${normalizedVersion} (${normalizedBuildNumber})`;
  if (normalizedVersion) return normalizedVersion;
  if (normalizedBuildNumber) return `构建 ${normalizedBuildNumber}`;
  return '新版本';
}

const configuredVersion = String(appConfig.expo.version || '').trim();
const configuredBuildNumber = normalizeAppBuildNumber(appConfig.expo.android?.versionCode);

export const lumiiAppVersion = String(Application.nativeApplicationVersion || configuredVersion || '0.0.0').trim();
export const lumiiAppBuildNumber = normalizeAppBuildNumber(Application.nativeBuildVersion) || configuredBuildNumber;
