import { useState, useCallback } from 'react';
import { adminLogin } from '../lib/api';
import type { AdminUser } from '../lib/types';

export interface UseAdminAuthResult {
  isAuthenticated: boolean;
  token: string | null;
  user: AdminUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

// Module-level variables — token persists in memory only, NOT in localStorage.
// The token is lost on page refresh, requiring re-authentication.
let memoryToken: string | null = null;
let memoryUser: AdminUser | null = null;

/**
 * Admin authentication hook. Stores the auth token in memory only
 * (not localStorage) for security. The token is lost on page refresh,
 * requiring re-authentication.
 */
export function useAdminAuth(): UseAdminAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(memoryToken !== null);
  const [token, setToken] = useState<string | null>(memoryToken);
  const [user, setUser] = useState<AdminUser | null>(memoryUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminLogin({ username, password });
      if (result?.token) {
        memoryToken = result.token;
        memoryUser = result.user || null;
        setToken(result.token);
        setUser(result.user || null);
        setIsAuthenticated(true);
        return true;
      }
      setError('Authentication failed. Please check your credentials.');
      return false;
    } catch {
      setError('Login failed. Please verify your username and password.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    memoryToken = null;
    memoryUser = null;
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, token, user, login, logout, loading, error };
}
