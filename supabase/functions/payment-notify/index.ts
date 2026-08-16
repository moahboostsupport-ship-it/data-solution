/**
 * payment-notify/index.ts
 * POST — customer says 'I have completed payment'
 *
 * SECURITY: This endpoint does NOT mark payment as verified.
 * It only transitions the order to 'payment_verification' status.
 * Actual payment verification happens server-side via webhook only.
 *
 * Rate limited: 3 per minute per order
 */

import { supabaseAdmin } from '../_shared/supabase.ts';
import { handleOption, corsHeaders } from '../_shared/cors.ts';
import { errorResponse, logError } from '../_shared/errors.ts';
import { validateOrderNumber, validatePhone, sanitizeInput, getClientIP } from '../_shared/validation.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

interface NotifyBody {
  order_number?: string;
  customer_phone?: string;
}

/**
 * Logs an action to audit_logs
 */
async function logAudit(action: string, actor: string, details: Record<string, unknown>, ipAddress: string) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      actor,
      entity_type: 'order',
      details,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const preflight = handleOption(req);
  if (preflight) return preflight;

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  const clientIP = getClientIP(req);

  try {
    let body: NotifyBody;
    try {
      body = await req.json();
    } catch {
      return errorResponse(req, 'Invalid request body', 400);
    }

    // Validate and sanitize inputs
    const orderNumber = sanitizeInput(body.order_number);
    const rawPhone = sanitizeInput(body.customer_phone);

    if (!orderNumber || !validateOrderNumber(orderNumber)) {
      return errorResponse(req, 'Invalid order number format', 400);
    }

    if (!rawPhone) {
      return errorResponse(req, 'Phone number is required', 400);
    }

    const customerPhone = validatePhone(rawPhone);
    if (!customerPhone) {
      return errorResponse(req, 'Invalid phone number', 400);
    }

    // Rate limiting: 3 per minute per order number
    if (!checkRateLimit(orderNumber, 'payment-notify', 3, 60 * 1000)) {
      return errorResponse(req, 'Too many requests. Please wait before trying again.', 429);
    }

    // Find order by order_number + phone (must match)
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .eq('customer_phone', customerPhone)
      .maybeSingle();

    if (error) {
      logError('payment-notify query', error);
      return errorResponse(req, 'Unable to process request', 500);
    }

    if (!order) {
      return errorResponse(req, 'Order not found or phone number does not match', 404);
    }

    // Check if order is in a valid state for payment notification
    // Only allow if payment_status is 'awaiting_payment' or 'payment_verification'
    if (order.payment_status === 'payment_confirmed' || order.payment_status === 'completed') {
      return errorResponse(req, 'Payment has already been confirmed for this order', 400);
    }

    if (order.payment_status === 'payment_failed') {
      return errorResponse(req, 'Payment for this order has failed. Please contact support.', 400);
    }

    // Update order to payment_verification status
    // SECURITY: We do NOT mark as paid — only webhook or admin can do that
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'payment_verification',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('payment_status', 'awaiting_payment'); // Optimistic locking — only update if still awaiting

    if (updateError) {
      logError('payment-notify update', updateError);
      return errorResponse(req, 'Unable to update payment status', 500);
    }

    // Log to audit
    await logAudit('payment_notify', 'customer', {
      order_number: orderNumber,
      phone: customerPhone,
      amount: order.amount,
    }, clientIP);

    // Check if TUMA API is available for automated verification
    const tumaApiKey = Deno.env.get('TUMA_API_KEY');
    const tumaApiSecret = Deno.env.get('TUMA_API_SECRET');

    if (!tumaApiKey || !tumaApiSecret) {
      // No automated verification API available — log for manual admin verification
      await logAudit('payment_manual_verification_needed', 'system', {
        order_number: orderNumber,
        phone: customerPhone,
        amount: order.amount,
        reason: 'No TUMA API key configured',
      }, clientIP);
    }

    // Return verification status (same response whether or not API is available)
    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({
        status: 'payment_verification',
        message: 'We are verifying your payment. Please wait.',
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
    logError('payment-notify', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
});
