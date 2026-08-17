/**
 * orders-create/index.ts
 * POST — creates a new order AND instantly fires M-PESA STK Push
 *
 * Combined flow: one HTTP round trip = order created + STK push sent.
 * The customer gets the M-PESA prompt as fast as possible.
 *
 * Security:
 * - Rate limited: 5 orders per minute per IP
 * - Package price always fetched from DB (never trust client-sent amount)
 * - Phone validated and normalized to 2547XXXXXXXX
 * - Time-based availability check using Africa/Nairobi timezone
 * - Unique order_number generated server-side
 * - Audit logs fire-and-forget (never block the response)
 */

import { supabaseAdmin } from '../_shared/supabase.ts';
import { handleOption, corsHeaders } from '../_shared/cors.ts';
import { errorResponse, logError } from '../_shared/errors.ts';
import { validatePhone, sanitizeInput, validateUUID, getClientIP } from '../_shared/validation.ts';
import { isPackageAvailable, getNairobiTime } from '../_shared/time.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

interface CreateOrderBody {
  package_id?: string;
  customer_phone?: string;
}

// ===== Tuma token cache (per-instance) =====
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

/** Generates a unique order number: DS-YYYYMMDD-XXXXX */
function generateOrderNumber(): string {
  const now = getNairobiTime();
  const dateStr =
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `DS-${dateStr}-${randomPart}`;
}

/** Fire-and-forget audit log — never blocks the response */
function logAudit(action: string, actor: string, details: Record<string, unknown>, ipAddress: string) {
  // Do NOT await — fire and forget
  supabaseAdmin.from('audit_logs').insert({
    action,
    actor,
    entity_type: 'order',
    details,
    ip_address: ipAddress,
  }).then().catch((err) => console.error('Audit log failed:', err));
}

/** Send STK Push via Tuma API */
async function sendStkPush(orderNumber: string, phone: string, amount: number, packageName: string): Promise<{ success: boolean; checkout_request_id?: string; error?: string }> {
  try {
    const token = await getTumaToken();
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`;

    const stkResp = await fetch('https://api.tuma.co.ke/payment/stk-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        amount,
        phone,
        description: `Payment for ${packageName} - DATA SOLUTION`,
        callback_url: callbackUrl,
      }),
    });

    if (!stkResp.ok) {
      const errText = await stkResp.text().catch(() => '');
      console.error('[stk-push] Tuma error:', errText);
      return { success: false, error: 'Payment request failed' };
    }

    const stkData = await stkResp.json();
    if (!stkData?.success || !stkData?.data?.checkout_request_id) {
      console.error('[stk-push] Tuma invalid response:', JSON.stringify(stkData));
      return { success: false, error: stkData?.message || 'Payment request failed' };
    }

    return { success: true, checkout_request_id: stkData.data.checkout_request_id };
  } catch (err) {
    console.error('[stk-push] Error:', err instanceof Error ? err.message : String(err));
    return { success: false, error: 'Payment service unavailable' };
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

  // Rate limiting: 5 orders per minute per IP
  if (!checkRateLimit(clientIP, 'orders-create', 5, 60 * 1000)) {
    return errorResponse(req, 'Too many requests. Please try again later.', 429);
  }

  try {
    // Parse request body
    let body: CreateOrderBody;
    try {
      body = await req.json();
    } catch {
      return errorResponse(req, 'Invalid request body', 400);
    }

    // Validate package_id
    const packageId = sanitizeInput(body.package_id);
    if (!packageId || !validateUUID(packageId)) {
      return errorResponse(req, 'Invalid package ID', 400);
    }

    // Validate and normalize phone
    const rawPhone = sanitizeInput(body.customer_phone);
    if (!rawPhone) {
      return errorResponse(req, 'Phone number is required', 400);
    }
    const customerPhone = validatePhone(rawPhone);
    if (!customerPhone) {
      return errorResponse(req, 'Invalid phone number. Please enter a valid Safaricom number.', 400);
    }

    // Fetch package from database — NEVER trust client-sent amount
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
      return errorResponse(req, 'Package not found', 404);
    }

    // Check if package is active
    if (!pkg.active) {
      return errorResponse(req, 'This package is no longer available', 400);
    }

    // Check time-based availability using Nairobi timezone
    if (!isPackageAvailable({
      start_time: pkg.start_time,
      end_time: pkg.end_time,
      active: pkg.active,
    })) {
      logAudit('order_unavailable_package', 'system', {
        package_id: packageId,
        package_name: pkg.name,
        phone: customerPhone,
        start_time: pkg.start_time,
        end_time: pkg.end_time,
      }, clientIP);

      return errorResponse(req, 'This package is not available at this time', 400);
    }

    // Generate unique order number (with retry for collision)
    let orderNumber = generateOrderNumber();
    let attempts = 0;
    let insertResult;

    while (attempts < 5) {
      // Check if order_number already exists (collision check)
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .maybeSingle();

      if (existing) {
        orderNumber = generateOrderNumber();
        attempts++;
        continue;
      }

      // Insert order with price from DB (never from client)
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_phone: customerPhone,
          package_id: packageId,
          package_name: pkg.name,
          amount: pkg.price, // Always from DB
          payment_status: 'awaiting_payment',
          fulfillment_status: 'pending',
        })
        .select()
        .single();

      if (orderError) {
        // If unique constraint violation, retry with new number
        if (orderError.code === '23505') {
          orderNumber = generateOrderNumber();
          attempts++;
          continue;
        }
        logError('orders-create insert', orderError);
        return errorResponse(req, 'Failed to create order. Please try again.', 500);
      }

      insertResult = order;
      break;
    }

    if (!insertResult) {
      return errorResponse(req, 'Failed to generate unique order number. Please try again.', 500);
    }

    const orderId = insertResult.id;
    const amount = Number(pkg.price);

    // ===== FIRE STK PUSH IMMEDIATELY (no second HTTP round trip) =====
    const stkResult = await sendStkPush(orderNumber, customerPhone, amount, pkg.name);

    if (stkResult.success && stkResult.checkout_request_id) {
      // Update order with provider reference + status
      // Fire-and-forget — don't block the response
      supabaseAdmin.from('orders').update({
        provider_reference: stkResult.checkout_request_id,
        payment_status: 'payment_verification',
        updated_at: new Date().toISOString(),
      }).eq('id', orderId).then().catch((err) => console.error('Order update failed:', err));

      logAudit('stkpush_sent', 'system', {
        order_number: orderNumber,
        checkout_request_id: stkResult.checkout_request_id,
        phone: customerPhone,
        amount,
      }, clientIP);
    } else {
      // STK push failed — but order is created. Customer can retry from order status page.
      logAudit('stkpush_failed_inline', 'system', {
        order_number: orderNumber,
        error: stkResult.error,
        phone: customerPhone,
        amount,
      }, clientIP);
    }

    // Log order creation (fire-and-forget)
    logAudit('order_created', 'customer', {
      order_number: orderNumber,
      package_id: packageId,
      package_name: pkg.name,
      amount,
      phone: customerPhone,
    }, clientIP);

    // Return order data + STK push result in ONE response
    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({
        order_number: orderNumber,
        package_name: pkg.name,
        amount,
        phone: customerPhone,
        payment_status: stkResult.success ? 'payment_verification' : 'awaiting_payment',
        stk_push_sent: stkResult.success,
        stk_error: stkResult.success ? undefined : stkResult.error,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  } catch (err) {
    logError('orders-create', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
});
