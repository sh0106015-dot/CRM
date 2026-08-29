import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { MessageModal } from '@/components/message-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Button,
  Card,
  ErrorView,
  Loading,
  Muted,
  ScorePill,
  daysSince,
} from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

const GENDER: Record<string, string> = { MALE: '남', FEMALE: '여', OTHER: '기타' };

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <Muted>{label}</Muted>
      <ThemedText type="small" style={styles.rowValue}>
        {value && value.length ? value : '-'}
      </ThemedText>
    </View>
  );
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useAsync(() => api.customer(id), [id]);

  const [analyzing, setAnalyzing] = useState(false);
  const [actions, setActions] = useState<string[] | null>(null);
  const [loadingActions, setLoadingActions] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);

  // 수정/상담 기록 화면에서 돌아오면 새로고침 (최초 진입 시 중복 로드 방지)
  const mounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (mounted.current) reload();
      else mounted.current = true;
    }, [reload]),
  );

  const analyze = async () => {
    setAnalyzing(true);
    try {
      await api.analyze(id);
      reload();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : 'AI 분석 실패');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadActions = async () => {
    setLoadingActions(true);
    try {
      setActions(await api.nextActions(id));
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '추천 불러오기 실패');
    } finally {
      setLoadingActions(false);
    }
  };

  if (loading) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? '불러오지 못했습니다.'} onRetry={reload} />;

  const rec = data.recommendation;

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: data.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actionBar}>
          <Button
            label="수정"
            variant="secondary"
            onPress={() => router.push(`/customer/${id}/edit`)}
          />
          <Button
            label="상담 기록 +"
            onPress={() => router.push(`/customer/${id}/consultation`)}
          />
        </View>

        {/* 기본정보 */}
        <Card>
          <ThemedText type="smallBold">기본정보</ThemedText>
          <InfoRow label="이름" value={data.name} />
          <InfoRow label="연락처" value={data.phone} />
          <InfoRow label="생년월일" value={data.birthDate?.slice(0, 10)} />
          <InfoRow label="성별" value={data.gender ? GENDER[data.gender] : null} />
          <InfoRow label="주소" value={data.address} />
          <InfoRow label="메모" value={data.notes} />
        </Card>

        {/* 고객 상태 */}
        <Card>
          <ThemedText type="smallBold">고객 상태</ThemedText>
          <InfoRow label="등급" value={data.grade} />
          <InfoRow label="관심분야" value={data.interests.join(', ')} />
          <InfoRow label="상담상태" value={data.consultStatus} />
          <InfoRow label="마지막 연락" value={daysSince(data.lastContactAt)} />
          <InfoRow
            label="다음 연락 예정"
            value={data.nextContactAt ? data.nextContactAt.slice(0, 10) : null}
          />
          {data.tags.length ? (
            <View style={styles.tags}>
              {data.tags.map((t) => (
                <View key={t.id} style={styles.tag}>
                  <Muted>{t.tag}</Muted>
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        {/* AI 분석 */}
        <Card>
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">AI 고객분석</ThemedText>
            {rec ? <ScorePill score={rec.score} priority={rec.priority} /> : null}
          </View>
          {rec ? (
            <>
              <ThemedText type="small">{rec.reason}</ThemedText>
              <Muted>추천 행동</Muted>
              <ThemedText type="small">👉 {rec.recommendation}</ThemedText>
              {rec.recommendedChannel ? <Muted>연락 방식: {rec.recommendedChannel}</Muted> : null}
            </>
          ) : (
            <Muted>아직 분석 결과가 없습니다.</Muted>
          )}
          <Button
            label={analyzing ? '분석 중…' : 'AI 재분석'}
            variant="secondary"
            onPress={analyze}
            disabled={analyzing}
          />
        </Card>

        {/* AI 다음 행동 */}
        <Card>
          <ThemedText type="smallBold">AI 다음 행동 추천</ThemedText>
          {actions ? (
            actions.map((a, i) => (
              <ThemedText key={i} type="small">
                {i + 1}. {a}
              </ThemedText>
            ))
          ) : (
            <Muted>버튼을 눌러 추천을 불러오세요.</Muted>
          )}
          <Button
            label={loadingActions ? '불러오는 중…' : '추천 불러오기'}
            variant="secondary"
            onPress={loadActions}
            disabled={loadingActions}
          />
        </Card>

        {/* 상담이력 */}
        <Card>
          <ThemedText type="smallBold">상담이력 ({data.consultations.length})</ThemedText>
          {data.consultations.length ? (
            data.consultations.map((c) => (
              <View key={c.id} style={styles.consult}>
                <Muted>{c.consultationDate.slice(0, 10)}</Muted>
                <ThemedText type="small">{c.summary ?? c.content}</ThemedText>
                {c.nextAction ? <Muted>다음 행동: {c.nextAction}</Muted> : null}
              </View>
            ))
          ) : (
            <Muted>상담 기록이 없습니다.</Muted>
          )}
        </Card>

        {data.messages.length ? (
          <Card>
            <ThemedText type="smallBold">최근 생성한 문자</ThemedText>
            {data.messages.slice(0, 3).map((m) => (
              <View key={m.id} style={styles.consult}>
                <Muted>
                  {m.purpose} · {m.tone}
                </Muted>
                <ThemedText type="small">{m.content}</ThemedText>
              </View>
            ))}
          </Card>
        ) : null}

        <Button label="AI 문자 생성" onPress={() => setMsgOpen(true)} />
      </ScrollView>

      <MessageModal
        visible={msgOpen}
        onClose={() => setMsgOpen(false)}
        customerId={data.id}
        customerName={data.name}
        customerPhone={data.phone}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  actionBar: { flexDirection: 'row', gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.one },
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8884',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
  },
  consult: { gap: 2, paddingVertical: Spacing.one },
});
