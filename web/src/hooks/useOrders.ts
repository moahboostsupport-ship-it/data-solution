import { useState, useEffect, useRef, useCallback } from 'react';
import { getOrderStatus } from '../lib/api';
import type { Order } from '../lib/types';

export interface UseOrdersResult {
  order: Order | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Statuses that require active polling for updates */
const POLLABLE_STATUSES: string[] = ['payment_verification', 'processing'];

/**
 * Fetches a single order by order_number + phone. Automatically polls
 * every 5 seconds when the order status is 'payment_verification' or 'processing'.
 */
export function useOrders(orderNumber: string | null, phone?: string): UseOrdersResult {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber || !phone) {
      setLoading(false);
      setError(!orderNumber ? 'No order number provided' : 'Phone number required to verify order');
      return;
    }

    try {
      const result = await getOrderStatus(orderNumber, phone);
      if (!result?.order) {
        setError('Order not found. Please check your order number and try again.');
        setLoading(false);
        return;
      }
      setOrder(result.order);
      setError(null);
    } catch {
      setError('Unable to fetch order details. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [orderNumber, phone]);

  useEffect(() => {
    setLoading(true);
    setOrder(null);
    setError(null);
    fetchOrder();
  }, [fetchOrder]);

  // Polling effect — re-runs whenever order status changes
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!order) return;

    const shouldPoll = POLLABLE_STATUSES.includes(order.payment_status);

    if (shouldPoll) {
      timerRef.current = setTimeout(() => {
        fetchOrder();
      }, 5000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [order, fetchOrder]);

  return { order, loading, error, refetch: fetchOrder };
}
