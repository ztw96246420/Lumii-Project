import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const INSTALLATION_ID_KEY = 'lumii.installation.id.v1';

function createInstallationId() {
  const randomId =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `lumii-${Platform.OS}-${randomId}`;
}

async function getStorageValue(key: string) {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function setStorageValue(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function getLumiiInstallationId() {
  try {
    const existing = await getStorageValue(INSTALLATION_ID_KEY);
    if (existing) return existing;
  } catch {
    // SMS must not be blocked by local storage failures; fall back to a transient ID.
  }

  const nextId = createInstallationId();
  try {
    await setStorageValue(INSTALLATION_ID_KEY, nextId);
  } catch {
    // Best-effort persistence only.
  }
  return nextId;
}
