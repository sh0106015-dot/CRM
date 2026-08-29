import { Stack, useRouter } from 'expo-router';

import { CustomerForm } from '@/components/customer-form';
import { ThemedView } from '@/components/themed-view';
import { api } from '@/lib/api';

export default function NewCustomerScreen() {
  const router = useRouter();

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: '고객 등록', presentation: 'modal' }} />
      <CustomerForm
        submitLabel="등록"
        onSubmit={async (body) => {
          const created = await api.createCustomer(body);
          router.replace(`/customer/${created.id}`);
        }}
      />
    </ThemedView>
  );
}
