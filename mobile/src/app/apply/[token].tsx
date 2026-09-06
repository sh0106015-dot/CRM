import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, ErrorView, LabeledInput, Loading, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function ApplyScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data, error, loading, reload } = useAsync(() => api.applyInfo(token), [token]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      setErr('이름과 연락처를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.submitApply(token, {
        name: name.trim(),
        phone: phone.trim(),
        interest: interest.trim() || undefined,
        message: message.trim() || undefined,
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '신청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.flex}>
        {loading ? (
          <Loading />
        ) : error || !data ? (
          <ErrorView message={error ?? '유효하지 않은 링크입니다.'} onRetry={reload} />
        ) : done ? (
          <View style={styles.center}>
            <ThemedText type="subtitle">신청 완료</ThemedText>
            <Muted>{data.agentName} 설계사가 곧 연락드릴 예정입니다.</Muted>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <ThemedText type="subtitle">보험 상담 신청</ThemedText>
              <Muted>{data.agentName} 설계사에게 상담을 요청합니다.</Muted>

              <Card>
                <LabeledInput label="이름" hint="필수" value={name} onChangeText={setName} />
                <LabeledInput
                  label="연락처"
                  hint="필수"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="010-0000-0000"
                />
                <LabeledInput
                  label="관심 보험"
                  value={interest}
                  onChangeText={setInterest}
                  placeholder="예: 건강보험, 자동차보험"
                />
                <LabeledInput
                  label="요청사항"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  placeholder="상담 가능 시간, 궁금한 점 등"
                />
              </Card>

              {err ? (
                <ThemedText type="small" style={{ color: '#E5484D' }}>
                  {err}
                </ThemedText>
              ) : null}

              <Button label={busy ? '전송 중…' : '상담 신청'} onPress={submit} disabled={busy} />
              <Muted>입력하신 정보는 상담 목적으로만 사용됩니다.</Muted>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
});
