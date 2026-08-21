import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on first load — runs once
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('emprod_token');
      const savedUser  = localStorage.getItem('emprod_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      localStorage.removeItem('emprod_token');
      localStorage.removeItem('emprod_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (authUser: AuthUser) => {
    setUser(authUser);
    setToken(authUser.token);
    localStorage.setItem('emprod_token', authUser.token);
    localStorage.setItem('emprod_user', JSON.stringify(authUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('emprod_token');
    localStorage.removeItem('emprod_user');
  };

  return (
    <AuthContext.Provider value={{
      user, token, login, logout,
      isAuthenticated: !!token,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}