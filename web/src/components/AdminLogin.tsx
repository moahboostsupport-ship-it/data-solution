interface AdminLoginProps {
  onLogin: (username: string, password: string) => void;
  error?: string | null;
  loading?: boolean;
}

import { useState } from 'react';

/**
 * Login form for admin access.
 * Centered card with username and password fields.
 * Shows a "No public registration" note.
 */
export default function AdminLogin({ onLogin, error, loading }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    onLogin(username.trim(), password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <span className="text-4xl">📶</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">DATA SOLUTION</h1>
          <p className="text-sm text-gray-500">Admin Dashboard</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Admin Login</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to manage orders and packages</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="admin-username" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
                disabled={loading}
                className="w-full px-4 py-3 text-base text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors disabled:opacity-50"
                style={{ minHeight: '48px' }}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 pr-12 text-base text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors disabled:opacity-50"
                  style={{ minHeight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full bg-brand-600 text-white font-bold text-lg py-3.5 rounded-xl active:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed no-select"
              style={{ minHeight: '52px' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* No registration note */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              🔒 Authorized personnel only. No public registration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
