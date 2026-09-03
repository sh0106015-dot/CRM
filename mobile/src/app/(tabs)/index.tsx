import { useRouter } from 'expo-router';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

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
  daysSince,
} from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api, PRIORITY_LABEL, type Priority } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/use-async';

const ORDER: Priority[] = ['IMMEDIATE', 'TODAY', 'THIS_WEEK', 'NORMAL'];

function NewsCard() {
  const router = useRouter();
  const { data } = useAsync(() => api.news(), []);
  if (!data) return null;
  const headlines = data.sections[0]?.items.slice(0, 3) ?? [];

  return (
    <Pressable
      onPress={() => router.push('/news')}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
      <Card>
        <View style={styles.rowBetween}>
          <ThemedText type="smallBold">📰 오늘의 뉴스 · {data.date}</ThemedText>
          <Muted>전체보기 ›</Muted>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.idxStrip}>
          {data.indices.map((ix) => (
            <View key={ix.label} style={styles.idxChip}>
              <Muted>{ix.label}</Muted>
              <ThemedText type="small" style={styles.idxVal}>
                {ix.value}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
        {headlines.map((h, i) => (
          <ThemedText key={i} type="small" numberOfLines={1}>
            • {h.title}
          </ThemedText>
        ))}
      </Card>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, error, loading, refreshing, reload, refresh } = useAsync(
    () => api.dashboard(),
    [],
  );

  if (loading) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? '불러오지 못했습니다.'} onRetry={reload} />;

  const total = ORDER.reduce((sum, p) => sum + (data.counts[p] ?? 0), 0);

  return (
    <ThemedView style={styles.flex}>
      <FlatList
        data={data.needsCareToday}
        keyExtractor={(item) => item.customerId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <ScreenHeader
              title={`안녕하세요, ${user?.name ?? ''}님`}
              subtitle={`오늘 관리가 필요한 고객 ${data.needsCareToday.length}명`}
              right={
                <Button label="주간 리포트" variant="secondary" onPress={() => router.push('/report')} />
              }
            />
            <NewsCard />
            <View style={styles.counts}>
              {ORDER.map((p) => (
                <Card key={p} style={styles.countCard}>
                  <ThemedText type="title" style={styles.countNum}>
                    {data.counts[p] ?? 0}
                  </ThemedText>
                  <Muted>{PRIORITY_LABEL[p]}</Muted>
                </Card>
              ))}
            </View>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              오늘의 고객관리
            </ThemedText>
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
                마지막 연락 {daysSince(item.lastContactAt)}
                {item.interests.length ? ` · 관심 ${item.interests.join(', ')}` : ''}
              </Muted>
              <ThemedText type="small">{item.recommendation}</ThemedText>
              {item.recommendedChannel ? (
                <Muted>추천 방식: {item.recommendedChannel}</Muted>
              ) : null}
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Muted>
              {total === 0
                ? '등록된 고객이 없습니다. 고객 탭에서 추가하세요.'
                : '지금 즉시 관리가 필요한 고객이 없습니다. 👍'}
            </Muted>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three },
  headerWrap: { gap: Spacing.three, marginHorizontal: -Spacing.four, paddingHorizontal: Spacing.four },
  counts: { flexDirection: 'row', gap: Spacing.two },
  countCard: { flex: 1, alignItems: 'center', gap: 0 },
  countNum: { fontSize: 28, lineHeight: 34 },
  sectionTitle: { marginTop: Spacing.two },
  idxStrip: { gap: Spacing.two, paddingVertical: Spacing.one },
  idxChip: { gap: 1 },
  idxVal: { fontWeight: 700 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: 700 },
  empty: { padding: Spacing.four, alignItems: 'center' },
});
