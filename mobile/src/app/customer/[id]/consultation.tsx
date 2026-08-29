import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, LabeledInput, Loading, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api, type ConsultationSummary } from '@/lib/api';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ConsultationScreen() {
  const { id, editId } = useLocalSearchParams<{ id: string; editId?: string }>();
  const router = useRouter();
  const isEdit = Boolean(editId);

  const [content, setContent] = useState('');
  const [date, setDate] = useState(today());
  const [autoSummarize, setAutoSummarize] = useState(true);
  const [preview, setPreview] = useState<ConsultationSummary | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!editId) return;
    api
      .consultations(id)
      .then((list) => {
        const c = list.find((x) => x.id === editId);
        if (c) {
          setContent(c.content);
          setDate(c.consultationDate.slice(0, 10));
          setAutoSummarize(false);
        }
      })
      .catch((e) => Alert.alert('오류', e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false));
  }, [editId, id]);

  const parseDate = (): string | undefined => {
    if (!date.trim()) return undefined;
    const d = new Date(date.trim());
    if (Number.isNaN(d.getTime())) {
      Alert.alert('형식 오류', '상담일은 YYYY-MM-DD 형식으로 입력하세요.');
      throw new Error('bad date');
    }
    return d.toISOString();
  };

  const runPreview = async () => {
    if (content.trim().length < 1) {
      Alert.alert('알림', '상담 내용을 입력하세요.');
      return;
    }
    setPreviewing(true);
    try {
      setPreview(await api.summarize(content.trim()));
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '요약 실패');
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    if (content.trim().length < 1) {
      Alert.alert('알림', '상담 내용을 입력하세요.');
      return;
    }
    let iso: string | undefined;
    try {
      iso = parseDate();
    } catch {
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editId) {
        await api.updateConsultation(id, editId, {
          content: content.trim(),
          consultationDate: iso,
        });
        router.back();
        return;
      }
      const created = await api.createConsultation(id, {
        content: content.trim(),
        consultationDate: iso,
        autoSummarize,
      });
      const done = () => router.back();
      if (created.summary) {
        Alert.alert(
          '저장 완료',
          `AI 요약: ${created.summary}${
            created.nextContactDate
              ? `\n다음 관리일: ${created.nextContactDate.slice(0, 10)}`
              : ''
          }`,
          [{ text: '확인', onPress: done }],
        );
      } else {
        done();
      }
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!editId) return;
    Alert.alert('상담 기록 삭제', '이 상담 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteConsultation(id, editId);
            router.back();
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '삭제 실패');
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{ title: isEdit ? '상담 기록 수정' : '상담 기록', presentation: 'modal' }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LabeledInput
            label="상담 내용"
            hint="필수"
            value={content}
            onChangeText={setContent}
            multiline
            placeholder={'오늘 고객과 통화함.\n건강검진 예정.\n다음 달 다시 연락하기로 함.'}
            style={{ minHeight: 140 }}
          />
          <LabeledInput label="상담일" hint="YYYY-MM-DD" value={date} onChangeText={setDate} />

          {!isEdit ? (
            <View style={styles.switchRow}>
              <View style={styles.flexShrink}>
                <ThemedText type="smallBold">AI 자동 정리</ThemedText>
                <Muted>저장 시 요약·다음 행동·다음 관리일을 자동 생성합니다.</Muted>
              </View>
              <Switch
                value={autoSummarize}
                onValueChange={setAutoSummarize}
                trackColor={{ true: '#208AEF' }}
              />
            </View>
          ) : null}

          <Button
            label={previewing ? '요약 중…' : 'AI 요약 미리보기'}
            variant="secondary"
            onPress={runPreview}
            disabled={previewing}
          />

          {preview ? (
            <Card>
              <ThemedText type="smallBold">요약 미리보기</ThemedText>
              <ThemedText type="small">{preview.summary}</ThemedText>
              {preview.keyPoints.length ? (
                <>
                  <Muted>핵심</Muted>
                  {preview.keyPoints.map((k, i) => (
                    <ThemedText key={i} type="small">
                      • {k}
                    </ThemedText>
                  ))}
                </>
              ) : null}
              {preview.nextAction ? <Muted>다음 행동: {preview.nextAction}</Muted> : null}
              {preview.nextContactDate ? (
                <Muted>다음 관리일: {preview.nextContactDate.slice(0, 10)}</Muted>
              ) : null}
            </Card>
          ) : null}

          <Button
            label={saving ? '저장 중…' : isEdit ? '수정 저장' : '저장'}
            onPress={save}
            disabled={saving}
          />
          {isEdit ? (
            <Button label="삭제" variant="secondary" onPress={remove} />
          ) : (
            <Muted>
              저장하면 고객의 마지막 연락일이 상담일로 갱신됩니다
              {autoSummarize ? ' (다음 관리일 포함).' : '.'}
            </Muted>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1, gap: 2 },
  content: { padding: Spacing.four, gap: Spacing.three },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
});
