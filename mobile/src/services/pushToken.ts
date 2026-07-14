import type { DevicePushToken } from 'expo-notifications';
import { Platform } from 'react-native';

import type { PushRegistrationFailureCode } from '../mvp/types';
import { getLumiiInstallationId } from './installationId';

const LUMII_EXPO_PROJECT_ID = '2ee72091-b060-4b97-b8c5-9df7e555b712';

export type LumiiPushRegistration = {
  deviceId: string;
  platform: 'android' | 'ios';
  token: string;
};

export type LumiiPushRegistrationFailure = {
  code: PushRegistrationFailureCode;
  message: string;
  retryable: boolean;
  stage: 'expo_token' | 'native_token';
};

export async function getLumiiPushRegistration(devicePushToken?: DevicePushToken): Promise<LumiiPushRegistration | null> {
  if (Platform.OS === 'web') return null;

  const Notifications = await importNotifications();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('lumii-default', {
      importance: Notifications.AndroidImportance.DEFAULT,
      name: '灵伴通知',
    });
  }

  const [token, deviceId] = await Promise.all([
    Notifications.getExpoPushTokenAsync({
      ...(devicePushToken ? { devicePushToken } : {}),
      projectId: LUMII_EXPO_PROJECT_ID,
    }),
    getLumiiInstallationId(),
  ]);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return { deviceId, platform, token: token.data };
}

export function classifyLumiiPushRegistrationError(error: unknown): LumiiPushRegistrationFailure {
  const source = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : null;
  const nativeCode = String(source?.code || '').trim();
  const rawMessage = String(source?.message || error || '').trim();
  const searchable = `${nativeCode} ${rawMessage}`.toLowerCase();

  if (
    searchable.includes('googleservicesfile')
    || searchable.includes('google-services.json')
    || searchable.includes('default firebaseapp')
    || searchable.includes('firebase messaging instance')
  ) {
    return {
      code: 'native_config_missing',
      message: '当前安装包的通知服务配置不完整，请更新到修复后的版本',
      retryable: false,
      stage: 'native_token',
    };
  }

  if (nativeCode === 'ERR_NOTIFICATIONS_NETWORK_ERROR' || /network|timeout|offline|fetch failed/.test(searchable)) {
    return {
      code: 'expo_network_error',
      message: '通知服务连接失败，联网后会自动重试',
      retryable: true,
      stage: 'expo_token',
    };
  }

  if (nativeCode === 'ERR_NOTIFICATIONS_SERVER_ERROR') {
    return {
      code: 'expo_service_error',
      message: '通知服务暂时不可用，稍后会自动重试',
      retryable: true,
      stage: 'expo_token',
    };
  }

  if (nativeCode === 'E_REGISTRATION_FAILED') {
    return {
      code: 'native_token_failed',
      message: '设备通知登记失败，稍后会自动重试',
      retryable: true,
      stage: 'native_token',
    };
  }

  return {
    code: 'unknown',
    message: '通知设备登记失败，稍后会自动重试',
    retryable: true,
    stage: 'native_token',
  };
}

export async function watchLumiiPushTokenChanges(
  listener: (result: { error?: LumiiPushRegistrationFailure; registration?: LumiiPushRegistration }) => void,
): Promise<() => void> {
  if (Platform.OS === 'web') return () => undefined;
  const Notifications = await importNotifications();
  const subscription = Notifications.addPushTokenListener((devicePushToken: DevicePushToken) => {
    void getLumiiPushRegistration(devicePushToken)
      .then((registration) => {
        if (registration) listener({ registration });
      })
      .catch((error) => listener({ error: classifyLumiiPushRegistrationError(error) }));
  });
  return () => subscription.remove();
}

async function importNotifications() {
  const moduleName = 'expo-notifications';
  return import(moduleName);
}
