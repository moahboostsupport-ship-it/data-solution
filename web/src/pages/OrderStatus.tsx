import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import type { OrderStatus as OrderStatusType } from '../lib/types';
import { formatCurrency, formatTime } from '../lib/format';
import OrderProgress from '../components/OrderProgress';
import StatusBadge from '../components/StatusBadge';
import MpesaInstructions from '../components/MpesaInstructions';

const SUPPORT_PHONE = '0798507804';
const SUPPORT_TEL = '+254798507804';

/**
 * Order status page — shows order details, progress indicator,
 * and auto-polls for updates. Gets phone from URL query param for verification.
 */
export default function OrderStatus() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const { order, loading, error } = useOrders(orderNumber || null, phone || undefined);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-sm font-medium">Loading order details...</span>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <span className="text-4xl">😕</span>
        <h1 className="text-xl font-bold text-gray-900 mt-3 mb-2">Order Not Found</h1>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <div className="flex flex-col gap-3">
          <Link
            to="/deals"
            className="text-white font-bold text-base px-8 py-3.5 rounded-2xl no-underline no-select"
            style={{ background: 'linear-gradient(135deg, #005C2B 0%, #00A14B 100%)' }}
          >
            Browse Deals
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const status = order.payment_status as OrderStatusType;
  const isAwaitingPayment = status === 'awaiting_payment';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';
  const isProcessing = status === 'processing' || status === 'payment_verification';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-gray-900">Order Status</h1>
        <p className="text-sm text-gray-500 mt-1">
          Order <span className="font-mono font-semibold text-gray-700">{order.order_number}</span>
        </p>
      </div>

      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <span className="text-4xl">🎉</span>
          <h2 className="text-xl font-bold text-green-800 mt-2">Order Complete!</h2>
          <p className="text-sm text-green-700 mt-1">
            Your package has been successfully processed. Enjoy your data!
          </p>
        </div>
      )}

      {isFailed && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-xl font-bold text-red-800 mt-2">Payment Verification Issue</h2>
          <p className="text-sm text-red-700 mt-1">
            We couldn't verify your payment yet. Please wait a moment and check your order status. If the issue persists, contact us at {SUPPORT_PHONE}.
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 text-center">
          <span className="text-4xl">🚫</span>
          <h2 className="text-xl font-bold text-gray-700 mt-2">Order Cancelled</h2>
          <p className="text-sm text-gray-500 mt-1">
            This order has been cancelled. If you believe this is an error, please contact support.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <OrderProgress status={status} />
        {isProcessing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="font-medium">Auto-refreshing every 5 seconds...</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📋</span> Order Details
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Order Number</span>
            <span className="font-mono text-sm font-semibold text-gray-800">{order.order_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Package</span>
            <span className="text-sm font-semibold text-gray-800">{order.package_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Phone Number</span>
            <span className="text-sm text-gray-700">{order.customer_phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Amount</span>
            <span className="text-lg font-bold text-brand-600">{formatCurrency(order.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Date & Time</span>
            <span className="text-sm text-gray-700">{formatTime(order.created_at)}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Status</span>
            <StatusBadge status={status} type="order" />
          </div>
        </div>
      </div>

      {isAwaitingPayment && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
            <p className="text-sm font-medium text-yellow-900">
              💳 Your payment is still pending. Please complete your M-PESA payment using the instructions below.
            </p>
          </div>
          <MpesaInstructions amount={order.amount} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {!isCompleted && !isCancelled && (
          <Link
            to="/deals"
            className="text-white font-bold text-lg py-3.5 rounded-2xl no-underline no-select text-center"
            style={{ background: 'linear-gradient(135deg, #005C2B 0%, #00A14B 100%)' }}
          >
            Browse More Deals
          </Link>
        )}

        <div className="text-center pt-2">
          <p className="text-sm text-gray-500 mb-3">Need help with this order?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`tel:${SUPPORT_TEL}`}
              className="flex items-center justify-center gap-2 bg-white border-2 border-brand-600 text-brand-700 font-bold text-base py-3 px-6 rounded-xl no-underline no-select hover:bg-brand-50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Call {SUPPORT_PHONE}
            </a>
            <a
              href={`sms:${SUPPORT_TEL}`}
              className="flex items-center justify-center gap-2 bg-white border-2 border-brand-600 text-brand-700 font-bold text-base py-3 px-6 rounded-xl no-underline no-select hover:bg-brand-50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Send SMS
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
