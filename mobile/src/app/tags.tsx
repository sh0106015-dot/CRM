import { Stack } from 'expo-router';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { useDialog } from '@/components/dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card, ErrorView, Loading, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function TagsScreen() {
  const { actionSheet, prompt, confirm } = useDialog();
  const { data, error, loading, refreshing, reload, refresh } = useAsync(() => api.tags(), []);

  const onPress = async (tag: string, count: number) => {
    const choice = await actionSheet({
      title: tag,
      message: `${count}명의 고객이 사용 중`,
      options: [
        { label: '이름 변경', value: 'rename' },
        { label: '태그 삭제', value: 'delete', destructive: true },
      ],
    });
    try {
      if (choice === 'rename') {
        const next = await prompt({
          title: '태그 이름 변경',
          message: `"${tag}" → 새 이름`,
          initialValue: tag,
          confirmLabel: '변경',
        });
        if (!next || next === tag) return;
        const r = await api.renameTag(tag, next);
        Alert.alert('완료', `${r.renamed}명 변경${r.merged ? ` · ${r.merged}명 병합` : ''}`);
        reload();
      } else if (choice === 'delete') {
        const ok = await confirm({
          title: '태그 삭제',
          message: `"${tag}" 태그를 ${count}명 고객에서 모두 제거합니다.`,
          confirmLabel: '삭제',
          destructive: true,
        });
        if (!ok) return;
        await api.deleteTag(tag);
        reload();
      }
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '처리 실패');
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: '태그 관리', presentation: 'modal' }} />
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했습니다.'} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t) => t.tag}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Muted>태그를 눌러 이름을 바꾸거나 모든 고객에서 삭제할 수 있습니다.</Muted>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPress(item.tag, item.count)}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}>
              <Card style={styles.rowCard}>
                <ThemedText type="default" style={styles.tag}>
                  {item.tag}
                </ThemedText>
                <Muted>{item.count}명</Muted>
              </Card>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Muted>사용 중인 태그가 없습니다.</Muted>
            </View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.two },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  tag: { fontWeight: 700, flexShrink: 1 },
  empty: { padding: Spacing.four, alignItems: 'center' },
});
