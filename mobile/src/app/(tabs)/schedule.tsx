import { SectionList, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card, ErrorView, Loading, Muted, ScreenHeader } from '@/components/ui-kit';
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

  if (loading) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? '불러오지 못했습니다.'} onRetry={reload} />;

  const sections = [
    { title: '오늘', data: data.today },
    { title: '다가오는 2주', data: data.upcoming },
  ];

  return (
    <ThemedView style={styles.flex}>
      <ScreenHeader title="일정" subtitle={`오늘 ${data.today.length}건`} />
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
          <Card>
            <View style={styles.rowBetween}>
              <ThemedText type="default" style={styles.title}>
                {item.title}
              </ThemedText>
              <Muted>{fmtTime(item.scheduleDate)}</Muted>
            </View>
            <Muted>
              {TYPE_LABEL[item.type] ?? item.type}
              {item.customer ? ` · ${item.customer.name}` : ''}
            </Muted>
          </Card>
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
  empty: { paddingVertical: Spacing.three, alignItems: 'center' },
});
