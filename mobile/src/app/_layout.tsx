import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { DialogProvider } from '@/components/dialog';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { token, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    SplashScreen.hideAsync();

    const onLogin = segments[0] === 'login';
    if (!token && !onLogin) {
      router.replace('/login');
    } else if (token && onLogin) {
      router.replace('/');
    }
  }, [token, initializing, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="customer/[id]/index" options={{ headerShown: true, title: '고객 상세' }} />
      <Stack.Screen
        name="customer/[id]/edit"
        options={{ headerShown: true, title: '고객 수정', presentation: 'modal' }}
      />
      <Stack.Screen
        name="customer/[id]/consultation"
        options={{ headerShown: true, title: '상담 기록', presentation: 'modal' }}
      />
      <Stack.Screen
        name="customer/new"
        options={{ headerShown: true, title: '고객 등록', presentation: 'modal' }}
      />
      <Stack.Screen
        name="schedule/new"
        options={{ headerShown: true, title: '일정 추가', presentation: 'modal' }}
      />
      <Stack.Screen
        name="report"
        options={{ headerShown: true, title: '주간 리포트', presentation: 'modal' }}
      />
      <Stack.Screen
        name="tags"
        options={{ headerShown: true, title: '태그 관리', presentation: 'modal' }}
      />
      <Stack.Screen
        name="password"
        options={{ headerShown: true, title: '비밀번호 변경', presentation: 'modal' }}
      />
      <Stack.Screen
        name="news"
        options={{ headerShown: true, title: '오늘의 뉴스', presentation: 'modal' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <DialogProvider>
          <RootNavigator />
        </DialogProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
