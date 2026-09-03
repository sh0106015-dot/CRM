import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushPlatform = 'IOS' | 'ANDROID' | 'WEB';

export interface PushToken {
  token: string;
  platform: PushPlatform;
}

/**
 * 권한 요청 후 푸시 토큰을 반환한다. (실기기에서만 동작)
 *
 * - Expo Go: Expo 푸시 토큰 (`ExponentPushToken[...]`, Expo 서비스가 FCM/APNs 로 전달)
 * - standalone/dev 빌드: 네이티브 디바이스 토큰 (Android=원시 FCM, iOS=APNs)
 *   → 백엔드가 firebase-admin 으로 직접 발송. 실패 시 Expo 토큰으로 폴백.
 */
export async function registerForPushNotifications(): Promise<PushToken | null> {
  if (Platform.OS === 'web') return null; // 웹은 푸시 토큰 미지원
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const platform: PushPlatform =
    Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB';
  const standalone = Constants.executionEnvironment !== 'storeClient';

  if (standalone) {
    try {
      const dev = await Notifications.getDevicePushTokenAsync();
      if (dev?.data && typeof dev.data === 'string') {
        return { token: dev.data, platform };
      }
    } catch {
      // 네이티브 토큰을 못 받으면 Expo 토큰으로 폴백
    }
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync();
    return { token: data, platform };
  } catch {
    return null;
  }
}
