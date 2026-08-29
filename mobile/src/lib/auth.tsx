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

const TOKEN_KEY = 'crm.token';
const USER_KEY = 'crm.user';

type User = AuthResult['user'];

interface AuthState {
  token: string | null;
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

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

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ token, user, initializing, signIn, signUp, signOut }),
    [token, user, initializing, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
