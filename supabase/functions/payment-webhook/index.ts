// Payment Webhook — receives Tuma/Daraja callbacks. Self-contained (no external imports).
// Always returns 200 to prevent retries.

import { createClient } from 'npm:@supabase/supabase-js@2';

// ===== Supabase client =====
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ===== CORS =====
function corsHeaders(origin?: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-admin-token',
    'Access-Control-Max-Age': '86400',
  };
}

function handleOption(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
  }
  return null;
}

function errorResponse(req: Request, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
  });
}

function logError(context: string, error: unknown): void {
  console.error(`[${new Date().toISOString()}] ERROR [${context}]`, error instanceof Error ? error.message : String(error));
}

// ===== Validation =====
function validatePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  let cleaned = phone.trim().replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('254')) {
    if (cleaned.length === 12 && /^254[17]\d{8}$/.test(cleaned)) return cleaned;
    return null;
  }
  if (cleaned.startsWith('0')) {
    const rest = cleaned.slice(1);
    if (rest.length === 9 && /^[17]\d{8}$/.test(rest)) return '254' + rest;
    return null;
  }
  if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    if (cleaned.length === 9 && /^[17]\d{8}$/.test(cleaned)) return '254' + cleaned;
    return null;
  }
  return null;
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

// ===== Rate limiting =====
interface RateBucket { count: number; windowStart: number; }
const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(key: string, endpoint: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const k = `${key}:${endpoint}`;
  const bucket = rateBuckets.get(k);
  if (!bucket) { rateBuckets.set(k, { count: 1, windowStart: now }); return true; }
  if (now - bucket.windowStart > windowMs) { rateBuckets.set(k, { count: 1, windowStart: now }); return true; }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

// ===== Audit =====
async function logAudit(action: string, actor: string, details: Record<string, unknown>, ip: string): Promise<void> {
  try {
    await supabaseAdmin.from('audit_logs').insert({ action, actor, entity_type: 'payment', details, ip_address: ip });
  } catch (err) { console.error('Audit log failed:', err); }
}

// ===== Callback parser (Tuma flat + Daraja nested) =====
interface ParsedCallback {
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount: number | null;
  mpesaReceiptNumber: string | null;
  phone: string | null;
}

function parseCallback(raw: string): ParsedCallback | null {
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return null; }

  // Daraja nested format
  if (payload?.Body?.stkCallback) {
    const cb = payload.Body.stkCallback;
    const metadata = cb.CallbackMetadata?.Item || [];
    return {
      checkoutRequestId: cb.CheckoutRequestID || '',
      resultCode: cb.ResultCode ?? -1,
      resultDesc: cb.ResultDesc || '',
      amount: metadata.find((m: any) => m.Name === 'Amount')?.Value ? Number(metadata.find((m: any) => m.Name === 'Amount')?.Value) : null,
      mpesaReceiptNumber: (metadata.find((m: any) => m.Name === 'MpesaReceiptNumber')?.Value as string) || null,
      phone: (metadata.find((m: any) => m.Name === 'PhoneNumber')?.Value as string) || null,
    };
  }

  // Tuma flat format (possibly nested in data)
  const d = payload?.data || payload;
  if (d?.checkout_request_id || d?.payment_id) {
    return {
      checkoutRequestId: d.checkout_request_id || d.payment_id || '',
      resultCode: d.result_code ?? (d.status === 'completed' ? 0 : 1),
      resultDesc: d.result_description || d.status || '',
      amount: d.amount ? Number(d.amount) : null,
      mpesaReceiptNumber: d.mpesa_receipt_number || d.mpesa_transaction_id || null,
      phone: d.phone || null,
    };
  }

  return null;
}

// ===== Fulfillment =====
async function triggerFulfillment(orderId: string, orderNumber: string): Promise<void> {
  try {
    await supabaseAdmin.from('orders').update({
      fulfillment_status: 'processing',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    await logAudit('fulfillment_triggered', 'system', { order_id: orderId, order_number: orderNumber }, 'system');
  } catch (err) { console.error('Fulfillment trigger failed:', err); }
}

// ===== Main handler =====
Deno.serve(async (req: Request) => {
  const preflight = handleOption(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return errorResponse(req, 'Method not allowed', 405);

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 'payment-webhook', 60, 60_000)) return errorResponse(req, 'Rate limited', 429);

  try {
    const rawBody = await req.text();
    const parsed = parseCallback(rawBody);

    if (!parsed) {
      await logAudit('webhook_invalid_payload', 'system', { ip: clientIP }, clientIP);
      return new Response(JSON.stringify({ status: 'invalid' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
      });
    }

    const { checkoutRequestId, resultCode, resultDesc, amount: callbackAmount, mpesaReceiptNumber, phone: callbackPhone } = parsed;

    await logAudit('payment_callback_received', 'system', {
      checkout_request_id: checkoutRequestId, result_code: resultCode, result_desc: resultDesc,
      amount: callbackAmount, receipt: mpesaReceiptNumber, phone: callbackPhone,
    }, clientIP);

    // Find order by checkout_request_id
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders').select('*')
      .eq('provider_reference', checkoutRequestId).maybeSingle();

    if (orderError) {
      logError('webhook order lookup', orderError);
      return new Response(JSON.stringify({ status: 'error' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
      });
    }

    if (!order) {
      await logAudit('webhook_order_not_found', 'system', { checkout_request_id: checkoutRequestId }, clientIP);
      return new Response(JSON.stringify({ status: 'order_not_found' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
      });
    }

    // PAYMENT FAILED
    if (resultCode !== 0) {
      await supabaseAdmin.from('orders').update({
        payment_status: 'failed', updated_at: new Date().toISOString(),
      }).eq('id', order.id).eq('payment_status', 'payment_verification');

      await logAudit('payment_failed', 'system', {
        order_number: order.order_number, checkout_request_id: checkoutRequestId,
        result_code: resultCode, result_desc: resultDesc,
      }, clientIP);

      return new Response(JSON.stringify({ status: 'payment_failed' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
      });
    }

    // PAYMENT SUCCESS
    // Idempotency check
    if (mpesaReceiptNumber) {
      const { data: existing } = await supabaseAdmin.from('payments')
        .select('id').eq('mpesa_transaction_id', mpesaReceiptNumber).maybeSingle();
      if (existing) {
        await logAudit('webhook_duplicate', 'system', { order_number: order.order_number, receipt: mpesaReceiptNumber }, clientIP);
        return new Response(JSON.stringify({ status: 'already_processed' }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
        });
      }
    }

    // Verify amount
    if (callbackAmount && callbackAmount !== order.amount) {
      await logAudit('webhook_amount_mismatch', 'system', {
        order_number: order.order_number, expected: order.amount, received: callbackAmount,
      }, clientIP);
      await supabaseAdmin.from('orders').update({
        payment_status: 'failed', updated_at: new Date().toISOString(),
      }).eq('id', order.id);
      return new Response(JSON.stringify({ status: 'amount_mismatch' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
      });
    }

    // Record payment
    const normalizedPhone = callbackPhone ? validatePhone(String(callbackPhone)) : order.customer_phone;

    const { error: paymentError } = await supabaseAdmin.from('payments').insert({
      order_id: order.id, amount: order.amount,
      phone_number: normalizedPhone || order.customer_phone,
      status: 'verified',
      mpesa_transaction_id: mpesaReceiptNumber,
      provider_transaction_id: checkoutRequestId,
    });

    if (paymentError && paymentError.code !== '23505') logError('payment insert', paymentError);

    // Update order
    const { error: updateError } = await supabaseAdmin.from('orders').update({
      payment_status: 'payment_confirmed', updated_at: new Date().toISOString(),
    }).eq('id', order.id).eq('payment_status', 'payment_verification');

    if (updateError) logError('order update', updateError);

    await logAudit('payment_confirmed', 'system', {
      order_number: order.order_number, order_id: order.id,
      receipt: mpesaReceiptNumber, amount: order.amount,
    }, clientIP);

    await triggerFulfillment(order.id, order.order_number);

    return new Response(JSON.stringify({ status: 'payment_confirmed' }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
    });
  } catch (err) {
    logError('payment-webhook', err);
    return new Response(JSON.stringify({ status: 'error' }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
    });
  }
});
