import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserInfo } from '../types';
import { login as apiLogin, getMe } from '../api/auth';
import { TOKEN_KEY, USER_KEY } from '../constants';

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser) as UserInfo;
        setUser(parsedUser);
        // Validate token with /auth/me
        getMe()
          .then((u) => {
            setUser(u);
            localStorage.setItem(USER_KEY, JSON.stringify(u));
          })
          .catch(() => {
            // Token invalid or expired — clear and redirect
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
            // Notify user with redirect
            if (window.location.pathname !== '/login') {
              window.location.href = '/login?reason=session-expired';
            }
          })
          .finally(() => {
            setIsLoading(false);
          });
        return; // early return — setIsLoading(false) called in finally
      } catch {
        // Corrupted localStorage data — clear and show login
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiLogin({ username, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    try {
      sessionStorage.removeItem('currentResultId');
    } catch {
      // sessionStorage unavailable — silently ignore
    }
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}