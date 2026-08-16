/**
 * orders-get/index.ts
 * GET — returns order by order_number with phone verification
 *
 * Security:
 * - Order number + phone must match (prevents enumeration)
 * - Returns only safe public fields (no internal IDs, provider references)
 * - Validates order_number format to prevent injection
 */

import { supabaseAdmin } from '../_shared/supabase.ts';
import { handleOption, corsHeaders } from '../_shared/cors.ts';
import { errorResponse, logError } from '../_shared/errors.ts';
import { validateOrderNumber, validatePhone, sanitizeInput } from '../_shared/validation.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const preflight = handleOption(req);
  if (preflight) return preflight;

  // Only allow GET
  if (req.method !== 'GET') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const orderNumberParam = url.searchParams.get('order_number') || '';
    const phoneParam = url.searchParams.get('customer_phone') || '';

    const orderNumber = sanitizeInput(orderNumberParam);
    const rawPhone = sanitizeInput(phoneParam);

    // Validate inputs
    if (!orderNumber || !validateOrderNumber(orderNumber)) {
      return errorResponse(req, 'Invalid order number format', 400);
    }

    if (!rawPhone) {
      return errorResponse(req, 'Phone number is required for verification', 400);
    }

    const customerPhone = validatePhone(rawPhone);
    if (!customerPhone) {
      return errorResponse(req, 'Invalid phone number', 400);
    }

    // Fetch order by order_number — phone must also match
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .eq('customer_phone', customerPhone)
      .maybeSingle();

    if (error) {
      logError('orders-get query', error);
      return errorResponse(req, 'Unable to fetch order', 500);
    }

    if (!order) {
      // Don't reveal whether order exists or not (prevent enumeration)
      return errorResponse(req, 'Order not found or phone number does not match', 404);
    }

    // Return safe public fields only
    // Do NOT expose: id (uuid), provider_reference, or any internal fields
    const safeOrder = {
      order_number: order.order_number,
      package_name: order.package_name,
      amount: order.amount,
      customer_phone: order.customer_phone,
      payment_status: order.payment_status,
      fulfillment_status: order.fulfillment_status,
      created_at: order.created_at,
    };

    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({ order: safeOrder }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  } catch (err) {
    logError('orders-get', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
});
