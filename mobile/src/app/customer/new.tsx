import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { CustomerForm } from '@/components/customer-form';
import { ThemedView } from '@/components/themed-view';
import { Button, Muted } from '@/components/ui-kit';
import { api, type CardDraft } from '@/lib/api';
import { scanBusinessCard } from '@/lib/scan-card';

export default function NewCustomerScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<CardDraft | null>(null);
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanning(true);
    try {
      const d = await scanBusinessCard();
      if (d) {
        setDraft(d);
        Alert.alert('명함 인식', '인식된 정보를 확인하고 저장하세요.');
      }
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '명함 인식 실패');
    } finally {
      setScanning(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: '고객 등록', presentation: 'modal' }} />
      <CustomerForm
        key={draft ? 'scanned' : 'blank'}
        initial={draft ?? undefined}
        submitLabel="등록"
        header={
          <>
            <Button
              label={scanning ? '인식 중…' : '📇 명함으로 채우기'}
              variant="secondary"
              onPress={scan}
              disabled={scanning}
            />
            <Muted>명함 사진을 고르면 이름·연락처를 자동으로 채웁니다.</Muted>
          </>
        }
        onSubmit={async (body) => {
          const created = await api.createCustomer(body);
          router.replace(`/customer/${created.id}`);
        }}
      />
    </ThemedView>
  );
}
