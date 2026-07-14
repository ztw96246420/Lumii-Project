import { Platform } from 'react-native';

import { lumiiApi } from '../mvp/api';
import { lumiiAppBuildNumber, lumiiAppVersion } from '../mvp/appVersion';
import { deleteLocalJsonStorage, loadLocalJsonStorage, saveLocalJsonStorage } from './sessionStorage';

const RUNTIME_ERROR_QUEUE_KEY = 'lumii.runtime-errors.v1';
const RUNTIME_ERROR_QUEUE_LIMIT = 20;
const RUNTIME_ERROR_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RUNTIME_ERROR_DEDUPE_MS = 30 * 60 * 1000;

export type LumiiRuntimeErrorKind = 'global' | 'render' | 'unhandled_rejection';

type StoredRuntimeError = {
  appBuild: number;
  appVersion: string;
  errorName: string;
  fatal: boolean;
  fingerprint: string;
  firstOccurredAt: string;
  id: string;
  kind: LumiiRuntimeErrorKind;
  lastOccurredAt: string;
  occurrenceCount: number;
  platform: string;
  route: string;
  sessionScope: string;
};

type RuntimeErrorCaptureOptions = {
  componentStack?: string | null;
  fatal?: boolean;
  kind: LumiiRuntimeErrorKind;
  route?: string;
};

type ReactNativeErrorUtils = {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

let activeSessionScope = '';
let queueOperation: Promise<unknown> = Promise.resolve();

function hashRuntimeValue(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function runtimeErrorScope(phone: string) {
  const normalized = String(phone || '').replace(/\D/g, '');
  return normalized ? hashRuntimeValue(`lumii-session:${normalized}`) : '';
}

function runtimeErrorName(error: unknown) {
  const candidate = error && typeof error === 'object' ? String((error as { name?: unknown }).name || '') : '';
  return (candidate || (typeof error === 'string' ? 'Error' : 'UnknownError'))
    .replace(/[^0-9A-Za-z_.-]/g, '')
    .slice(0, 48) || 'UnknownError';
}

function runtimeErrorFingerprint(error: unknown, componentStack?: string | null) {
  const stack = error && typeof error === 'object' ? String((error as { stack?: unknown }).stack || '') : '';
  const stackFrames = stack.split(/\r?\n/).slice(0, 5).map((line) => line.trim()).filter(Boolean);
  const componentFrames = String(componentStack || '').split(/\r?\n/).slice(0, 5).map((line) => line.trim()).filter(Boolean);
  return hashRuntimeValue([runtimeErrorName(error), ...stackFrames, ...componentFrames].join('|'));
}

function normalizeRuntimeRoute(value: string | undefined) {
  return String(value || '').replace(/[^0-9A-Za-z_.-]/g, '').slice(0, 40);
}

function isStoredRuntimeError(value: unknown): value is StoredRuntimeError {
  const item = value as Partial<StoredRuntimeError> | null;
  const lastOccurredAt = Date.parse(String(item?.lastOccurredAt || ''));
  return Boolean(
    typeof item?.id === 'string'
    && typeof item.sessionScope === 'string'
    && /^[0-9a-f]{8}$/i.test(item.sessionScope)
    && typeof item.fingerprint === 'string'
    && /^[0-9a-f]{8}$/i.test(item.fingerprint)
    && ['global', 'render', 'unhandled_rejection'].includes(String(item.kind || ''))
    && typeof item.errorName === 'string'
    && Number.isFinite(Number(item.occurrenceCount))
    && Number(item.occurrenceCount) >= 1
    && Number.isFinite(lastOccurredAt)
    && lastOccurredAt > Date.now() - RUNTIME_ERROR_RETENTION_MS,
  );
}

async function readRuntimeErrorQueue() {
  const queue = await loadLocalJsonStorage<unknown[]>(RUNTIME_ERROR_QUEUE_KEY);
  return Array.isArray(queue) ? queue.filter(isStoredRuntimeError).slice(-RUNTIME_ERROR_QUEUE_LIMIT) : [];
}

async function writeRuntimeErrorQueue(queue: StoredRuntimeError[]) {
  if (!queue.length) {
    await deleteLocalJsonStorage(RUNTIME_ERROR_QUEUE_KEY);
    return;
  }
  await saveLocalJsonStorage(RUNTIME_ERROR_QUEUE_KEY, queue.slice(-RUNTIME_ERROR_QUEUE_LIMIT));
}

function serializeQueueOperation<T>(operation: () => Promise<T>) {
  const result = queueOperation.catch(() => undefined).then(operation);
  queueOperation = result.catch(() => undefined);
  return result;
}

function createRuntimeError(error: unknown, options: RuntimeErrorCaptureOptions): StoredRuntimeError | null {
  if (!activeSessionScope) return null;
  const occurredAt = new Date().toISOString();
  const fingerprint = runtimeErrorFingerprint(error, options.componentStack);
  return {
    appBuild: lumiiAppBuildNumber,
    appVersion: lumiiAppVersion,
    errorName: runtimeErrorName(error),
    fatal: Boolean(options.fatal),
    fingerprint,
    firstOccurredAt: occurredAt,
    id: `runtime-error-${Date.now()}-${fingerprint}`,
    kind: options.kind,
    lastOccurredAt: occurredAt,
    occurrenceCount: 1,
    platform: Platform.OS,
    route: normalizeRuntimeRoute(options.route),
    sessionScope: activeSessionScope,
  };
}

export function setLumiiRuntimeErrorSession(phone = '') {
  activeSessionScope = runtimeErrorScope(phone);
}

export async function captureLumiiRuntimeError(error: unknown, options: RuntimeErrorCaptureOptions) {
  const item = createRuntimeError(error, options);
  if (!item) return false;
  await serializeQueueOperation(async () => {
    const queue = await readRuntimeErrorQueue();
    const duplicateIndex = queue.findIndex((candidate) => (
      candidate.sessionScope === item.sessionScope
      && candidate.fingerprint === item.fingerprint
      && candidate.kind === item.kind
      && Date.parse(item.lastOccurredAt) - Date.parse(candidate.lastOccurredAt) <= RUNTIME_ERROR_DEDUPE_MS
    ));
    if (duplicateIndex >= 0) {
      const previous = queue[duplicateIndex];
      queue.splice(duplicateIndex, 1, {
        ...previous,
        fatal: previous.fatal || item.fatal,
        lastOccurredAt: item.lastOccurredAt,
        occurrenceCount: Math.min(999, Math.max(1, Math.floor(Number(previous.occurrenceCount || 1))) + 1),
        route: item.route || previous.route,
      });
    } else {
      queue.push(item);
    }
    await writeRuntimeErrorQueue(queue);
  });
  void flushLumiiRuntimeErrors();
  return true;
}

export function flushLumiiRuntimeErrors() {
  const targetScope = activeSessionScope;
  if (!targetScope) return Promise.resolve(0);
  return serializeQueueOperation(async () => {
    const queue = await readRuntimeErrorQueue();
    const deliveredIds = new Set<string>();
    for (const item of queue.filter((candidate) => candidate.sessionScope === targetScope)) {
      const result = await lumiiApi.analytics.trackEvent({
        appBuild: item.appBuild,
        appVersion: item.appVersion,
        name: 'app.runtime_error',
        occurredAt: item.lastOccurredAt,
        platform: item.platform,
        properties: {
          errorName: item.errorName,
          fatal: item.fatal,
          fingerprint: item.fingerprint,
          kind: item.kind,
          occurrenceCount: item.occurrenceCount,
          queuedDelaySeconds: Math.max(0, Math.round((Date.now() - Date.parse(item.lastOccurredAt)) / 1000)),
        },
        route: item.route,
        source: 'runtime_error',
      });
      if (!result.data || (!result.data.accepted && !result.data.disabled)) break;
      deliveredIds.add(item.id);
    }
    if (deliveredIds.size) await writeRuntimeErrorQueue(queue.filter((item) => !deliveredIds.has(item.id)));
    return deliveredIds.size;
  });
}

export function installLumiiGlobalErrorHandler(route: () => string) {
  const runtimeGlobal = globalThis as typeof globalThis & { ErrorUtils?: ReactNativeErrorUtils };
  const errorUtils = runtimeGlobal.ErrorUtils;
  const previousHandler = errorUtils?.getGlobalHandler?.();
  const nextHandler = (error: unknown, isFatal?: boolean) => {
    void captureLumiiRuntimeError(error, { fatal: Boolean(isFatal), kind: 'global', route: route() });
    previousHandler?.(error, isFatal);
  };
  errorUtils?.setGlobalHandler?.(nextHandler);

  const webTarget = Platform.OS === 'web' ? globalThis as typeof globalThis & {
    addEventListener?: (type: string, listener: (event: unknown) => void) => void;
    removeEventListener?: (type: string, listener: (event: unknown) => void) => void;
  } : null;
  const webErrorListener = (event: unknown) => {
    const source = event && typeof event === 'object' ? (event as { error?: unknown }).error : event;
    void captureLumiiRuntimeError(source, { fatal: false, kind: 'global', route: route() });
  };
  const webRejectionListener = (event: unknown) => {
    const source = event && typeof event === 'object' ? (event as { reason?: unknown }).reason : event;
    void captureLumiiRuntimeError(source, { fatal: false, kind: 'unhandled_rejection', route: route() });
  };
  webTarget?.addEventListener?.('error', webErrorListener);
  webTarget?.addEventListener?.('unhandledrejection', webRejectionListener);

  return () => {
    if (errorUtils?.getGlobalHandler?.() === nextHandler && previousHandler) errorUtils.setGlobalHandler?.(previousHandler);
    webTarget?.removeEventListener?.('error', webErrorListener);
    webTarget?.removeEventListener?.('unhandledrejection', webRejectionListener);
  };
}
