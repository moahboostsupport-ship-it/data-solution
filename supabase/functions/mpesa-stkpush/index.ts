// M-PESA STK Push via Tuma.co.ke — Self-contained (no external imports)
// POST { order_number, customer_phone } → STK push to customer's phone

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

function validateOrderNumber(orderNumber: string): boolean {
  if (!orderNumber || typeof orderNumber !== 'string') return false;
  return /^DS-\d{8}-\d{5}$/.test(orderNumber.trim());
}

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
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

// ===== Tuma token (cached) =====
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getTumaToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 5 * 60 * 1000) return cachedToken;

  const email = Deno.env.get('TUMA_BUSINESS_EMAIL');
  const apiKey = Deno.env.get('TUMA_API_KEY');
  if (!email || !apiKey) throw new Error('Tuma credentials not configured');

  const resp = await fetch('https://api.tuma.co.ke/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, api_key: apiKey }),
  });
  if (!resp.ok) throw new Error(`Tuma auth failed: ${await resp.text()}`);

  const body = await resp.json();
  if (!body?.success || !body?.data?.token) throw new Error('Tuma auth: no token');

  cachedToken = body.data.token;
  try {
    const payload = JSON.parse(atob(cachedToken.split('.')[1]));
    tokenExpiresAt = payload?.exp ? payload.exp * 1000 : now + 50 * 60 * 1000;
  } catch {
    tokenExpiresAt = now + 50 * 60 * 1000;
  }
  return cachedToken;
}

// ===== Main handler =====
Deno.serve(async (req: Request) => {
  const preflight = handleOption(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return errorResponse(req, 'Method not allowed', 405);

  const clientIP = getClientIP(req);

  try {
    let rawBody: { order_number?: string; customer_phone?: string };
    try { rawBody = await req.json(); } catch { return errorResponse(req, 'Invalid JSON body', 400); }

    const orderNumber = sanitizeInput(rawBody.order_number);
    const rawPhone = sanitizeInput(rawBody.customer_phone);

    if (!orderNumber || !validateOrderNumber(orderNumber)) return errorResponse(req, 'Invalid order number', 400);
    if (!rawPhone) return errorResponse(req, 'Phone number is required', 400);

    const phone = validatePhone(rawPhone);
    if (!phone) return errorResponse(req, 'Invalid phone number. Please enter a valid Safaricom number.', 400);

    if (!checkRateLimit(`stkpush-${orderNumber}`, 'mpesa-stkpush', 3, 60_000)) {
      return errorResponse(req, 'Too many payment requests. Please wait a moment.', 429);
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders').select('*')
      .eq('order_number', orderNumber).eq('customer_phone', phone).maybeSingle();

    if (orderError) { logError('order lookup', orderError); return errorResponse(req, 'Unable to process request', 500); }
    if (!order) return errorResponse(req, 'Order not found', 404);

    const blocked = ['payment_confirmed', 'completed', 'failed', 'cancelled'];
    if (blocked.includes(order.payment_status)) {
      return errorResponse(req, `Payment already ${order.payment_status.replace('_', ' ')}`, 400);
    }
    if (order.payment_status !== 'awaiting_payment' && order.payment_status !== 'payment_verification') {
      return errorResponse(req, `Order not ready for payment (${order.payment_status})`, 400);
    }

    const amount = Number(order.amount);
    if (!Number.isFinite(amount) || amount <= 0) return errorResponse(req, 'Invalid order amount', 500);

    // Get Tuma token
    let token: string;
    try { token = await getTumaToken(); }
    catch (err) {
      logError('tuma auth', err);
      await logAudit('stkpush_auth_failed', 'system', { order_number: orderNumber, error: String(err).substring(0, 200) }, clientIP);
      return errorResponse(req, 'Payment service temporarily unavailable', 503);
    }

    const callbackUrl = `${SUPABASE_URL}/functions/v1/payment-webhook`;

    const stkResp = await fetch('https://api.tuma.co.ke/payment/stk-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        amount, phone,
        description: `Payment for ${order.package_name} - DATA SOLUTION`,
        callback_url: callbackUrl,
      }),
    });

    if (!stkResp.ok) {
      const errText = await stkResp.text().catch(() => '');
      logError('tuma stk', errText);
      await logAudit('stkpush_failed', 'system', { order_number: orderNumber, response: errText.substring(0, 500) }, clientIP);
      return errorResponse(req, 'Payment request failed. Please try again.', 502);
    }

    const stkData = await stkResp.json();
    if (!stkData?.success || !stkData?.data?.checkout_request_id) {
      logError('tuma stk', JSON.stringify(stkData));
      await logAudit('stkpush_failed', 'system', { order_number: orderNumber, response: stkData }, clientIP);
      return errorResponse(req, stkData?.message || 'Payment request failed', 502);
    }

    const checkoutRequestId = stkData.data.checkout_request_id;

    await supabaseAdmin.from('orders').update({
      provider_reference: checkoutRequestId,
      payment_status: 'payment_verification',
      updated_at: new Date().toISOString(),
    }).eq('id', order.id);

    await logAudit('stkpush_sent', 'system', {
      order_number: orderNumber, checkout_request_id: checkoutRequestId,
      phone, amount,
    }, clientIP);

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment request sent. Enter your M-PESA PIN to complete the payment.',
      checkout_request_id: checkoutRequestId,
      order_number: orderNumber,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('origin')) },
    });
  } catch (err) {
    logError('mpesa-stkpush', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
});
