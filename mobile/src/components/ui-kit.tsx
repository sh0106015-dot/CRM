import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Priority } from '@/lib/api';

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + Spacing.three,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: Spacing.three,
      }}>
      <View style={{ flexShrink: 1 }}>
        <ThemedText type="subtitle">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ?? null}
    </View>
  );
}

export function Card({ style, ...rest }: ViewProps) {
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, style]}
      {...rest}
    />
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

export function Center({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

export function Loading() {
  const theme = useTheme();
  return (
    <Center>
      <ActivityIndicator color={theme.text} />
    </Center>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Center>
      <ThemedText style={{ textAlign: 'center', marginBottom: Spacing.three }}>{message}</ThemedText>
      {onRetry ? <Button label="다시 시도" onPress={onRetry} /> : null}
    </Center>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const theme = useTheme();
  const bg = variant === 'primary' ? '#208AEF' : theme.backgroundSelected;
  const fg = variant === 'primary' ? '#ffffff' : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      <ThemedText type="smallBold" style={{ color: fg }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const PRIORITY_COLOR: Record<Priority, string> = {
  IMMEDIATE: '#E5484D',
  TODAY: '#F76B15',
  THIS_WEEK: '#F5D90A',
  NORMAL: '#30A46C',
};

export function PriorityDot({ priority }: { priority: Priority }) {
  return <View style={[styles.dot, { backgroundColor: PRIORITY_COLOR[priority] }]} />;
}

export function ScorePill({ score, priority }: { score: number; priority: Priority }) {
  return (
    <View style={[styles.pill, { borderColor: PRIORITY_COLOR[priority] }]}>
      <ThemedText type="smallBold" style={{ color: PRIORITY_COLOR[priority] }}>
        {score}
      </ThemedText>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? '#208AEF' : theme.backgroundElement,
        },
      ]}>
      <ThemedText type="small" style={{ color: selected ? '#ffffff' : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function LabeledInput({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <ThemedText type="smallBold">
        {label}
        {hint ? <ThemedText type="small" themeColor="textSecondary">{`  ${hint}`}</ThemedText> : null}
      </ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...props}
        style={[
          styles.field,
          { color: theme.text, backgroundColor: theme.backgroundElement },
          props.multiline ? { minHeight: 80, textAlignVertical: 'top' } : null,
          props.style,
        ]}
      />
    </View>
  );
}

export function daysSince(iso: string | null): string {
  if (!iso) return '연락 이력 없음';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return '오늘';
  return `${days}일 전`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pill: {
    minWidth: 34,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  field: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
});
