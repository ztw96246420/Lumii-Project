import { Platform } from 'react-native';

const LUMII_EXPO_PROJECT_ID = '2ee72091-b060-4b97-b8c5-9df7e555b712';

export type LumiiPushRegistration = {
  deviceId?: string;
  platform: 'android' | 'ios' | 'web';
  token: string;
};

export async function getLumiiPushRegistration(): Promise<LumiiPushRegistration | null> {
  if (Platform.OS === 'web') return null;

  const Notifications = await importNotifications();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('lumii-default', {
      importance: Notifications.AndroidImportance.DEFAULT,
      name: '灵伴通知',
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId: LUMII_EXPO_PROJECT_ID });
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return { platform, token: token.data };
}

async function importNotifications() {
  const moduleName = 'expo-notifications';
  return import(moduleName);
}
