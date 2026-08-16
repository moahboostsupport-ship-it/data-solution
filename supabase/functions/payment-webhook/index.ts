/**
 * payment-webhook/index.ts
 * POST — receives payment provider webhook
 *
 * CRITICAL: This is the ONLY way payments get verified automatically.
 * SECURITY REQUIREMENTS:
 * 1. If TUMA_WEBHOOK_SECRET is set, verify HMAC signature — reject if invalid
 * 2. If TUMA_WEBHOOK_SECRET is NOT set, reject ALL webhooks and log suspicious attempt
 * 3. Never accept 'status=success' as sufficient proof
 * 4. Idempotency: provider_transaction_id must be unique in payments table
 * 5. Verify amount matches order, currency is KES, till_number matches 3090748
 * 6. Log all webhook attempts to audit_logs
 */

import { supabaseAdmin } from '../_shared/supabase.ts';
import { handleOption, corsHeaders } from '../_shared/cors.ts';
import { errorResponse, logError } from '../_shared/errors.ts';
import { validatePhone, getClientIP } from '../_shared/validation.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

// Expected till number for this business
const EXPECTED_TILL_NUMBER = '3090748';
const EXPECTED_CURRENCY = 'KES';

interface WebhookPayload {
  transaction_id?: string;
  provider_transaction_id?: string;
  amount?: number | string;
  receipt_number?: string;
  phone?: string;
  till_number?: string;
  currency?: string;
  status?: string;
  // Some providers nest data
  data?: WebhookPayload;
}

/**
 * Generates HMAC-SHA256 signature for webhook verification
 */
async function generateHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time comparison of hex strings
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Logs an action to audit_logs
 */
async function logAudit(action: string, actor: string, details: Record<string, unknown>, ipAddress: string) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      actor,
      entity_type: 'payment',
      details,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}

/**
 * Triggers fulfillment for a confirmed order
 * Calls the fulfillment edge function or marks for processing
 */
async function triggerFulfillment(orderId: string, orderNumber: string): Promise<void> {
  try {
    // Update order to trigger fulfillment processing
    await supabaseAdmin
      .from('orders')
      .update({
        fulfillment_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Log that fulfillment is triggered
    await logAudit('fulfillment_triggered', 'system', {
      order_id: orderId,
      order_number: orderNumber,
    }, 'system');

    // Note: The fulfillment function can be invoked via Supabase functions.invoke()
    // or triggered via database trigger / queue. Here we just update status.
  } catch (err) {
    console.error('Failed to trigger fulfillment:', err);
    // Don't fail the webhook — payment is confirmed, fulfillment will retry
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight (webhooks typically don't need CORS, but include for completeness)
  const preflight = handleOption(req);
  if (preflight) return preflight;

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  const clientIP = getClientIP(req);

  // Rate limiting on webhooks: 30 per minute per IP (webhooks can be high volume)
  if (!checkRateLimit(clientIP, 'payment-webhook', 30, 60 * 1000)) {
    return errorResponse(req, 'Rate limited', 429);
  }

  // SECURITY CHECK 1: Verify webhook secret is configured
  const webhookSecret = Deno.env.get('TUMA_WEBHOOK_SECRET');

  if (!webhookSecret) {
    // No webhook secret configured — reject ALL webhooks for security
    // Log this as a suspicious attempt
    console.error('SECURITY: Webhook received but TUMA_WEBHOOK_SECRET is not set. Rejecting.');
    await logAudit('webhook_rejected_no_secret', 'system', {
      ip: clientIP,
      reason: 'TUMA_WEBHOOK_SECRET not configured',
    }, clientIP);
    return errorResponse(req, 'Webhook not configured', 503);
  }

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();

    // SECURITY CHECK 2: Verify HMAC signature
    const providedSignature = req.headers.get('x-tuma-signature') ||
                              req.headers.get('x-webhook-signature') ||
                              req.headers.get('signature') ||
                              '';

    if (!providedSignature) {
      console.error('SECURITY: Webhook received without signature.');
      await logAudit('webhook_rejected_no_signature', 'system', {
        ip: clientIP,
      }, clientIP);
      return errorResponse(req, 'Missing signature', 401);
    }

    // Compute expected signature
    const expectedSignature = await generateHmacSignature(rawBody, webhookSecret);

    // Compare signatures (constant-time)
    if (!timingSafeCompare(expectedSignature.toLowerCase(), providedSignature.toLowerCase())) {
      console.error('SECURITY: Webhook signature verification failed.');
      await logAudit('webhook_rejected_bad_signature', 'system', {
        ip: clientIP,
        provided_signature_prefix: providedSignature.substring(0, 16) + '...',
      }, clientIP);
      return errorResponse(req, 'Invalid signature', 401);
    }

    // Parse webhook payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      await logAudit('webhook_rejected_invalid_json', 'system', {
        ip: clientIP,
      }, clientIP);
      return errorResponse(req, 'Invalid payload', 400);
    }

    // Some providers nest data in a 'data' field
    const data = payload.data || payload;

    // Extract fields from payload
    const providerTransactionId = data.transaction_id || data.provider_transaction_id || '';
    const amount = typeof data.amount === 'string' ? parseInt(data.amount, 10) : data.amount;
    const receiptNumber = data.receipt_number || '';
    const rawPhone = data.phone || '';
    const tillNumber = data.till_number || '';
    const currency = (data.currency || EXPECTED_CURRENCY).toUpperCase();
    const status = data.status || '';

    // SECURITY CHECK 3: Never accept 'status=success' as sufficient proof
    // We rely on signature verification + data validation, not the status field
    // (status is logged but not used for verification decision)

    // Validate required fields
    if (!providerTransactionId) {
      await logAudit('webhook_rejected_missing_txn_id', 'system', {
        ip: clientIP,
        payload_status: status,
      }, clientIP);
      return errorResponse(req, 'Missing transaction ID', 400);
    }

    if (!amount || amount <= 0) {
      await logAudit('webhook_rejected_invalid_amount', 'system', {
        ip: clientIP,
        transaction_id: providerTransactionId,
        amount,
      }, clientIP);
      return errorResponse(req, 'Invalid amount', 400);
    }

    // Validate phone
    const customerPhone = validatePhone(rawPhone);
    if (!customerPhone) {
      await logAudit('webhook_rejected_invalid_phone', 'system', {
        ip: clientIP,
        transaction_id: providerTransactionId,
        raw_phone: rawPhone,
      }, clientIP);
      return errorResponse(req, 'Invalid phone in payload', 400);
    }

    // SECURITY CHECK 4: Verify currency is KES
    if (currency !== EXPECTED_CURRENCY) {
      await logAudit('webhook_rejected_wrong_currency', 'system', {
        ip: clientIP,
        transaction_id: providerTransactionId,
        currency,
        expected: EXPECTED_CURRENCY,
      }, clientIP);
      return errorResponse(req, 'Invalid currency', 400);
    }

    // SECURITY CHECK 5: Verify till_number matches expected
    if (tillNumber && tillNumber !== EXPECTED_TILL_NUMBER) {
      await logAudit('webhook_rejected_wrong_till', 'system', {
        ip: clientIP,
        transaction_id: providerTransactionId,
        till_number: tillNumber,
        expected: EXPECTED_TILL_NUMBER,
      }, clientIP);
      return errorResponse(req, 'Invalid payment destination', 400);
    }

    // SECURITY CHECK 6: Idempotency — check if provider_transaction_id already exists
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id, status')
      .eq('provider_transaction_id', providerTransactionId)
      .maybeSingle();

    if (existingPayment) {
      // Already processed — return 200 (idempotent)
      await logAudit('webhook_duplicate_ignored', 'system', {
        transaction_id: providerTransactionId,
        existing_payment_id: existingPayment.id,
        existing_status: existingPayment.status,
      }, clientIP);
      return new Response(JSON.stringify({ status: 'already_processed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
      });
    }

    // Find matching order by phone and amount, status should be 'payment_verification' or 'awaiting_payment'
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('customer_phone', customerPhone)
      .eq('amount', amount)
      .in('payment_status', ['awaiting_payment', 'payment_verification'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      logError('webhook order lookup', orderError);
      await logAudit('webhook_error_order_lookup', 'system', {
        transaction_id: providerTransactionId,
        phone: customerPhone,
        amount,
      }, clientIP);
      return errorResponse(req, 'Internal error', 500);
    }

    if (!order) {
      await logAudit('webhook_no_matching_order', 'system', {
        transaction_id: providerTransactionId,
        phone: customerPhone,
        amount,
        receipt_number: receiptNumber,
      }, clientIP);
      return errorResponse(req, 'No matching order found', 404);
    }

    // SECURITY CHECK 7: Verify amount matches order amount (double-check)
    if (order.amount !== amount) {
      await logAudit('webhook_amount_mismatch', 'system', {
        transaction_id: providerTransactionId,
        order_id: order.id,
        order_amount: order.amount,
        webhook_amount: amount,
      }, clientIP);
      return errorResponse(req, 'Amount mismatch', 400);
    }

    // All checks passed — create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id: order.id,
        provider: 'tuma',
        provider_transaction_id: providerTransactionId,
        receipt_number: receiptNumber,
        amount: amount,
        currency: currency,
        status: 'verified',
        verified_at: new Date().toISOString(),
        raw_reference: payload,
      })
      .select()
      .single();

    if (paymentError) {
      // Check if it's a unique constraint violation (duplicate race condition)
      if (paymentError.code === '23505') {
        // Already processed by another concurrent request — idempotent success
        await logAudit('webhook_duplicate_race_condition', 'system', {
          transaction_id: providerTransactionId,
          order_id: order.id,
        }, clientIP);
        return new Response(JSON.stringify({ status: 'already_processed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
        });
      }
      logError('webhook payment insert', paymentError);
      await logAudit('webhook_error_payment_insert', 'system', {
        transaction_id: providerTransactionId,
        order_id: order.id,
        error: paymentError.message,
      }, clientIP);
      return errorResponse(req, 'Internal error', 500);
    }

    // Update order payment_status to 'payment_confirmed'
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'payment_confirmed',
        provider_reference: providerTransactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      logError('webhook order update', updateError);
      // Payment is recorded, but order status update failed — log for admin
      await logAudit('webhook_order_update_failed', 'system', {
        order_id: order.id,
        order_number: order.order_number,
        payment_id: payment.id,
        transaction_id: providerTransactionId,
      }, clientIP);
    }

    // Log successful payment verification
    await logAudit('payment_verified', 'system', {
      order_id: order.id,
      order_number: order.order_number,
      transaction_id: providerTransactionId,
      receipt_number: receiptNumber,
      amount,
      phone: customerPhone,
    }, clientIP);

    // Trigger fulfillment
    await triggerFulfillment(order.id, order.order_number);

    return new Response(
      JSON.stringify({ status: 'verified', order_number: order.order_number }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
      }
    );
  } catch (err) {
    logError('payment-webhook', err);
    await logAudit('webhook_unexpected_error', 'system', {
      ip: clientIP,
      error: err instanceof Error ? err.message : 'unknown',
    }, clientIP);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
});
