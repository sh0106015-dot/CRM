import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { googleClientIds, isGoogleConfigured } from '@/lib/oauth';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@crm.local');
  const [password, setPassword] = useState('demo1234');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest(
    googleClientIds(),
  );

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.params.id_token;
    if (!idToken) return;
    setBusy(true);
    setErr(null);
    signInWithGoogle(idToken)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Google 로그인 실패'))
      .finally(() => setBusy(false));
  }, [googleResponse, signInWithGoogle]);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(name.trim(), email.trim(), password);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '요청 실패');
    } finally {
      setBusy(false);
    }
  };

  const onApple = async () => {
    setErr(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple 토큰을 받지 못했습니다.');
      const fullName = [credential.fullName?.familyName, credential.fullName?.givenName]
        .filter(Boolean)
        .join(' ');
      setBusy(true);
      await signInWithApple(credential.identityToken, fullName || undefined);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'ERR_REQUEST_CANCELED') return;
      setErr(e instanceof Error ? e.message : 'Apple 로그인 실패');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.container}>
            <ThemedText type="subtitle">AI 고객관리</ThemedText>
            <Muted>
              {mode === 'login' ? '로그인하고 오늘의 관리 대상을 확인하세요.' : '새 계정을 만듭니다.'}
            </Muted>

            <View style={styles.form}>
              {mode === 'signup' && (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="이름"
                  placeholderTextColor={theme.textSecondary}
                  style={inputStyle}
                />
              )}
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="이메일"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                style={inputStyle}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호 (8자 이상)"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                style={inputStyle}
              />

              {err ? (
                <ThemedText type="small" style={{ color: '#E5484D' }}>
                  {err}
                </ThemedText>
              ) : null}

              <Button
                label={busy ? '처리 중…' : mode === 'login' ? '로그인' : '가입하기'}
                onPress={submit}
                disabled={busy}
              />
              <Button
                label={mode === 'login' ? '계정 만들기' : '로그인으로 돌아가기'}
                variant="secondary"
                onPress={() => {
                  setErr(null);
                  setMode(mode === 'login' ? 'signup' : 'login');
                }}
              />
            </View>

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
              <Muted>또는</Muted>
              <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
            </View>

            <View style={styles.form}>
              <Button
                label={isGoogleConfigured() ? 'Google로 계속하기' : 'Google (구성 필요)'}
                variant="secondary"
                disabled={!googleRequest || !isGoogleConfigured() || busy}
                onPress={() => promptGoogle()}
              />
              {appleAvailable ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={
                    theme.background === '#000000'
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={8}
                  style={styles.appleButton}
                  onPress={onApple}
                />
              ) : null}
            </View>

            {mode === 'login' ? <Muted>데모: demo@crm.local / demo1234</Muted> : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  form: { gap: Spacing.two, marginTop: Spacing.three },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  appleButton: { height: 44 },
});
