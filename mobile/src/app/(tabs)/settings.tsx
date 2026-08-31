import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useDialog } from '@/components/dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, Chip, Muted, ScreenHeader } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import {
  api,
  type AiRecommendationFrequency,
  type UserPreferences,
} from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/use-async';

const TONES = ['정중하게', '친근하게', '짧게', '전문적으로', '안부 중심', '상담 유도'];
const FREQ: { key: AiRecommendationFrequency; label: string }[] = [
  { key: 'DAILY', label: '매일' },
  { key: 'WEEKLY', label: '매주' },
  { key: 'OFF', label: '끔' },
];

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

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <ThemedText type="small">{label}</ThemedText>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: '#208AEF' }} />
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { confirm } = useDialog();
  const [busy, setBusy] = useState(false);

  const { data: prefs, error, reload } = useAsync(() => api.preferences(), []);
  const [local, setLocal] = useState<UserPreferences | null>(null);
  const current = local ?? prefs;

  const patch = useCallback(
    async (p: Partial<UserPreferences>) => {
      if (!current) return;
      const optimistic = { ...current, ...p };
      setLocal(optimistic);
      try {
        setLocal(await api.updatePreferences(p));
      } catch (e) {
        setLocal(current); // 롤백
        Alert.alert('오류', e instanceof Error ? e.message : '저장 실패');
      }
    },
    [current],
  );

  const testDigest = async () => {
    setBusy(true);
    try {
      const r = await api.runDailyDigest();
      Alert.alert(
        '다이제스트 발송',
        `"${r.body}"\n\n등록된 기기 ${r.deviceCount}대` +
          (r.deviceCount === 0 ? '\n(실기기에서 로그인하면 푸시가 등록됩니다)' : ''),
      );
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '발송 실패');
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async () => {
    const ok = await confirm({
      title: '회원탈퇴',
      message: '모든 고객·상담·일정 데이터가 삭제되며 복구할 수 없습니다.',
      confirmLabel: '탈퇴',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.deleteAccount();
      await signOut();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '탈퇴 실패');
    }
  };

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
          <ThemedText type="smallBold">알림</ThemedText>
          {error ? (
            <Muted>설정을 불러오지 못했습니다.</Muted>
          ) : !current ? (
            <Muted>불러오는 중…</Muted>
          ) : (
            <>
              <ToggleRow
                label="매일 관리 다이제스트"
                value={current.dailyDigestEnabled}
                onValueChange={(v) => patch({ dailyDigestEnabled: v })}
              />
              <ToggleRow
                label="상담 알림"
                value={current.notifyConsultation}
                onValueChange={(v) => patch({ notifyConsultation: v })}
              />
              <ToggleRow
                label="고객 생일 알림"
                value={current.notifyBirthday}
                onValueChange={(v) => patch({ notifyBirthday: v })}
              />
              <ToggleRow
                label="AI 추천 알림"
                value={current.notifyAiRecommendation}
                onValueChange={(v) => patch({ notifyAiRecommendation: v })}
              />
            </>
          )}
          <Button
            label={busy ? '발송 중…' : '지금 다이제스트 받기'}
            variant="secondary"
            onPress={testDigest}
            disabled={busy}
          />
        </Card>

        {current ? (
          <Card>
            <ThemedText type="smallBold">AI 설정</ThemedText>
            <Muted>문자 기본 말투</Muted>
            <View style={styles.chips}>
              {TONES.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={current.aiMessageTone === t}
                  onPress={() => patch({ aiMessageTone: t })}
                />
              ))}
            </View>
            <Muted>AI 추천 빈도</Muted>
            <View style={styles.chips}>
              {FREQ.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  selected={current.aiRecommendationFrequency === f.key}
                  onPress={() => patch({ aiRecommendationFrequency: f.key })}
                />
              ))}
            </View>
          </Card>
        ) : null}

        <Card>
          <ThemedText type="smallBold">개인정보</ThemedText>
          <Button
            label="개인정보 처리방침"
            variant="secondary"
            onPress={() => Linking.openURL('https://example.com/privacy')}
          />
          <Button
            label="이용약관"
            variant="secondary"
            onPress={() => Linking.openURL('https://example.com/terms')}
          />
        </Card>

        <Card>
          <ThemedText type="smallBold">연결</ThemedText>
          <Row label="API 서버" value={API_BASE_URL} />
        </Card>

        <Button label="로그아웃" variant="secondary" onPress={signOut} />
        <Button label="회원탈퇴" variant="secondary" onPress={removeAccount} />
        {error ? (
          <Button label="설정 다시 불러오기" variant="secondary" onPress={reload} />
        ) : null}

        <Muted>AI 스마트 고객관리 플랫폼 · MVP</Muted>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  value: { flexShrink: 1, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
});
