import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, ErrorView, Loading, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function NewsScreen() {
  const { data, error, loading, refreshing, reload, refresh } = useAsync(
    () => api.news(),
    [],
  );
  const [regenerating, setRegenerating] = useState(false);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const r = await api.refreshNews();
      if (r.generated) {
        Alert.alert('완료', `${r.date} 브리핑을 새로 생성했습니다.`);
        reload();
      } else {
        Alert.alert('건너뜀', r.reason ?? '생성하지 않았습니다. (AI 미구성)');
      }
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '새로고침 실패');
    } finally {
      setRegenerating(false);
    }
  };

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
          <View style={styles.rowBetween}>
            <Muted>{data.date} 주요 뉴스 브리핑 · 매일 07:00 자동 갱신</Muted>
            <Button
              label={regenerating ? '생성 중…' : '새로 생성'}
              variant="secondary"
              onPress={regenerate}
              disabled={regenerating}
            />
          </View>

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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  quote: { fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  idxCell: { width: '33%', paddingVertical: Spacing.one, gap: 2 },
  idxVal: { fontWeight: 700 },
  item: { gap: 3, paddingVertical: Spacing.one },
  itemTitle: { fontWeight: 700 },
});
