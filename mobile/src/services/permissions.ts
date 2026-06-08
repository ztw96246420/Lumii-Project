import { PermissionsAndroid, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export type LumiiPermissionKey = 'location' | 'media' | 'notifications';
export type LumiiPermissionStatus = 'blocked' | 'denied' | 'granted' | 'unavailable';

export type LumiiPermissionResult = {
  canAskAgain: boolean;
  message: string;
  permission: LumiiPermissionKey;
  platform: typeof Platform.OS;
  status: LumiiPermissionStatus;
};

export async function getLumiiPermissionStatus(permission: LumiiPermissionKey): Promise<LumiiPermissionResult> {
  if (Platform.OS === 'web') {
    return {
      canAskAgain: true,
      message: webPreviewMessage(permission),
      permission,
      platform: Platform.OS,
      status: 'granted',
    };
  }

  try {
    switch (permission) {
      case 'location':
        return normalizePermissionResult(permission, await Location.getForegroundPermissionsAsync(), '定位权限已开启');

      case 'media':
        return getMediaPermissionStatus();

      case 'notifications':
        return getNotificationPermissionStatus();

      default:
        return unavailable(permission);
    }
  } catch (error) {
    return {
      canAskAgain: false,
      message: error instanceof Error ? error.message : '权限状态检查失败',
      permission,
      platform: Platform.OS,
      status: 'unavailable',
    };
  }
}

export async function requestLumiiPermission(permission: LumiiPermissionKey): Promise<LumiiPermissionResult> {
  if (Platform.OS === 'web') {
    return {
      canAskAgain: true,
      message: webPreviewMessage(permission),
      permission,
      platform: Platform.OS,
      status: 'granted',
    };
  }

  try {
    switch (permission) {
      case 'location':
        return normalizePermissionResult(permission, await Location.requestForegroundPermissionsAsync(), '\u5b9a\u4f4d\u6743\u9650\u5df2\u5f00\u542f');

      case 'media':
        return requestMediaPermissions();

      case 'notifications':
        return requestNotificationPermission();

      default:
        return unavailable(permission);
    }
  } catch (error) {
    return {
      canAskAgain: false,
      message: error instanceof Error ? error.message : '\u6743\u9650\u8bf7\u6c42\u5931\u8d25',
      permission,
      platform: Platform.OS,
      status: 'unavailable',
    };
  }
}

async function requestMediaPermissions(): Promise<LumiiPermissionResult> {
  const [library, camera] = await Promise.all([ImagePicker.requestMediaLibraryPermissionsAsync(), ImagePicker.requestCameraPermissionsAsync()]);
  return normalizeCombinedMediaPermissions(library, camera);
}

async function getMediaPermissionStatus(): Promise<LumiiPermissionResult> {
  const [library, camera] = await Promise.all([ImagePicker.getMediaLibraryPermissionsAsync(), ImagePicker.getCameraPermissionsAsync()]);
  return normalizeCombinedMediaPermissions(library, camera);
}

function normalizeCombinedMediaPermissions(library: { canAskAgain?: boolean; granted?: boolean; status?: string }, camera: { canAskAgain?: boolean; granted?: boolean; status?: string }): LumiiPermissionResult {
  const libraryGranted = isPermissionGranted(library);
  const cameraGranted = isPermissionGranted(camera);

  if (libraryGranted && cameraGranted) {
    return {
      canAskAgain: true,
      message: '\u7167\u7247\u4e0e\u76f8\u673a\u6743\u9650\u5df2\u5f00\u542f',
      permission: 'media',
      platform: Platform.OS,
      status: 'granted',
    };
  }

  const canAskAgain = Boolean(library.canAskAgain && camera.canAskAgain);
  return {
    canAskAgain,
    message: canAskAgain ? '\u672a\u5f00\u542f\u7167\u7247\u4e0e\u76f8\u673a\u6743\u9650' : '\u8bf7\u524d\u5f80\u7cfb\u7edf\u8bbe\u7f6e\u5f00\u542f\u7167\u7247\u4e0e\u76f8\u673a\u6743\u9650',
    permission: 'media',
    platform: Platform.OS,
    status: canAskAgain ? 'denied' : 'blocked',
  };
}

async function requestNotificationPermission(): Promise<LumiiPermissionResult> {
  if (Platform.OS === 'android') {
    return requestAndroidNotificationPermission();
  }

  const Notifications = await importNotifications();

  const result = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return normalizePermissionResult('notifications', result, '\u6d88\u606f\u901a\u77e5\u5df2\u5f00\u542f');
}

async function requestAndroidNotificationPermission(): Promise<LumiiPermissionResult> {
  if (androidVersionNumber() < 33) return granted('notifications', '消息通知已开启');

  const permission = androidNotificationPermission();
  const alreadyGranted = await PermissionsAndroid.check(permission);

  if (alreadyGranted) {
    return granted('notifications', '消息通知已开启');
  }

  const result = await PermissionsAndroid.request(permission);

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return granted('notifications', '消息通知已开启');
  }

  const blocked = result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
  return {
    canAskAgain: !blocked,
    message: blocked ? '\u8bf7\u524d\u5f80\u7cfb\u7edf\u8bbe\u7f6e\u5f00\u542f\u6d88\u606f\u901a\u77e5\u6743\u9650' : '\u672a\u5f00\u542f\u6d88\u606f\u901a\u77e5\u6743\u9650',
    permission: 'notifications',
    platform: Platform.OS,
    status: blocked ? 'blocked' : 'denied',
  };
}

async function getNotificationPermissionStatus(): Promise<LumiiPermissionResult> {
  if (Platform.OS === 'android') {
    if (androidVersionNumber() < 33) return granted('notifications', '消息通知已开启');

    const alreadyGranted = await PermissionsAndroid.check(androidNotificationPermission());
    return alreadyGranted
      ? granted('notifications', '消息通知已开启')
      : {
          canAskAgain: true,
          message: '未开启消息通知权限',
          permission: 'notifications',
          platform: Platform.OS,
          status: 'denied',
        };
  }

  const Notifications = await importNotifications();
  return normalizePermissionResult('notifications', await Notifications.getPermissionsAsync(), '消息通知已开启');
}

async function importNotifications() {
  const moduleName = 'expo-notifications';
  return import(moduleName);
}

function androidNotificationPermission() {
  return ((PermissionsAndroid.PERMISSIONS as Record<string, string>).POST_NOTIFICATIONS ??
    'android.permission.POST_NOTIFICATIONS') as Parameters<typeof PermissionsAndroid.check>[0];
}

function androidVersionNumber() {
  const version = Platform.Version;
  return typeof version === 'number' ? version : Number.parseInt(String(version), 10) || 0;
}

function granted(permission: LumiiPermissionKey, message: string): LumiiPermissionResult {
  return {
    canAskAgain: true,
    message,
    permission,
    platform: Platform.OS,
    status: 'granted',
  };
}

function normalizePermissionResult(
  permission: LumiiPermissionKey,
  result: { canAskAgain?: boolean; granted?: boolean; status?: string },
  grantedMessage: string,
): LumiiPermissionResult {
  if (isPermissionGranted(result)) {
    return {
      canAskAgain: true,
      message: grantedMessage,
      permission,
      platform: Platform.OS,
      status: 'granted',
    };
  }

  const canAskAgain = result.canAskAgain !== false;
  return {
    canAskAgain,
    message: deniedMessage(permission, canAskAgain),
    permission,
    platform: Platform.OS,
    status: canAskAgain ? 'denied' : 'blocked',
  };
}

function isPermissionGranted(result: { granted?: boolean; status?: string }) {
  return result.granted === true || result.status === 'granted';
}

function deniedMessage(permission: LumiiPermissionKey, canAskAgain: boolean) {
  const name = permissionName(permission);
  return canAskAgain ? `\u672a\u5f00\u542f${name}\u6743\u9650` : `\u8bf7\u524d\u5f80\u7cfb\u7edf\u8bbe\u7f6e\u5f00\u542f${name}\u6743\u9650`;
}

function permissionName(permission: LumiiPermissionKey) {
  const names: Record<LumiiPermissionKey, string> = {
    location: '\u5b9a\u4f4d',
    media: '\u7167\u7247\u4e0e\u76f8\u673a',
    notifications: '\u6d88\u606f\u901a\u77e5',
  };
  return names[permission];
}

function unavailable(permission: LumiiPermissionKey): LumiiPermissionResult {
  return {
    canAskAgain: false,
    message: '\u5f53\u524d\u8bbe\u5907\u4e0d\u652f\u6301\u8be5\u6743\u9650\u8bf7\u6c42',
    permission,
    platform: Platform.OS,
    status: 'unavailable',
  };
}

function webPreviewMessage(permission: LumiiPermissionKey) {
  return `${permissionName(permission)}\u6743\u9650\u5df2\u5728 Web \u9884\u89c8\u4e2d\u6a21\u62df\u5f00\u542f`;
}
