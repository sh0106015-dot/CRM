import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { CustomerForm } from '@/components/customer-form';
import { ErrorView, Loading } from '@/components/ui-kit';
import { ThemedView } from '@/components/themed-view';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useAsync(() => api.customer(id), [id]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: '고객 수정', presentation: 'modal' }} />
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorView message={error ?? '불러오지 못했습니다.'} onRetry={reload} />
      ) : (
        <CustomerForm
          initial={data}
          submitLabel="저장"
          onSubmit={async (body) => {
            await api.updateCustomer(id, body);
            router.back();
          }}
        />
      )}
    </ThemedView>
  );
}
