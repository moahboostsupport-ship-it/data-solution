/**
 * orders-create/index.ts
 * POST — creates a new order
 *
 * Security:
 * - Rate limited: 5 orders per minute per IP
 * - Package price always fetched from DB (never trust client-sent amount)
 * - Phone validated and normalized to 2547XXXXXXXX
 * - Time-based availability check using Africa/Nairobi timezone
 * - Unique order_number generated server-side
 * - All order creations logged to audit_logs
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

/**
 * Generates a unique order number: DS-YYYYMMDD-XXXXX
 */
function generateOrderNumber(): string {
  const now = getNairobiTime();
  const dateStr =
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `DS-${dateStr}-${randomPart}`;
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
      // Log attempt to buy unavailable package
      await logAudit('order_unavailable_package', 'system', {
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

    // Log order creation to audit
    await logAudit('order_created', 'customer', {
      order_number: orderNumber,
      package_id: packageId,
      package_name: pkg.name,
      amount: pkg.price,
      phone: customerPhone,
    }, clientIP);

    // Return safe fields only
    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({
        order_number: orderNumber,
        package_name: pkg.name,
        amount: pkg.price,
        phone: customerPhone,
        payment_status: 'awaiting_payment',
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
