import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Alert, Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, ErrorView, Loading, Muted, ScreenHeader } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api, type Schedule } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

const TYPE_LABEL: Record<string, string> = {
  CONTACT: '고객 연락',
  PHONE_CONSULT: '전화상담',
  VISIT_CONSULT: '대면상담',
  CONTRACT: '계약',
  RENEWAL: '갱신',
  ANNIVERSARY: '기념일',
  ETC: '기타',
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { data, error, loading, refreshing, reload, refresh } = useAsync(async () => {
    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 86_400_000);
    const [today, upcoming] = await Promise.all([
      api.schedulesToday(),
      api.schedules({ from: now.toISOString(), to: in14.toISOString() }),
    ]);
    const todayIds = new Set(today.map((s) => s.id));
    return { today, upcoming: upcoming.filter((s) => !todayIds.has(s.id)) };
  }, []);

  const mounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (mounted.current) reload();
      else mounted.current = true;
    }, [reload]),
  );

  const onItemPress = (item: Schedule) => {
    const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteSchedule(item.id);
            reload();
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '삭제 실패');
          }
        },
      },
    ];
    if (item.status === 'PENDING') {
      options.splice(1, 0, {
        text: '완료 처리',
        onPress: async () => {
          try {
            await api.updateSchedule(item.id, { status: 'DONE' });
            reload();
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '처리 실패');
          }
        },
      });
    }
    Alert.alert(item.title, TYPE_LABEL[item.type] ?? item.type, options);
  };

  if (loading) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? '불러오지 못했습니다.'} onRetry={reload} />;

  const sections = [
    { title: '오늘', data: data.today },
    { title: '다가오는 2주', data: data.upcoming },
  ];

  return (
    <ThemedView style={styles.flex}>
      <ScreenHeader
        title="일정"
        subtitle={`오늘 ${data.today.length}건`}
        right={<Button label="+ 일정" onPress={() => router.push('/schedule/new')} />}
      />
      <SectionList<Schedule>
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" style={styles.sectionHeader}>
            {section.title}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onItemPress(item)}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}>
            <Card>
              <View style={styles.rowBetween}>
                <ThemedText
                  type="default"
                  style={[styles.title, item.status === 'DONE' ? styles.done : null]}>
                  {item.title}
                </ThemedText>
                <Muted>{fmtTime(item.scheduleDate)}</Muted>
              </View>
              <Muted>
                {TYPE_LABEL[item.type] ?? item.type}
                {item.customer ? ` · ${item.customer.name}` : ''}
                {item.status === 'DONE' ? ' · 완료' : ''}
              </Muted>
            </Card>
          </Pressable>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <View style={styles.empty}>
              <Muted>일정이 없습니다.</Muted>
            </View>
          ) : null
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.two },
  sectionHeader: { marginTop: Spacing.three, marginBottom: Spacing.one },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: 700, flexShrink: 1 },
  done: { textDecorationLine: 'line-through', opacity: 0.6 },
  empty: { paddingVertical: Spacing.three, alignItems: 'center' },
});
