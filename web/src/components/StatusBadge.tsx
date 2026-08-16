import type { OrderStatus, PaymentStatus, FulfillmentStatus } from '../lib/types';

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'payment' | 'fulfillment';
}

type BadgeStyle = {
  bg: string;
  text: string;
  dot: string;
  label: string;
};

function getOrderBadge(status: OrderStatus): BadgeStyle {
  switch (status) {
    case 'awaiting_payment':
      return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Awaiting Payment' };
    case 'payment_verification':
      return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Payment Verification' };
    case 'payment_confirmed':
      return { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500', label: 'Payment Confirmed' };
    case 'processing':
      return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Processing' };
    case 'completed':
      return { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-600', label: 'Completed' };
    case 'failed':
      return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Failed' };
    case 'cancelled':
      return { bg: 'bg-gray-200', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Cancelled' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', label: status };
  }
}

function getPaymentBadge(status: PaymentStatus): BadgeStyle {
  switch (status) {
    case 'pending':
      return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Pending' };
    case 'verified':
      return { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500', label: 'Verified' };
    case 'failed':
      return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Failed' };
    case 'reversed':
      return { bg: 'bg-gray-200', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Reversed' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', label: status };
  }
}

function getFulfillmentBadge(status: FulfillmentStatus): BadgeStyle {
  switch (status) {
    case 'pending':
      return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Pending' };
    case 'processing':
      return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Processing' };
    case 'completed':
      return { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-600', label: 'Completed' };
    case 'failed':
      return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Failed' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', label: status };
  }
}

/**
 * Reusable badge component for order, payment, or fulfillment statuses.
 * Color-coded with a dot indicator and label.
 */
export default function StatusBadge({ status, type = 'order' }: StatusBadgeProps) {
  let badge: BadgeStyle;

  if (type === 'payment') {
    badge = getPaymentBadge(status as PaymentStatus);
  } else if (type === 'fulfillment') {
    badge = getFulfillmentBadge(status as FulfillmentStatus);
  } else {
    badge = getOrderBadge(status as OrderStatus);
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
      {badge.label}
    </span>
  );
}
