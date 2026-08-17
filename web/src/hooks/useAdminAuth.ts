import { useState, useCallback } from 'react';
import { adminLogin } from '../lib/api';
import type { AdminUser } from '../lib/types';

export interface UseAdminAuthResult {
  isAuthenticated: boolean;
  token: string | null;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

let memoryToken: string | null = null;
let memoryUser: AdminUser | null = null;

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
      // Auto-append domain if user didn't type an email
      const loginEmail = username.includes('@') ? username : `${username}@datasolution.co.ke`;
      const result = await adminLogin({ email: loginEmail, password });
      if (result?.token) {
        const adminUser: AdminUser = { email: result.email };
        memoryToken = result.token;
        memoryUser = adminUser;
        setToken(result.token);
        setUser(adminUser);
        setIsAuthenticated(true);
        return true;
      }
      setError('Authentication failed. Please check your username and password.');
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
