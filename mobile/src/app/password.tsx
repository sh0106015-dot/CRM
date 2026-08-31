import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Button, LabeledInput, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';

export default function PasswordScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next.length < 8) {
      Alert.alert('알림', '새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (next !== confirm) {
      Alert.alert('알림', '새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      Alert.alert('완료', '비밀번호가 변경되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '변경 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: '비밀번호 변경', presentation: 'modal' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LabeledInput
            label="현재 비밀번호"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
          />
          <LabeledInput
            label="새 비밀번호"
            hint="8자 이상"
            value={next}
            onChangeText={setNext}
            secureTextEntry
          />
          <LabeledInput
            label="새 비밀번호 확인"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />
          <Button label={busy ? '변경 중…' : '변경'} onPress={submit} disabled={busy} />
          <Muted>소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.</Muted>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
});
