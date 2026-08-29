import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Button,
  Card,
  ErrorView,
  Loading,
  Muted,
  ScorePill,
  ScreenHeader,
} from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api, PRIORITY_LABEL } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function AiScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { data, error, loading, refreshing, reload, refresh } = useAsync(
    () => api.dashboard(),
    [],
  );

  const recompute = async () => {
    setBusy(true);
    try {
      const res = await api.recompute();
      Alert.alert('완료', `${res.updated}명의 관리점수를 다시 계산했습니다.`);
      reload();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '재계산 실패');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? '불러오지 못했습니다.'} onRetry={reload} />;

  return (
    <ThemedView style={styles.flex}>
      <FlatList
        data={data.needsCareToday}
        keyExtractor={(item) => item.customerId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader
              title="AI 추천"
              subtitle="규칙 기반 관리점수로 정렬된 오늘의 우선 관리 대상"
            />
            <View style={styles.actionRow}>
              <Button label={busy ? '계산 중…' : '관리점수 재계산'} onPress={recompute} disabled={busy} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/customer/${item.customerId}`)}
            style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
            <Card>
              <View style={styles.rowBetween}>
                <ThemedText type="default" style={styles.name}>
                  {item.name}
                </ThemedText>
                <ScorePill score={item.score} priority={item.priority} />
              </View>
              <Muted>
                {PRIORITY_LABEL[item.priority]} · {item.reason}
              </Muted>
              <ThemedText type="small">👉 {item.recommendation}</ThemedText>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Muted>지금 우선 관리가 필요한 고객이 없습니다.</Muted>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three },
  header: { gap: Spacing.three, marginHorizontal: -Spacing.four, paddingHorizontal: Spacing.four },
  actionRow: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: 700 },
  empty: { padding: Spacing.four, alignItems: 'center' },
});
