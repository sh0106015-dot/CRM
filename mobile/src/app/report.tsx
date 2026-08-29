import { Stack } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card, ErrorView, Loading, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card style={styles.statCard}>
      <ThemedText type="title" style={styles.statNum}>
        {value}
      </ThemedText>
      <Muted>{label}</Muted>
    </Card>
  );
}

export default function ReportScreen() {
  const { data, error, loading, refreshing, reload, refresh } = useAsync(
    () => api.weeklyReport(),
    [],
  );

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: '주간 리포트', presentation: 'modal' }} />
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했습니다.'} onRetry={reload} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
          <Muted>
            {new Date(data.periodStart).toLocaleDateString('ko-KR')} ~ 오늘
          </Muted>

          <View style={styles.grid}>
            <Stat label="총 고객" value={data.stats.total} />
            <Stat label="신규 고객" value={data.stats.newCustomers} />
            <Stat label="상담 진행" value={data.stats.consulted} />
            <Stat label="장기 미관리" value={data.stats.longUnmanaged} />
          </View>

          <Card>
            <ThemedText type="smallBold">AI 분석</ThemedText>
            <ThemedText type="small">{data.analysis}</ThemedText>
          </Card>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  statCard: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', gap: 0 },
  statNum: { fontSize: 32, lineHeight: 38 },
});
