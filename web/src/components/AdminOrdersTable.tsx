import { useState, useMemo } from 'react';
import type { Order } from '../lib/types';
import { formatCurrency, formatTime } from '../lib/format';
import StatusBadge from './StatusBadge';
import SearchBar from './SearchBar';

interface AdminOrdersTableProps {
  orders: Order[];
  loading: boolean;
  onSearch?: (query: string) => void;
  onFilter?: (status: string) => void;
}

type SortField = 'order_number' | 'phone_number' | 'amount' | 'created_at';
type SortDir = 'asc' | 'desc';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Awaiting Payment', value: 'awaiting_payment' },
  { label: 'Verification', value: 'payment_verification' },
  { label: 'Confirmed', value: 'payment_confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAGE_SIZE = 10;

/**
 * Orders table for the admin dashboard.
 * Supports search, status filter, sorting, and pagination.
 */
export default function AdminOrdersTable({
  orders,
  loading,
  onSearch,
  onFilter,
}: AdminOrdersTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  // Filter orders
  const filtered = useMemo(() => {
    let result = [...orders];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.phone_number.toLowerCase().includes(q) ||
          (o.mpesa_transaction_id || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

      switch (sortField) {
        case 'amount':
          valA = a.amount;
          valB = b.amount;
          break;
        case 'created_at':
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
          break;
        default:
          valA = (a[sortField] || '').toString().toLowerCase();
          valB = (b[sortField] || '').toString().toLowerCase();
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [orders, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageOrders = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(0);
    onSearch?.(value);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(0);
    onFilter?.(value);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1">
        {sortDir === 'asc' ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by order ID, phone, or receipt..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-4 py-3 text-base bg-white border border-gray-300 rounded-xl outline-none focus:border-brand-500 transition-colors"
          style={{ minHeight: '48px' }}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((f) => (
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
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={() => handleSort('order_number')}>
                  Order ID <SortIcon field="order_number" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={() => handleSort('phone_number')}>
                  Phone <SortIcon field="phone_number" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Package</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>
                  Amount <SortIcon field="amount" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Payment Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Fulfillment</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Receipt</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')}>
                  Date <SortIcon field="created_at" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Provider Ref</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Loading orders...
                    </div>
                  </td>
                </tr>
              ) : pageOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No orders found.
                  </td>
                </tr>
              ) : (
                pageOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{order.phone_number}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{order.package_name}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={order.payment_status} type="payment" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={order.fulfillment_status} type="fulfillment" />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {order.mpesa_transaction_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatTime(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {order.mpesa_transaction_id || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg disabled:opacity-40 active:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-600">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg disabled:opacity-40 active:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
