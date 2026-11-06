import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, apiFetch, setCsrfToken, type User } from '../api';

type AuthState = {
  status: 'loading' | 'ready';
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};

type SessionResponse = { user: User; csrfToken: string };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [user, setUser] = useState<User | null>(null);

  const clear = useCallback(() => {
    setCsrfToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<SessionResponse>('/api/auth/me')
      .then((session) => {
        if (!active) return;
        setCsrfToken(session.csrfToken);
        setUser(session.user);
      })
      .catch(() => { if (active) clear(); })
      .finally(() => { if (active) setStatus('ready'); });
    return () => { active = false; };
  }, [clear]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiFetch<SessionResponse>('/api/auth/login', { method: 'POST', body: { email, password } });
    setCsrfToken(session.csrfToken);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // An already expired session is logged out anyway; anything else is reported and state is kept.
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    clear();
  }, [clear]);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
