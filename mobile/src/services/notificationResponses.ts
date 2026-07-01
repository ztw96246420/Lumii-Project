import { Platform } from 'react-native';

import type { NotificationCategory, NotificationItem, NotificationKind } from '../mvp/types';

const handledResponseKeys = new Set<string>();

const notificationKinds: NotificationKind[] = [
  'conversation_message',
  'greeting_accepted',
  'greeting_request',
  'health_reminder',
  'medical_alert',
  'pet_circle_comment',
  'pet_circle_greeting',
  'pet_circle_like',
  'place_review',
  'place_submission',
  'support_reply',
  'system',
  'vaccine_done',
  'vaccine_reminder',
  'walk_invite',
];

const notificationCategories: NotificationCategory[] = ['health', 'interaction', 'system', 'walk'];

export async function watchLumiiNotificationResponses(onNotification: (item: NotificationItem) => void): Promise<() => void> {
  if (Platform.OS === 'web') return () => {};

  try {
    const Notifications = await importNotifications();
    const consumeResponse = (response: any) => {
      const key = notificationResponseKey(response);
      if (key && handledResponseKeys.has(key)) return;
      const data = response?.notification?.request?.content?.data;
      const item = notificationItemFromResponseData(data);
      if (!item) return;
      if (key) handledResponseKeys.add(key);
      onNotification(item);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(consumeResponse);
    if (typeof Notifications.getLastNotificationResponseAsync === 'function') {
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) consumeResponse(lastResponse);
    }

    return () => {
      subscription?.remove?.();
    };
  } catch {
    return () => {};
  }
}

export function notificationItemFromResponseData(value: unknown): NotificationItem | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (!isLumiiNotificationData(data)) return null;

  const kind = notificationKindFromResponseData(data);
  const category = notificationCategoryFromResponseData(data, kind);
  const serverNotificationId = firstString(data.id, data.notificationId);
  const title = firstString(data.title) || 'Lumii notification';
  const text = firstString(data.text, data.body, data.message);

  const actionRoute = notificationActionRouteFromResponseData(data);
  return {
    ...(actionRoute ? { actionRoute } : {}),
    category,
    commentId: firstString(data.commentId),
    conversationId: firstString(data.conversationId),
    createdAt: firstString(data.createdAt),
    id: serverNotificationId || syntheticNotificationId(kind, data),
    kind,
    memoId: firstString(data.memoId),
    ownerId: firstString(data.ownerId),
    placeId: firstString(data.placeId),
    postId: firstString(data.postId),
    read: !serverNotificationId,
    submissionId: firstString(data.submissionId),
    ticketId: firstString(data.ticketId),
    text,
    title,
    vaccineId: firstString(data.vaccineId),
  };
}

function notificationActionRouteFromResponseData(data: Record<string, unknown>): NotificationItem['actionRoute'] | '' {
  const route = firstString(data.actionRoute, data.action_route);
  if (route === 'discover' || route === 'home' || route === 'map' || route === 'notifications' || route === 'profile' || route === 'safety' || route === 'settings' || route === 'supportTickets') return route;
  return '';
}

function isLumiiNotificationData(data: Record<string, unknown>) {
  const source = firstString(data.source, data.app, data.application);
  if (/^lumii\b|^lumii[-_]/i.test(source)) return true;
  const explicitKind = normalizeIdentifier(firstString(data.kind, data.notificationKind));
  const category = normalizeIdentifier(firstString(data.category));
  const type = normalizeIdentifier(firstString(data.type, data.route));
  return Boolean(
    isNotificationKind(explicitKind) ||
      isNotificationCategory(category) ||
      isKnownNotificationType(type) ||
      firstString(data.notificationId, data.conversationId, data.ownerId, data.postId, data.placeId, data.submissionId, data.ticketId, data.memoId, data.vaccineId, data.actionRoute, data.action_route),
  );
}

function notificationKindFromResponseData(data: Record<string, unknown>): NotificationKind {
  const explicitKind = normalizeIdentifier(firstString(data.kind, data.notificationKind));
  if (isNotificationKind(explicitKind)) return explicitKind;

  const type = normalizeIdentifier(firstString(data.type, data.route, data.source));
  if (isNotificationKind(type)) return type;
  if (type === 'vaccine' || type === 'vaccine_plan' || type === 'vaccine_reminder' || (type === 'lumii_health' && firstString(data.vaccineId))) return 'vaccine_reminder';
  if (type === 'vaccine_done') return 'vaccine_done';
  if (type === 'medical' || type === 'medical_alert') return 'medical_alert';
  if (type === 'pet_circle' && firstString(data.postId)) return firstString(data.commentId) ? 'pet_circle_comment' : 'pet_circle_like';
  if (type === 'conversation' || type === 'chat' || firstString(data.conversationId)) return 'conversation_message';
  if (type === 'support' || type === 'ticket' || type === 'support_reply' || firstString(data.ticketId)) return 'support_reply';
  if (type === 'walk' || type === 'walk_invite') return 'walk_invite';
  if (type === 'place' || type === 'place_review') return firstString(data.submissionId) ? 'place_submission' : 'place_review';
  if (firstString(data.memoId)) return 'medical_alert';
  if (firstString(data.vaccineId)) return 'vaccine_reminder';
  return 'system';
}

function notificationCategoryFromResponseData(data: Record<string, unknown>, kind: NotificationKind): NotificationCategory {
  const category = normalizeIdentifier(firstString(data.category));
  if (isNotificationCategory(category)) return category;
  if (kind === 'vaccine_done' || kind === 'vaccine_reminder' || kind === 'health_reminder' || kind === 'medical_alert') return 'health';
  if (kind === 'walk_invite') return 'walk';
  if (kind === 'place_review' || kind === 'place_submission' || kind === 'support_reply' || kind === 'system') return 'system';
  return 'interaction';
}

function syntheticNotificationId(kind: NotificationKind, data: Record<string, unknown>) {
  return [
    'external',
    kind,
    firstString(data.conversationId, data.ownerId, data.postId, data.placeId, data.submissionId, data.ticketId, data.memoId, data.vaccineId, data.actionRoute, data.action_route) || Date.now(),
  ].join('-');
}

function notificationResponseKey(response: any) {
  const identifier = firstString(response?.notification?.request?.identifier);
  const actionIdentifier = firstString(response?.actionIdentifier);
  const data = response?.notification?.request?.content?.data;
  return [identifier, actionIdentifier, stableDataKey(data)].filter(Boolean).join(':');
}

function stableDataKey(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  try {
    return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
  } catch {
    return '';
  }
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase().replace(/[-\s]+/g, '_');
}

function isNotificationKind(value: string): value is NotificationKind {
  return notificationKinds.includes(value as NotificationKind);
}

function isNotificationCategory(value: string): value is NotificationCategory {
  return notificationCategories.includes(value as NotificationCategory);
}

function isKnownNotificationType(value: string) {
  return [
    'chat',
    'conversation',
    'lumii_health',
    'medical',
    'medical_alert',
    'pet_circle',
    'place',
    'place_review',
    'vaccine',
    'vaccine_done',
    'vaccine_plan',
    'vaccine_reminder',
    'walk',
    'walk_invite',
  ].includes(value);
}

async function importNotifications() {
  const moduleName = 'expo-notifications';
  return import(moduleName);
}
