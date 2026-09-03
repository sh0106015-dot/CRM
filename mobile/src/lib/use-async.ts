import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
  refresh: () => void;
}

interface InternalState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

/** 화면 진입 시 1회 로드 + pull-to-refresh 용 얇은 훅. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<InternalState<T>>({
    data: null,
    error: null,
    loading: true,
    refreshing: false,
  });

  // fn 은 매 렌더마다 새 클로저이지만 의존성으로 쓰지 않는다 (ref 로 최신값 유지).
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    setState((s) => ({
      ...s,
      error: null,
      loading: mode === 'initial' ? true : s.loading,
      refreshing: mode === 'refresh',
    }));
    try {
      const data = await fnRef.current();
      setState({ data, error: null, loading: false, refreshing: false });
    } catch (e) {
      setState((s) => ({
        ...s,
        error: e instanceof Error ? e.message : '알 수 없는 오류',
        loading: false,
        refreshing: false,
      }));
    }
  }, []);

  useEffect(() => {
    load('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => load('initial'), [load]);
  const refresh = useCallback(() => load('refresh'), [load]);

  return { ...state, reload, refresh };
}
