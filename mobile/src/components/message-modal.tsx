import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Chip, LabeledInput, Muted } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';

const TONES = ['정중하게', '친근하게', '짧게', '전문적으로', '안부 중심', '상담 유도'];

export function MessageModal({
  visible,
  onClose,
  customerId,
  customerName,
  customerPhone,
}: {
  visible: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerPhone: string;
}) {
  const [purpose, setPurpose] = useState('안부 연락');
  const [tone, setTone] = useState(TONES[0]);
  const [context, setContext] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 설정의 '문자 기본 말투' 를 초기값으로 사용
  useEffect(() => {
    if (!visible) return;
    api
      .preferences()
      .then((p) => {
        if (p.aiMessageTone && TONES.includes(p.aiMessageTone)) setTone(p.aiMessageTone);
      })
      .catch(() => {});
  }, [visible]);

  const reset = () => {
    setResult(null);
    setContext('');
    setPurpose('안부 연락');
    setTone(TONES[0]);
  };

  const generate = async () => {
    if (!purpose.trim()) {
      Alert.alert('알림', '메시지 목적을 입력하세요.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.generateMessage(customerId, {
        purpose: purpose.trim(),
        tone,
        context: context.trim() || undefined,
      });
      setResult(res.content);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '문자 생성 실패');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    Alert.alert('복사됨', '문자 내용을 클립보드에 복사했습니다.');
  };

  const sendSms = () => {
    if (!result) return;
    const sep = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${customerPhone}${sep}body=${encodeURIComponent(result)}`);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <ThemedText type="subtitle">AI 문자 생성</ThemedText>
            <Muted>{customerName} 고객에게</Muted>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <LabeledInput
              label="목적"
              value={purpose}
              onChangeText={setPurpose}
              placeholder="예: 안부 연락, 상담 유도, 갱신 안내"
            />

            <View style={{ gap: 6 }}>
              <ThemedText type="smallBold">말투</ThemedText>
              <View style={styles.chips}>
                {TONES.map((t) => (
                  <Chip key={t} label={t} selected={tone === t} onPress={() => setTone(t)} />
                ))}
              </View>
            </View>

            <LabeledInput
              label="추가 상황"
              hint="(선택)"
              value={context}
              onChangeText={setContext}
              multiline
              placeholder="예: 40일 동안 미연락, 건강검진 예정"
            />

            <Button label={busy ? '생성 중…' : '문자 생성'} onPress={generate} disabled={busy} />

            {result ? (
              <ThemedView type="backgroundElement" style={styles.result}>
                <ThemedText type="small">{result}</ThemedText>
                <View style={styles.resultActions}>
                  <Button label="복사" variant="secondary" onPress={copy} />
                  <Button label="문자앱으로 보내기" onPress={sendSms} />
                </View>
              </ThemedView>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="닫기"
              variant="secondary"
              onPress={() => {
                reset();
                onClose();
              }}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  body: { padding: Spacing.four, paddingTop: Spacing.two, gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  result: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three },
  resultActions: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  footer: { padding: Spacing.four, paddingTop: Spacing.two },
});
