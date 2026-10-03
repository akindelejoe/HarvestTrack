import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler } from '@/services/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  /** Set when the server reports an expired session, so the login page can explain why. */
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    api
      .get<{ user: User }>('/auth/me')
      .then((r) => {
        setUser(r.user);
        setStatus('authenticated');
      })
      .catch(() => setStatus('anonymous'));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('anonymous');
      setSessionExpired(true);
      qc.clear();
    });
  }, [qc]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ user: User }>('/auth/login', { email, password });
    qc.clear();
    setUser(r.user);
    setSessionExpired(false);
    setStatus('authenticated');
  }, [qc]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const r = await api.post<{ user: User }>('/auth/register', { name, email, password });
    qc.clear();
    setUser(r.user);
    setSessionExpired(false);
    setStatus('authenticated');
  }, [qc]);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    qc.clear();
    setUser(null);
    setStatus('anonymous');
  }, [qc]);

  const value = useMemo(
    () => ({ user, status, sessionExpired, login, register, logout, setUser }),
    [user, status, sessionExpired, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
