import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api, type Customer, type DocumentSummary } from '@/lib/api';
import { pickPolicyDocument } from '@/lib/pick-document';

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentSummary | null>(null);
  const [saving, setSaving] = useState(false);

  const analyze = async () => {
    setBusy(true);
    try {
      const doc = await pickPolicyDocument();
      if (!doc) return;
      setFileName(doc.name);
      setResult(await api.summarizeDocument(doc.base64, doc.mimeType));
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '분석 실패');
    } finally {
      setBusy(false);
    }
  };

  const saveToNotes = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const c: Customer = await api.customer(id);
      const block =
        `[${result.docType} 요약] ${result.summary}\n` +
        result.coverages.map((cv) => `· ${cv.name}: ${cv.detail}`).join('\n');
      const notes = [c.notes, block].filter(Boolean).join('\n\n');
      await api.updateCustomer(id, { notes });
      Alert.alert('저장됨', '고객 메모에 요약을 추가했습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: '증권/약관 분석', presentation: 'modal' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Muted>
          보험증권·약관 PDF 또는 사진을 올리면 담보 항목과 주요 날짜를 정리합니다.
          (보장 적정성은 판단하지 않습니다.)
        </Muted>
        <Button
          label={busy ? '분석 중…' : fileName ? `다시 선택 (${fileName})` : '📄 파일 선택'}
          onPress={analyze}
          disabled={busy}
        />

        {result ? (
          <>
            <Card>
              <ThemedText type="smallBold">{result.docType}</ThemedText>
              <ThemedText type="small">{result.summary}</ThemedText>
            </Card>

            {result.coverages.length ? (
              <Card>
                <ThemedText type="smallBold">담보 / 보장</ThemedText>
                {result.coverages.map((cv, i) => (
                  <View key={i} style={styles.item}>
                    <ThemedText type="small" style={styles.name}>
                      {cv.name}
                    </ThemedText>
                    {cv.detail ? <Muted>{cv.detail}</Muted> : null}
                  </View>
                ))}
              </Card>
            ) : null}

            {result.keyDates.length ? (
              <Card>
                <ThemedText type="smallBold">주요 날짜</ThemedText>
                {result.keyDates.map((d, i) => (
                  <ThemedText key={i} type="small">
                    • {d}
                  </ThemedText>
                ))}
              </Card>
            ) : null}

            {result.notes.length ? (
              <Card>
                <ThemedText type="smallBold">유의사항</ThemedText>
                {result.notes.map((n, i) => (
                  <ThemedText key={i} type="small">
                    • {n}
                  </ThemedText>
                ))}
              </Card>
            ) : null}

            <Button
              label={saving ? '저장 중…' : '고객 메모에 추가'}
              variant="secondary"
              onPress={saveToNotes}
              disabled={saving}
            />
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  item: { gap: 2, paddingVertical: Spacing.one },
  name: { fontWeight: 700 },
});
