import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getOrderStatus } from '../lib/api';
import { formatCurrency, formatTime, validateSafaricomPhone, formatPhone } from '../lib/format';
import type { Order } from '../lib/types';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';

/**
 * Customer-facing order lookup page.
 * Requires order number + phone number for verification.
 */
export default function Orders() {
  const [orderQuery, setOrderQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [result, setResult] = useState<Order | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const orderNum = orderQuery.trim();
    const phone = phoneQuery.trim();

    if (!orderNum || !phone) {
      setError('Please enter both your order number and phone number.');
      return;
    }

    if (!validateSafaricomPhone(phone)) {
      setError('Please enter a valid Safaricom phone number.');
      return;
    }

    setSearching(true);
    setError(null);
    setHasSearched(true);
    setResult(null);

    try {
      const normalizedPhone = formatPhone(phone);
      const res = await getOrderStatus(orderNum, normalizedPhone);
      if (res?.order) {
        setResult(res.order);
      } else {
        setError('No order found. Please check your order number and phone.');
      }
    } catch {
      setError('Order not found or phone number does not match.');
    } finally {
      setSearching(false);
    }
  }, [orderQuery, phoneQuery]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center pt-2">
        <span className="text-4xl">📦</span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">Track Your Order</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter your order number and the phone number you used
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Order Number</label>
          <SearchBar
            value={orderQuery}
            onChange={setOrderQuery}
            placeholder="e.g. DS-20260816-12345"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Phone Number</label>
          <SearchBar
            value={phoneQuery}
            onChange={setPhoneQuery}
            placeholder="07XXXXXXXX or 2547XXXXXXXX"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!orderQuery.trim() || !phoneQuery.trim() || searching}
          className="w-full text-white font-bold text-lg py-3.5 rounded-2xl transition-colors no-select disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #005C2B 0%, #00A14B 100%)', minHeight: '52px' }}
        >
          {searching ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Searching...
            </span>
          ) : (
            'Search Order'
          )}
        </button>
      </div>

      {error && !searching && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-8 text-center">
          <span className="text-3xl">🔍</span>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
      )}

      {result && !searching && (
        <Link
          to={`/order/${result.order_number}?phone=${encodeURIComponent(result.customer_phone)}`}
          className="block bg-white rounded-2xl border border-gray-200 p-5 no-underline hover:border-brand-300 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-sm font-semibold text-gray-800">
              {result.order_number}
            </span>
            <StatusBadge status={result.payment_status} type="order" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Package</span>
              <span className="text-sm font-medium text-gray-700">{result.package_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-sm font-semibold text-brand-600">{formatCurrency(result.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Date</span>
              <span className="text-xs text-gray-600">{formatTime(result.created_at)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">{result.customer_phone}</span>
            <span className="text-sm font-semibold text-brand-600 flex items-center gap-1">
              View Details
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </div>
        </Link>
      )}

      {!hasSearched && !searching && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <span className="text-3xl">👆</span>
          <p className="text-sm text-gray-500 mt-2">
            Enter your order number and the phone number you used to purchase above.
          </p>
        </div>
      )}

      <div className="text-center">
        <Link to="/help" className="text-sm text-brand-600 font-semibold underline">
          Need help? Visit our Help page
        </Link>
      </div>
    </div>
  );
}
