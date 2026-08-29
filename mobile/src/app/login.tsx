import { useState } from 'react';
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

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@crm.local');
  const [password, setPassword] = useState('demo1234');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
});
