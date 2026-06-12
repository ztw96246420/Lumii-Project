import { Platform } from 'react-native';

import type { VaccinePlan } from '../mvp/types';

const healthReminderChannelId = 'lumii-health-reminders';
const reminderLeadHours = 24;
let notificationHandlerConfigured = false;

export type LumiiLocalReminderResult = {
  notificationId?: string;
  reason?: 'invalid_due_date' | 'unavailable' | 'web';
  scheduled: boolean;
  scheduledAt?: string;
};

export async function scheduleVaccineLocalReminder(vaccine: VaccinePlan, petName?: string): Promise<LumiiLocalReminderResult> {
  if (Platform.OS === 'web') return { reason: 'web', scheduled: false };

  const triggerDate = reminderDateFor(vaccine.dueAt);
  if (!triggerDate) return { reason: 'invalid_due_date', scheduled: false };

  try {
    const Notifications = await importNotifications();
    await ensureHealthReminderNotificationsReady(Notifications);
    const notificationId = vaccineReminderNotificationId(vaccine.id);
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await Notifications.scheduleNotificationAsync({
      content: {
        body: `${petName ? `${petName}的` : ''}${vaccine.name}：${vaccineReminderBody(vaccine.dueAt)}`,
        data: {
          dueAt: vaccine.dueAt,
          source: 'lumii-health',
          type: 'vaccine-reminder',
          vaccineId: vaccine.id,
        },
        sound: true,
        title: '灵伴健康提醒',
      },
      identifier: notificationId,
      trigger: {
        channelId: healthReminderChannelId,
        date: triggerDate,
        type: 'date',
      },
    });
    return { notificationId, scheduled: true, scheduledAt: triggerDate.toISOString() };
  } catch {
    return { reason: 'unavailable', scheduled: false };
  }
}

export async function syncVaccineLocalReminders(vaccines: VaccinePlan[], reminderIds: string[], petName?: string) {
  const reminderIdSet = new Set(reminderIds);
  const targets = vaccines.filter((vaccine) => reminderIdSet.has(vaccine.id) && vaccine.status !== 'done');
  await Promise.all(targets.map((vaccine) => scheduleVaccineLocalReminder(vaccine, petName)));
}

export async function cancelVaccineLocalReminder(vaccineId: string) {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await importNotifications();
    await Notifications.cancelScheduledNotificationAsync(vaccineReminderNotificationId(vaccineId));
  } catch {
    // Local notification cancellation is a best-effort cleanup.
  }
}

export async function cancelVaccineLocalReminders(vaccineIds: string[]) {
  await Promise.all([...new Set(vaccineIds)].map((id) => cancelVaccineLocalReminder(id)));
}

function vaccineReminderNotificationId(vaccineId: string) {
  return `lumii-vaccine-${vaccineId}`;
}

function reminderDateFor(dueAt: string) {
  const dueDate = dateAtLocalHour(dueAt, 9);
  if (!dueDate) return null;

  const now = new Date();
  const leadDate = new Date(dueDate);
  leadDate.setHours(leadDate.getHours() - reminderLeadHours);
  if (leadDate.getTime() > now.getTime() + 60 * 1000) return leadDate;
  if (dueDate.getTime() > now.getTime() + 60 * 1000) return dueDate;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

function dateAtLocalHour(isoDate: string, hour: number) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function vaccineReminderBody(dueAt: string) {
  const days = daysUntil(dueAt);
  if (days === null) return '接种日期待确认，请按宠物医院建议确认时间。';
  if (days < 0) return `已逾期 ${Math.abs(days)} 天，请尽快和宠物医院确认。`;
  if (days === 0) return '今天到期，请按宠物医院建议确认接种时间。';
  if (days === 1) return '明天到期，请提前确认接种安排。';
  return `${days} 天后到期，记得提前确认接种安排。`;
}

function daysUntil(dueAt: string) {
  const dueDate = dateAtLocalHour(dueAt, 0);
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

async function ensureHealthReminderNotificationsReady(Notifications: any) {
  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(healthReminderChannelId, {
      importance: Notifications.AndroidImportance.DEFAULT,
      name: '灵伴健康提醒',
    });
  }
}

async function importNotifications() {
  const moduleName = 'expo-notifications';
  return import(moduleName);
}
