import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getOrderStatus } from '../lib/api';
import { formatCurrency, formatTime, validateSafaricomPhone, formatPhone } from '../lib/format';
import type { Order } from '../lib/types';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';

/**
 * Customer-facing order lookup page.
 * Accepts either an order number or a phone number.
 * Shows matching orders in a list, each linking to the order status page.
 */
export default function Orders() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Order[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setError(null);
    setHasSearched(true);
    setResults([]);

    try {
      // Determine if the query is a phone number or order number
      const isPhone = validateSafaricomPhone(trimmed);

      if (isPhone) {
        // Search by phone number via supabase
        const normalizedPhone = formatPhone(trimmed);
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .eq('phone_number', normalizedPhone)
          .order('created_at', { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          setResults(data as unknown as Order[]);
        } else {
          setError('No orders found for this phone number.');
        }
      } else {
        // Search by order number via API
        try {
          const result = await getOrderStatus(trimmed);
          if (result?.order) {
            setResults([result.order]);
          } else {
            setError('No order found with this order number.');
          }
        } catch {
          // Try supabase as fallback
          const { data, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('order_number', trimmed)
            .limit(1);

          if (fetchError) throw fetchError;
          if (data && data.length > 0) {
            setResults(data as unknown as Order[]);
          } else {
            setError('No order found with this order number.');
          }
        }
      }
    } catch {
      setError('Unable to search orders right now. Please try again in a moment.');
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="text-center pt-2">
        <span className="text-4xl">📦</span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">Track Your Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter your order number or Safaricom phone number to find your orders
        </p>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3">
        <div onKeyDown={handleKeyDown}>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Order number or phone number..."
            id="order-search"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          className="w-full bg-brand-600 text-white font-bold text-lg py-3.5 rounded-2xl active:bg-brand-700 transition-colors no-select disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '52px' }}
        >
          {searching ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Searching...
            </span>
          ) : (
            'Search Orders'
          )}
        </button>
      </div>

      {/* Error message */}
      {error && !searching && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-8 text-center">
          <span className="text-3xl">🔍</span>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !searching && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-600">
            {results.length} order{results.length !== 1 ? 's' : ''} found
          </p>

          {results.map((order) => (
            <Link
              key={order.id}
              to={`/order/${order.order_number}`}
              className="block bg-white rounded-2xl border border-gray-200 p-5 no-underline hover:border-brand-300 hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-sm font-semibold text-gray-800">
                  {order.order_number}
                </span>
                <StatusBadge status={order.status} type="order" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Package</span>
                  <span className="text-sm font-medium text-gray-700">{order.package_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Amount</span>
                  <span className="text-sm font-semibold text-brand-600">{formatCurrency(order.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Date</span>
                  <span className="text-xs text-gray-600">{formatTime(order.created_at)}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">{order.phone_number}</span>
                <span className="text-sm font-semibold text-brand-600 flex items-center gap-1">
                  View Details
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Initial state */}
      {!hasSearched && !searching && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <span className="text-3xl">👆</span>
          <p className="text-sm text-gray-500 mt-2">
            Enter your order number (e.g. ORD-XXXXX) or your Safaricom phone number above to find your orders.
          </p>
        </div>
      )}

      {/* Help link */}
      <div className="text-center">
        <Link to="/help" className="text-sm text-brand-600 font-semibold underline">
          Need help? Visit our Help page
        </Link>
      </div>
    </div>
  );
}
