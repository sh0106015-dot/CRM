import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, Muted, ScreenHeader } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/lib/auth';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Muted>{label}</Muted>
      <ThemedText type="small" style={styles.value}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <ThemedView style={styles.flex}>
      <ScreenHeader title="설정" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <ThemedText type="smallBold">계정</ThemedText>
          <Row label="이름" value={user?.name ?? '-'} />
          <Row label="이메일" value={user?.email ?? '-'} />
        </Card>

        <Card>
          <ThemedText type="smallBold">연결</ThemedText>
          <Row label="API 서버" value={API_BASE_URL} />
        </Card>

        <Button label="로그아웃" variant="secondary" onPress={signOut} />

        <Muted>AI 스마트 고객관리 플랫폼 · MVP</Muted>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.three },
  value: { flexShrink: 1, textAlign: 'right' },
});
