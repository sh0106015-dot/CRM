import { Stack } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card, ErrorView, Loading, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function NewsScreen() {
  const { data, error, loading, refreshing, reload, refresh } = useAsync(
    () => api.news(),
    [],
  );

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: '오늘의 뉴스', presentation: 'modal' }} />
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했습니다.'} onRetry={reload} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
          <Muted>{data.date} 주요 뉴스 브리핑</Muted>

          {data.quote ? (
            <Card>
              <ThemedText type="small" style={styles.quote}>
                “{data.quote.text}”
              </ThemedText>
              {data.quote.author ? <Muted>— {data.quote.author}</Muted> : null}
            </Card>
          ) : null}

          {/* 주요 지수 */}
          <Card>
            <ThemedText type="smallBold">주요 지수 현황</ThemedText>
            <View style={styles.grid}>
              {data.indices.map((ix) => (
                <View key={ix.label} style={styles.idxCell}>
                  <Muted>
                    {ix.label}
                    {ix.unit ? ` (${ix.unit})` : ''}
                  </Muted>
                  <ThemedText type="default" style={styles.idxVal}>
                    {ix.value}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>

          {/* 섹션별 뉴스 */}
          {data.sections.map((section) => (
            <Card key={section.title}>
              <ThemedText type="smallBold">{section.title}</ThemedText>
              {section.items.map((item, i) => (
                <View key={i} style={styles.item}>
                  <ThemedText type="small" style={styles.itemTitle}>
                    {item.title}
                  </ThemedText>
                  {item.body ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.body}
                    </ThemedText>
                  ) : null}
                </View>
              ))}
            </Card>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  quote: { fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  idxCell: { width: '33%', paddingVertical: Spacing.one, gap: 2 },
  idxVal: { fontWeight: 700 },
  item: { gap: 3, paddingVertical: Spacing.one },
  itemTitle: { fontWeight: 700 },
});
