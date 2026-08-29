import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Chip, LabeledInput, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api, SCHEDULE_TYPES } from '@/lib/api';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewScheduleScreen() {
  const router = useRouter();
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState<string>('CONTACT');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('필수 항목', '제목을 입력하세요.');
      return;
    }
    const iso = new Date(`${date.trim()}T${(time.trim() || '09:00')}:00`);
    if (Number.isNaN(iso.getTime())) {
      Alert.alert('형식 오류', '날짜(YYYY-MM-DD)와 시간(HH:mm)을 확인하세요.');
      return;
    }

    setBusy(true);
    try {
      await api.createSchedule({
        title: title.trim(),
        scheduleDate: iso.toISOString(),
        type,
        customerId: customerId || undefined,
        memo: memo.trim() || undefined,
      });
      router.back();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: '일정 추가', presentation: 'modal' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {customerId ? <Muted>이 고객에 연결된 일정으로 생성됩니다.</Muted> : null}

          <LabeledInput
            label="제목"
            hint="필수"
            value={title}
            onChangeText={setTitle}
            placeholder="예: 이준호 고객 전화상담"
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <LabeledInput label="날짜" hint="YYYY-MM-DD" value={date} onChangeText={setDate} />
            </View>
            <View style={styles.time}>
              <LabeledInput label="시간" hint="HH:mm" value={time} onChangeText={setTime} />
            </View>
          </View>

          <View style={styles.group}>
            <ThemedText type="smallBold">유형</ThemedText>
            <View style={styles.chips}>
              {SCHEDULE_TYPES.map((t) => (
                <Chip
                  key={t.key}
                  label={t.label}
                  selected={type === t.key}
                  onPress={() => setType(t.key)}
                />
              ))}
            </View>
          </View>

          <LabeledInput label="메모" value={memo} onChangeText={setMemo} multiline />

          <Button label={busy ? '저장 중…' : '일정 추가'} onPress={submit} disabled={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
  time: { width: 110 },
  group: { gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
});
