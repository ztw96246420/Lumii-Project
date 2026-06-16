import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AuthSession } from '../mvp/types';

type PersistedSession = {
  savedAt: number;
  session: AuthSession;
  version: 1;
};

const SESSION_KEY = 'lumii.auth.session.v1';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hasUsableSession(value: unknown): value is PersistedSession {
  const data = value as Partial<PersistedSession> | null;
  return Boolean(data?.version === 1 && data.session?.phone && data.session?.token && Date.now() - Number(data.savedAt || 0) < SESSION_TTL_MS);
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

async function deleteStorageValue(key: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function loadPersistedLumiiSession() {
  try {
    const raw = await getStorageValue(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!hasUsableSession(parsed)) {
      await clearPersistedLumiiSession();
      return null;
    }
    return parsed.session;
  } catch {
    await clearPersistedLumiiSession();
    return null;
  }
}

export async function savePersistedLumiiSession(session: AuthSession) {
  const payload: PersistedSession = {
    savedAt: Date.now(),
    session,
    version: 1,
  };
  await setStorageValue(SESSION_KEY, JSON.stringify(payload));
}

export async function clearPersistedLumiiSession() {
  await deleteStorageValue(SESSION_KEY);
}

export async function loadLocalJsonStorage<T>(key: string) {
  try {
    const raw = await getStorageValue(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    await deleteStorageValue(key);
    return null;
  }
}

export async function saveLocalJsonStorage<T>(key: string, value: T) {
  await setStorageValue(key, JSON.stringify(value));
}

export async function deleteLocalJsonStorage(key: string) {
  await deleteStorageValue(key);
}
