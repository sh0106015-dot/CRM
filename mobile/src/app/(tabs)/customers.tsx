import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
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
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function CustomersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, error, loading, refreshing, reload, refresh } = useAsync(
    () => api.customers({ q: submitted || undefined, sort: 'AI_SCORE' }),
    [submitted],
  );

  return (
    <ThemedView style={styles.flex}>
      <ScreenHeader
        title="고객"
        subtitle={data ? `${data.total}명` : undefined}
        right={
          <View style={styles.headerBtns}>
            <Button label="태그" variant="secondary" onPress={() => router.push('/tags')} />
            <Button label="+ 등록" onPress={() => router.push('/customer/new')} />
          </View>
        }
      />
      <View style={styles.searchWrap}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="이름 · 전화 · 메모 · 태그 검색"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          onSubmitEditing={() => setSubmitted(q.trim())}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
      </View>

      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했습니다.'} onRetry={reload} />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/customer/${item.id}`)}
              style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
              <Card>
                <View style={styles.rowBetween}>
                  <ThemedText type="default" style={styles.name}>
                    {item.name}
                  </ThemedText>
                  {item.recommendation ? (
                    <ScorePill
                      score={item.recommendation.score}
                      priority={item.recommendation.priority}
                    />
                  ) : null}
                </View>
                <Muted>
                  {item.grade} · 마지막 연락 {daysSince(item.lastContactAt)}
                </Muted>
                {item.tags.length ? (
                  <View style={styles.tags}>
                    {item.tags.map((t) => (
                      <View
                        key={t.id}
                        style={[styles.tag, { borderColor: theme.backgroundSelected }]}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {t.tag}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Muted>{submitted ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}</Muted>
            </View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBtns: { flexDirection: 'row', gap: Spacing.one },
  searchWrap: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: 700 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  tag: {
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
  },
  empty: { padding: Spacing.four, alignItems: 'center' },
});
