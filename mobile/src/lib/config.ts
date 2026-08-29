import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * 개발 중 백엔드(NestJS, 기본 :3000) 주소를 자동으로 추론한다.
 *
 * - 웹 / iOS 시뮬레이터: localhost
 * - Android 에뮬레이터: 10.0.2.2 (호스트 루프백)
 * - 실기기 (Expo Go): Metro 번들러가 물려 있는 개발 PC의 LAN IP 재사용
 *
 * 프로덕션에서는 EXPO_PUBLIC_API_URL 환경변수로 덮어쓴다.
 */
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const port = 3000;
  const prefix = '/api';

  // Metro 호스트 (예: "192.168.0.12:8081")
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split(':')[0];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${port}${prefix}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}${prefix}`;
  }
  return `http://localhost:${port}${prefix}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
