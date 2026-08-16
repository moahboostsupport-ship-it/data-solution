/**
 * admin-orders/index.ts
 * Admin order management endpoint
 *
 * GET — list all orders with pagination, search, filters
 * PATCH — update order (manual payment verification, status updates)
 *
 * Security:
 * - Requires admin JWT auth on EVERY request
 * - All actions logged to audit_logs
 * - Full order details including provider_reference, receipt_number
 */

import { supabaseAdmin } from '../_shared/supabase.ts';
import { handleOption, corsHeaders } from '../_shared/cors.ts';
import { errorResponse, logError } from '../_shared/errors.ts';
import { verifyAdminToken } from '../_shared/auth.ts';
import { validatePagination, sanitizeInput, validateUUID, getClientIP } from '../_shared/validation.ts';
import { logAuditAdmin } from '../_shared/audit.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const preflight = handleOption(req);
  if (preflight) return preflight;

  // Verify admin auth on EVERY request
  const authResult = await verifyAdminToken(req);
  if (!authResult.valid) {
    return errorResponse(req, 'Unauthorized', 401);
  }

  const adminEmail = authResult.email!;
  const clientIP = getClientIP(req);

  // GET — list orders
  if (req.method === 'GET') {
    return handleGetOrders(req, adminEmail, clientIP);
  }

  // PATCH — update order
  if (req.method === 'PATCH') {
    return handleUpdateOrder(req, adminEmail, clientIP);
  }

  return errorResponse(req, 'Method not allowed', 405);
});

/**
 * GET handler — list orders with pagination, search, and filters
 */
async function handleGetOrders(req: Request, adminEmail: string, _clientIP: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const { page, limit } = validatePagination(
      url.searchParams.get('page'),
      url.searchParams.get('limit')
    );

    const search = sanitizeInput(url.searchParams.get('search'));
    const paymentStatus = sanitizeInput(url.searchParams.get('payment_status'));
    const fulfillmentStatus = sanitizeInput(url.searchParams.get('fulfillment_status'));

    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_phone.ilike.%${search}%,provider_reference.ilike.%${search}%`
      );
    }

    // Apply status filters
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    if (fulfillmentStatus) {
      query = query.eq('fulfillment_status', fulfillmentStatus);
    }

    // Pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      logError('admin-orders GET', error);
      return errorResponse(req, 'Unable to fetch orders', 500);
    }

    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({
        orders: orders || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  } catch (err) {
    logError('admin-orders GET', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
}

/**
 * PATCH handler — update order status (admin actions)
 */
async function handleUpdateOrder(req: Request, adminEmail: string, clientIP: string): Promise<Response> {
  try {
    let body: { order_id?: string; action?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse(req, 'Invalid request body', 400);
    }

    const orderId = sanitizeInput(body.order_id);
    const action = sanitizeInput(body.action);

    if (!orderId || !validateUUID(orderId)) {
      return errorResponse(req, 'Invalid order ID', 400);
    }

    const validActions = ['verify_payment', 'mark_processing', 'mark_completed', 'mark_failed', 'cancel'];
    if (!action || !validActions.includes(action)) {
      return errorResponse(req, 'Invalid action. Valid actions: ' + validActions.join(', '), 400);
    }

    // Fetch order
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) {
      logError('admin-orders PATCH fetch', fetchError);
      return errorResponse(req, 'Unable to fetch order', 500);
    }

    if (!order) {
      return errorResponse(req, 'Order not found', 404);
    }

    let newPaymentStatus = order.payment_status;
    let newFulfillmentStatus = order.fulfillment_status;

    switch (action) {
      case 'verify_payment': {
        // Admin manually verifies payment — create payment record
        // Check if payment already exists for this order
        const { data: existingPayment } = await supabaseAdmin
          .from('payments')
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle();

        if (existingPayment) {
          return errorResponse(req, 'Payment already verified for this order', 400);
        }

        // Create manual payment record
        const { error: paymentError } = await supabaseAdmin
          .from('payments')
          .insert({
            order_id: orderId,
            provider: 'manual',
            provider_transaction_id: `manual-${orderId}-${Date.now()}`,
            receipt_number: 'admin_verified',
            amount: order.amount,
            currency: 'KES',
            status: 'verified',
            verified_at: new Date().toISOString(),
            raw_reference: { verified_by: adminEmail, method: 'manual' },
          });

        if (paymentError) {
          logError('admin-orders verify_payment insert', paymentError);
          return errorResponse(req, 'Failed to create payment record', 500);
        }

        newPaymentStatus = 'payment_confirmed';
        break;
      }

      case 'mark_processing':
        newFulfillmentStatus = 'processing';
        break;

      case 'mark_completed':
        // Only allow completion if payment is confirmed
        if (order.payment_status !== 'payment_confirmed') {
          return errorResponse(req, 'Cannot complete order without confirmed payment', 400);
        }
        newFulfillmentStatus = 'completed';
        break;

      case 'mark_failed':
        newFulfillmentStatus = 'failed';
        break;

      case 'cancel':
        // Only allow cancellation if payment is not confirmed
        if (order.payment_status === 'payment_confirmed') {
          return errorResponse(req, 'Cannot cancel order with confirmed payment', 400);
        }
        newPaymentStatus = 'cancelled';
        newFulfillmentStatus = 'cancelled';
        break;
    }

    // Update order
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: newPaymentStatus,
        fulfillment_status: newFulfillmentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      logError('admin-orders PATCH update', updateError);
      return errorResponse(req, 'Failed to update order', 500);
    }

    // Log action to audit
    await logAuditAdmin(`admin_${action}`, adminEmail, 'order', orderId, {
      order_number: order.order_number,
      previous_payment_status: order.payment_status,
      previous_fulfillment_status: order.fulfillment_status,
      new_payment_status: newPaymentStatus,
      new_fulfillment_status: newFulfillmentStatus,
    }, clientIP);

    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({
        order_id: orderId,
        order_number: order.order_number,
        payment_status: newPaymentStatus,
        fulfillment_status: newFulfillmentStatus,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  } catch (err) {
    logError('admin-orders PATCH', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
}
