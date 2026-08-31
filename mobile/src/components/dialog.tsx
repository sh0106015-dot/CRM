import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ActionOption {
  label: string;
  value: string;
  destructive?: boolean;
}

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface SheetOpts {
  title?: string;
  message?: string;
  options: ActionOption[];
  cancelLabel?: string;
}

interface PromptOpts {
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
}

interface DialogApi {
  /** 예/아니오 확인. resolve(true) = 확인 */
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  /** 여러 선택지 액션시트. resolve(value) 또는 취소 시 null */
  actionSheet: (opts: SheetOpts) => Promise<string | null>;
  /** 텍스트 입력. resolve(trimmed value) 또는 취소/빈값 시 null */
  prompt: (opts: PromptOpts) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | undefined>(undefined);

type State =
  | { kind: 'confirm'; opts: ConfirmOpts }
  | { kind: 'sheet'; opts: SheetOpts }
  | { kind: 'prompt'; opts: PromptOpts }
  | null;

/**
 * react-native-web 의 Alert 는 버튼 3개 이상/액션시트를 지원하지 않으므로
 * 모든 플랫폼에서 동일하게 동작하는 Modal 기반 다이얼로그를 제공한다.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [state, setState] = useState<State>(null);
  const [text, setText] = useState('');
  const resolver = useRef<((v: unknown) => void) | null>(null);

  const close = useCallback((value: unknown) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve as (v: unknown) => void;
        setState({ kind: 'confirm', opts });
      }),
    [],
  );

  const actionSheet = useCallback(
    (opts: SheetOpts) =>
      new Promise<string | null>((resolve) => {
        resolver.current = resolve as (v: unknown) => void;
        setState({ kind: 'sheet', opts });
      }),
    [],
  );

  const prompt = useCallback(
    (opts: PromptOpts) =>
      new Promise<string | null>((resolve) => {
        resolver.current = resolve as (v: unknown) => void;
        setText(opts.initialValue ?? '');
        setState({ kind: 'prompt', opts });
      }),
    [],
  );

  const submitPrompt = useCallback(() => {
    const v = text.trim();
    close(v.length ? v : null);
  }, [text, close]);

  const api = useMemo<DialogApi>(
    () => ({ confirm, actionSheet, prompt }),
    [confirm, actionSheet, prompt],
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        visible={state !== null}
        transparent
        animationType="fade"
        onRequestClose={() => close(state?.kind === 'sheet' ? null : false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => close(state?.kind === 'sheet' ? null : false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background }]}
            onPress={(e) => e.stopPropagation()}>
            {state?.opts.title ? (
              <ThemedText type="smallBold" style={styles.title}>
                {state.opts.title}
              </ThemedText>
            ) : null}
            {state?.opts.message ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
                {state.opts.message}
              </ThemedText>
            ) : null}

            {state?.kind === 'sheet'
              ? state.opts.options.map((o) => (
                  <Pressable
                    key={o.value}
                    onPress={() => close(o.value)}
                    style={({ pressed }) => [
                      styles.row,
                      { backgroundColor: theme.backgroundElement },
                      pressed ? { opacity: 0.7 } : null,
                    ]}>
                    <ThemedText
                      type="default"
                      style={{ color: o.destructive ? '#E5484D' : theme.text }}>
                      {o.label}
                    </ThemedText>
                  </Pressable>
                ))
              : null}

            {state?.kind === 'confirm' ? (
              <View style={styles.confirmRow}>
                <Pressable
                  onPress={() => close(false)}
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    { backgroundColor: theme.backgroundElement },
                    pressed ? { opacity: 0.7 } : null,
                  ]}>
                  <ThemedText type="smallBold">
                    {state.opts.cancelLabel ?? '취소'}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => close(true)}
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    { backgroundColor: state.opts.destructive ? '#E5484D' : '#208AEF' },
                    pressed ? { opacity: 0.85 } : null,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                    {state.opts.confirmLabel ?? '확인'}
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}

            {state?.kind === 'prompt' ? (
              <>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={state.opts.placeholder}
                  placeholderTextColor={theme.textSecondary}
                  autoFocus
                  onSubmitEditing={submitPrompt}
                  returnKeyType="done"
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.backgroundElement },
                  ]}
                />
                <View style={styles.confirmRow}>
                  <Pressable
                    onPress={() => close(null)}
                    style={({ pressed }) => [
                      styles.confirmBtn,
                      { backgroundColor: theme.backgroundElement },
                      pressed ? { opacity: 0.7 } : null,
                    ]}>
                    <ThemedText type="smallBold">취소</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={submitPrompt}
                    style={({ pressed }) => [
                      styles.confirmBtn,
                      { backgroundColor: '#208AEF' },
                      pressed ? { opacity: 0.85 } : null,
                    ]}>
                    <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                      {state.opts.confirmLabel ?? '확인'}
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            ) : null}

            {state?.kind === 'sheet' ? (
              <Pressable
                onPress={() => close(null)}
                style={({ pressed }) => [
                  styles.row,
                  styles.cancelRow,
                  { backgroundColor: theme.backgroundSelected },
                  pressed ? { opacity: 0.7 } : null,
                ]}>
                <ThemedText type="smallBold">
                  {state.opts.cancelLabel ?? '취소'}
                </ThemedText>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: Spacing.three,
  },
  sheet: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  title: { textAlign: 'center', paddingTop: Spacing.one },
  message: { textAlign: 'center', paddingBottom: Spacing.one },
  row: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  cancelRow: { marginTop: Spacing.one },
  confirmRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  confirmBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
});
