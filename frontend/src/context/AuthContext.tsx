import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { Session } from '../types';
import { api, getSession, clearSession, setSession, isDemo as isDemoMode } from '../lib/api';
import { demoLogin } from '../lib/demo';

interface AuthContextValue {
  session: Session | null;
  user: Session['user'] | null;
  demo: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => getSession());

  const store = useCallback((s: Session) => {
    setSession(s);
    setSessionState(s);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const body = await api.post('/auth/login', { email, password });
      const j = body.data ?? body;
      const next: Session = {
        accessToken: j.accessToken ?? j.token,
        refreshToken: j.refreshToken ?? '',
        user: j.user ?? { id: 0, firstName: email.split('@')[0], lastName: '', email, roleName: 'User' },
      };
      store(next);
    },
    [store]
  );

  const loginDemo = useCallback(() => {
    store(demoLogin());
  }, [store]);

  const logout = useCallback(() => {
    try {
      api.post('/auth/logout', {});
    } catch {
      /* ignore */
    }
    clearSession();
    setSessionState(null);
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    demo: session?.demo ?? isDemoMode(),
    login,
    loginDemo,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}