import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, LabeledInput, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api, type Proposal } from '@/lib/api';

export default function ProposalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [focus, setFocus] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Proposal | null>(null);

  const generate = async () => {
    setBusy(true);
    try {
      setResult(await api.generateProposal(id, focus.trim() || undefined));
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '생성 실패');
    } finally {
      setBusy(false);
    }
  };

  const copyAll = async () => {
    if (!result) return;
    const text = result.sections.map((s) => `[${s.heading}]\n${s.body}`).join('\n\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('복사됨', '제안서 전체를 복사했습니다.');
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'AI 상담 제안서', presentation: 'modal' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Muted>
          고객 데이터를 바탕으로 상담 준비 메모를 만듭니다. 특정 상품 추천이나 보장
          적정성 판단은 하지 않습니다.
        </Muted>
        <LabeledInput
          label="상담 주제 방향"
          hint="(선택)"
          value={focus}
          onChangeText={setFocus}
          placeholder="예: 은퇴 준비, 자녀 교육자금"
        />
        <Button label={busy ? '생성 중…' : '제안서 생성'} onPress={generate} disabled={busy} />

        {result ? (
          <>
            {result.sections.map((s, i) => (
              <Card key={i}>
                <ThemedText type="smallBold">{s.heading}</ThemedText>
                <ThemedText type="small">{s.body}</ThemedText>
              </Card>
            ))}
            <View style={styles.actions}>
              <Button label="전체 복사" variant="secondary" onPress={copyAll} />
              <Button label="다시 생성" variant="secondary" onPress={generate} disabled={busy} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
