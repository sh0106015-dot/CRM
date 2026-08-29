import Constants from 'expo-constants';

interface GoogleClientIds {
  iosClientId?: string;
  androidClientId?: string;
  webClientId?: string;
}

/**
 * Google OAuth 클라이언트 ID.
 * 우선순위: EXPO_PUBLIC_GOOGLE_* 환경변수 → app.json extra.googleClientIds
 * 하나도 없으면 Google 로그인 버튼은 비활성화된다.
 */
export function googleClientIds(): GoogleClientIds {
  const extra = (Constants.expoConfig?.extra?.googleClientIds ?? {}) as Record<
    string,
    string | null
  >;
  const ids: GoogleClientIds = {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? extra.ios ?? undefined,
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? extra.android ?? undefined,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? extra.web ?? undefined,
  };
  return ids;
}

export function isGoogleConfigured(): boolean {
  const ids = googleClientIds();
  return Boolean(ids.iosClientId || ids.androidClientId || ids.webClientId);
}
