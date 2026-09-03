import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Button,
  Card,
  Chip,
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

const FILTERS: { key: string; label: string }[] = [
  { key: 'NEEDS_CARE', label: '관리 필요' },
  { key: 'LONG_UNMANAGED', label: '장기 미관리' },
  { key: 'RECENT_CONSULT', label: '최근 상담' },
  { key: 'CONSULT_SCHEDULED', label: '상담 예정' },
  { key: 'CONTRACT', label: '계약' },
  { key: 'BIRTHDAY', label: '생일' },
  { key: 'NEW', label: '신규' },
  { key: 'VIP', label: 'VIP' },
];

export default function CustomersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filter, setFilter] = useState<string | undefined>();
  const [tag, setTag] = useState<string | undefined>();

  const { data, error, loading, refreshing, reload, refresh } = useAsync(
    () =>
      api.customers({
        q: submitted || undefined,
        filter,
        tag,
        sort: 'AI_SCORE',
      }),
    [submitted, filter, tag],
  );

  const { data: tagList, reload: reloadTags } = useAsync(() => api.tags(), []);

  const mounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (mounted.current) {
        reload();
        reloadTags();
      } else mounted.current = true;
    }, [reload, reloadTags]),
  );

  const pickFilter = (key: string) => {
    setTag(undefined);
    setFilter((cur) => (cur === key ? undefined : key));
  };
  const pickTag = (t: string) => {
    setFilter(undefined);
    setTag((cur) => (cur === t ? undefined : t));
  };
  const clearAll = () => {
    setFilter(undefined);
    setTag(undefined);
  };

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}>
        <Chip label="전체" selected={!filter && !tag} onPress={clearAll} />
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            selected={filter === f.key}
            onPress={() => pickFilter(f.key)}
          />
        ))}
        {(tagList ?? []).map((t) => (
          <Chip
            key={`tag:${t.tag}`}
            label={`#${t.tag}`}
            selected={tag === t.tag}
            onPress={() => pickTag(t.tag)}
          />
        ))}
      </ScrollView>

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
              <Muted>
                {submitted || filter || tag
                  ? '조건에 맞는 고객이 없습니다.'
                  : '등록된 고객이 없습니다.'}
              </Muted>
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
  searchWrap: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  chipRow: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
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
