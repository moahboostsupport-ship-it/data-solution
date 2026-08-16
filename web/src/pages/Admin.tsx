import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import {
  adminGetOrders,
  adminGetPackages,
  adminCreatePackage,
  adminUpdatePackage,
  adminDeletePackage,
  adminGetAuditLogs,
} from '../lib/api';
import { formatTime } from '../lib/format';
import type { Order, Package, AuditLog } from '../lib/types';
import AdminLogin from '../components/AdminLogin';
import AdminOrdersTable from '../components/AdminOrdersTable';
import AdminPackagesTable from '../components/AdminPackagesTable';
import SearchBar from '../components/SearchBar';

type Tab = 'orders' | 'packages' | 'audit';

/**
 * Admin dashboard with login screen and three tabs:
 * Orders, Packages, and Audit Logs.
 * All API calls include the auth token in the header.
 */
export default function Admin() {
  const { isAuthenticated, token, login, logout, loading: authLoading, error: authError } = useAdminAuth();

  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLogin={login}
        error={authError}
        loading={authLoading}
      />
    );
  }

  return <AdminDashboard token={token!} onLogout={logout} />;
}

// ===== Admin Dashboard =====

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('orders');

  const tabs: { label: string; value: Tab; icon: string }[] = [
    { label: 'Orders', value: 'orders', icon: '📦' },
    { label: 'Packages', value: 'packages', icon: '📶' },
    { label: 'Audit Logs', value: 'audit', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin header */}
      <header className="bg-accent-dark text-white sticky top-0 z-40 safe-top">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📶</span>
            <div>
              <h1 className="text-lg font-bold leading-tight">DATA SOLUTION</h1>
              <p className="text-xs text-white/60">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white bg-white/10 px-4 py-2 rounded-lg transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[60px] z-30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'orders' && <OrdersTab token={token} />}
        {activeTab === 'packages' && <PackagesTab token={token} />}
        {activeTab === 'audit' && <AuditLogsTab token={token} />}
      </div>
    </div>
  );
}

// ===== Orders Tab =====

function OrdersTab({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminGetOrders(token);
      setOrders(result.orders || []);
    } catch {
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (error && orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-gray-600 mt-2 mb-4">{error}</p>
        <button
          onClick={fetchOrders}
          className="bg-brand-600 text-white font-semibold text-sm px-6 py-2.5 rounded-xl active:bg-brand-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return <AdminOrdersTable orders={orders} loading={loading} />;
}

// ===== Packages Tab =====

function PackagesTab({ token }: { token: string }) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminGetPackages(token);
      setPackages(result.packages || []);
    } catch {
      setError('Failed to load packages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleEdit = async (pkg: Package) => {
    try {
      const existing = packages.find((p) => p.id === pkg.id);
      if (existing) {
        // Update existing
        await adminUpdatePackage(token, { id: pkg.id, updates: pkg });
      } else {
        // Create new
        const { id, ...newPkg } = pkg;
        await adminCreatePackage(token, newPkg as Omit<Package, 'id'>);
      }
      await fetchPackages();
    } catch {
      setError('Failed to save package. Please try again.');
    }
  };

  const handleDelete = async (pkg: Package) => {
    try {
      await adminDeletePackage(token, { id: pkg.id });
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    } catch {
      setError('Failed to delete package. Please try again.');
    }
  };

  const handleToggle = async (pkg: Package, _field: 'featured') => {
    try {
      await adminUpdatePackage(token, {
        id: pkg.id,
        updates: { featured: !pkg.featured },
      });
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, featured: !p.featured } : p))
      );
    } catch {
      setError('Failed to update package. Please try again.');
    }
  };

  if (error && packages.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-gray-600 mt-2 mb-4">{error}</p>
        <button
          onClick={fetchPackages}
          className="bg-brand-600 text-white font-semibold text-sm px-6 py-2.5 rounded-xl active:bg-brand-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <AdminPackagesTable
        packages={packages}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
        onAdd={() => {}}
      />
    </>
  );
}

// ===== Audit Logs Tab =====

const ACTION_FILTERS = [
  { label: 'All Actions', value: '' },
  { label: 'Created', value: 'create' },
  { label: 'Updated', value: 'update' },
  { label: 'Deleted', value: 'delete' },
  { label: 'Login', value: 'login' },
  { label: 'Logout', value: 'logout' },
];

function AuditLogsTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminGetAuditLogs(token);
      setLogs(result.logs || []);
    } catch {
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (actionFilter) {
      result = result.filter((log) =>
        log.action.toLowerCase().includes(actionFilter.toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.entity_type.toLowerCase().includes(q) ||
          log.entity_id.toLowerCase().includes(q) ||
          log.admin_id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, searchQuery, actionFilter]);

  if (error && logs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-gray-600 mt-2 mb-4">{error}</p>
        <button
          onClick={fetchLogs}
          className="bg-brand-600 text-white font-semibold text-sm px-6 py-2.5 rounded-xl active:bg-brand-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by action, entity, or admin..."
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-3 text-base bg-white border border-gray-300 rounded-xl outline-none focus:border-brand-500 transition-colors"
          style={{ minHeight: '48px' }}
          aria-label="Filter by action type"
        >
          {ACTION_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left border-b border-gray-200">
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Action</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Actor</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Entity Type</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Entity ID</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Details</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Loading audit logs...
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        log.action.includes('create') ? 'bg-brand-50 text-brand-700' :
                        log.action.includes('delete') ? 'bg-red-100 text-red-700' :
                        log.action.includes('update') ? 'bg-blue-100 text-blue-700' :
                        log.action.includes('login') || log.action.includes('logout') ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                      {log.admin_id}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{log.entity_type}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">{log.entity_id}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatTime(log.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
