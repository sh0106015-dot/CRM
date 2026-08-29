import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setAuthToken, type AuthResult } from './api';
import { registerForPushNotifications } from './push';

const TOKEN_KEY = 'crm.token';
const USER_KEY = 'crm.user';
const PUSH_KEY = 'crm.pushToken';

type User = AuthResult['user'];

interface AuthState {
  token: string | null;
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithApple: (identityToken: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** 로그인 성공 후 푸시 토큰을 백엔드에 등록 (실패해도 로그인은 유지) */
async function syncPushToken(): Promise<void> {
  try {
    const push = await registerForPushNotifications();
    if (!push) return;
    await api.registerDevice(push);
    await SecureStore.setItemAsync(PUSH_KEY, push.token);
  } catch {
    // 무시: 푸시는 부가 기능
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (savedToken) {
          setToken(savedToken);
          setAuthToken(savedToken);
          if (savedUser) setUser(JSON.parse(savedUser));
          void syncPushToken();
        }
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const persist = useCallback(async (result: AuthResult) => {
    setToken(result.accessToken);
    setUser(result.user);
    setAuthToken(result.accessToken);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, result.accessToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user)),
    ]);
    void syncPushToken();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await persist(await api.login({ email, password }));
    },
    [persist],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await persist(await api.register({ name, email, password }));
    },
    [persist],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      await persist(await api.oauthGoogle(idToken));
    },
    [persist],
  );

  const signInWithApple = useCallback(
    async (identityToken: string, fullName?: string) => {
      await persist(await api.oauthApple(identityToken, fullName));
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    const pushToken = await SecureStore.getItemAsync(PUSH_KEY);
    if (pushToken) {
      try {
        await api.unregisterDevice(pushToken);
      } catch {
        // 무시
      }
    }
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync(PUSH_KEY),
    ]);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      initializing,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,
    }),
    [token, user, initializing, signIn, signUp, signInWithGoogle, signInWithApple, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
