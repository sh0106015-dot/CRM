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
 * 권한 요청 후 Expo 푸시 토큰을 반환한다. (실기기에서만 동작)
 * Android 는 내부적으로 FCM, iOS 는 APNs 로 전달된다.
 */
export async function registerForPushNotifications(): Promise<PushToken | null> {
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

  try {
    const { data } = await Notifications.getExpoPushTokenAsync();
    const platform: PushPlatform =
      Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB';
    return { token: data, platform };
  } catch {
    return null;
  }
}
