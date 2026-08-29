import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Chip, LabeledInput } from '@/components/ui-kit';
import { Spacing } from '@/constants/theme';
import type { CreateCustomerInput, Customer } from '@/lib/api';

const GRADES = ['NEW', 'GENERAL', 'LONGTERM', 'VIP', 'POTENTIAL'];
const GRADE_LABEL: Record<string, string> = {
  NEW: '신규',
  GENERAL: '일반',
  LONGTERM: '장기',
  VIP: 'VIP',
  POTENTIAL: '잠재',
};
const GENDERS = [
  { key: 'MALE', label: '남' },
  { key: 'FEMALE', label: '여' },
  { key: 'OTHER', label: '기타' },
] as const;

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

function splitList(v: string): string[] {
  return v
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CustomerForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Customer;
  submitLabel: string;
  onSubmit: (body: CreateCustomerInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [birthDate, setBirthDate] = useState(initial?.birthDate?.slice(0, 10) ?? '');
  const [gender, setGender] = useState<Gender | undefined>(
    (initial?.gender as Gender | null) ?? undefined,
  );
  const [address, setAddress] = useState(initial?.address ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [grade, setGrade] = useState(initial?.grade ?? 'GENERAL');
  const [interests, setInterests] = useState((initial?.interests ?? []).join(', '));
  const [tags, setTags] = useState((initial?.tags ?? []).map((t) => t.tag).join(', '));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('필수 항목', '이름과 전화번호는 필수입니다.');
      return;
    }
    let iso: string | undefined;
    if (birthDate.trim()) {
      const d = new Date(birthDate.trim());
      if (Number.isNaN(d.getTime())) {
        Alert.alert('형식 오류', '생년월일은 YYYY-MM-DD 형식으로 입력하세요.');
        return;
      }
      iso = d.toISOString();
    }

    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        birthDate: iso,
        gender,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        grade,
        interests: splitList(interests),
        tags: splitList(tags),
      });
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LabeledInput label="이름" hint="필수" value={name} onChangeText={setName} />
        <LabeledInput
          label="전화번호"
          hint="필수"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="010-0000-0000"
        />
        <LabeledInput
          label="생년월일"
          hint="YYYY-MM-DD"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="1990-05-15"
        />

        <View style={styles.group}>
          <ThemedText type="smallBold">성별</ThemedText>
          <View style={styles.chips}>
            {GENDERS.map((g) => (
              <Chip
                key={g.key}
                label={g.label}
                selected={gender === g.key}
                onPress={() => setGender(gender === g.key ? undefined : g.key)}
              />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <ThemedText type="smallBold">등급</ThemedText>
          <View style={styles.chips}>
            {GRADES.map((g) => (
              <Chip
                key={g}
                label={GRADE_LABEL[g]}
                selected={grade === g}
                onPress={() => setGrade(g)}
              />
            ))}
          </View>
        </View>

        <LabeledInput label="주소" value={address} onChangeText={setAddress} />
        <LabeledInput
          label="관심분야"
          hint="쉼표로 구분"
          value={interests}
          onChangeText={setInterests}
          placeholder="건강보험, 자동차보험"
        />
        <LabeledInput
          label="태그"
          hint="쉼표로 구분"
          value={tags}
          onChangeText={setTags}
          placeholder="VIP, 소개"
        />
        <LabeledInput label="메모" value={notes} onChangeText={setNotes} multiline />

        <Button label={busy ? '저장 중…' : submitLabel} onPress={submit} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  group: { gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
});
