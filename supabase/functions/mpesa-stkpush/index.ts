// Supabase Edge Function (Deno) — Initiates M-PESA STK Push via Tuma.co.ke API
// POST { order_number, customer_phone } → STK push to the customer's phone

import { supabaseAdmin } from "../_shared/supabase.ts";
import { handleOption, corsHeaders } from "../_shared/cors.ts";
import { errorResponse, logError } from "../_shared/errors.ts";
import {
  validatePhone,
  validateOrderNumber,
  sanitizeInput,
  getClientIP,
} from "../_shared/validation.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const TUMA_API_BASE = "https://api.tuma.co.ke";

// ---------------------------------------------------------------------------
// audit_logs helper
// ---------------------------------------------------------------------------
async function logAudit(
  action: string,
  actor: string,
  details: Record<string, unknown>,
  ipAddress: string,
): Promise<void> {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action,
      actor,
      entity_type: "payment",
      details,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error("Failed to log audit:", err);
  }
}

// ---------------------------------------------------------------------------
// Tuma token fetcher (cached across invocations within the same isolate)
// ---------------------------------------------------------------------------
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getTumaToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

  const businessEmail = Deno.env.get("TUMA_BUSINESS_EMAIL");
  const apiKey = Deno.env.get("TUMA_API_KEY");

  if (!businessEmail || !apiKey) {
    throw new Error("Tuma credentials are not configured.");
  }

  const resp = await fetch(`${TUMA_API_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: businessEmail, api_key: apiKey }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Tuma auth failed (${resp.status}): ${text}`);
  }

  const body = await resp.json();
  if (!body?.success || !body?.data?.token) {
    throw new Error("Tuma auth response did not contain a token.");
  }

  cachedToken = body.data.token;

  // Assume 50 min expiry if we can't decode the JWT
  try {
    const payload = JSON.parse(atob(cachedToken.split(".")[1]));
    if (payload?.exp) {
      tokenExpiresAt = payload.exp * 1000;
    } else {
      tokenExpiresAt = now + 50 * 60 * 1000;
    }
  } catch {
    tokenExpiresAt = now + 50 * 60 * 1000;
  }

  return cachedToken;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";

  // CORS preflight
  if (req.method === "OPTIONS") {
    return handleOption(req);
  }

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed.", 405);
  }

  const clientIP = getClientIP(req);

  // ---- Parse & validate input ------------------------------------------------
  let rawBody: { order_number?: string; customer_phone?: string };
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse(req, "Invalid JSON body.", 400);
  }

  const orderNumber = sanitizeInput(rawBody.order_number);
  const rawPhone = sanitizeInput(rawBody.customer_phone);

  if (!orderNumber || !validateOrderNumber(orderNumber)) {
    return errorResponse(req, "A valid order number is required.", 400);
  }

  if (!rawPhone) {
    return errorResponse(req, "Phone number is required.", 400);
  }

  const phone = validatePhone(rawPhone);
  if (!phone) {
    return errorResponse(
      req,
      "Invalid phone number. Please enter a valid Safaricom number (07XXXXXXXX or 2547XXXXXXXX).",
      400,
    );
  }

  // ---- Rate limit: 3 per minute per order ------------------------------------
  if (!checkRateLimit(`stkpush-${orderNumber}`, "mpesa-stkpush", 3, 60_000)) {
    return errorResponse(
      req,
      "Too many payment requests. Please wait a moment and try again.",
      429,
    );
  }

  // ---- Look up order ----------------------------------------------------------
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .eq("customer_phone", phone)
    .maybeSingle();

  if (orderError) {
    logError("order_lookup", orderError);
    return errorResponse(req, "Unable to verify order. Please try again.", 500);
  }

  if (!order) {
    return errorResponse(
      req,
      "No order found matching that order number and phone number.",
      404,
    );
  }

  // ---- Status guard ----------------------------------------------------------
  const blockedStatuses = ["payment_confirmed", "completed", "failed", "cancelled"];

  if (blockedStatuses.includes(order.payment_status)) {
    return errorResponse(
      req,
      `Payment has already been ${order.payment_status.replace("_", " ")} for this order.`,
      400,
    );
  }

  // Allow both awaiting_payment and payment_verification (for retries)
  if (order.payment_status !== "awaiting_payment" && order.payment_status !== "payment_verification") {
    return errorResponse(
      req,
      `This order is not ready for payment (status: ${order.payment_status}).`,
      400,
    );
  }

  // ---- Amount from DB only ---------------------------------------------------
  const amount = Number(order.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return errorResponse(req, "The order amount is not available. Please contact support.", 500);
  }

  // ---- Get Tuma JWT & fire STK push ------------------------------------------
  try {
    const token = await getTumaToken();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const callbackUrl = `${supabaseUrl}/functions/v1/payment-webhook`;

    const stkResp = await fetch(`${TUMA_API_BASE}/payment/stk-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        phone,
        description: `Payment for ${order.package_name} - DATA SOLUTION`,
        callback_url: callbackUrl,
      }),
    });

    if (!stkResp.ok) {
      const errText = await stkResp.text().catch(() => "");
      logError("tuma_stk_push", new Error(`STK push failed: ${errText}`));
      await logAudit("stkpush_provider_error", "system", {
        order_number: orderNumber,
        response: errText.substring(0, 500),
      }, clientIP);
      return errorResponse(
        req,
        "The payment provider could not process the request. Please try again shortly.",
        502,
      );
    }

    const stkBody = await stkResp.json();

    if (!stkBody?.success || !stkBody?.data?.checkout_request_id) {
      logError("tuma_stk_push", new Error("Missing checkout_request_id"));
      await logAudit("stkpush_provider_error", "system", {
        order_number: orderNumber,
        response: stkBody,
      }, clientIP);

      // User-friendly error
      const msg = stkBody?.message || "The payment provider returned an unexpected response.";
      return errorResponse(req, msg, 502);
    }

    const { checkout_request_id, merchant_request_id, payment_id } = stkBody.data;

    // ---- Persist provider reference & update status -------------------------
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        provider_reference: checkout_request_id,
        payment_status: "payment_verification",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      logError("order_update_after_stk", updateError);
    }

    // ---- Audit log ---------------------------------------------------------
    await logAudit("stkpush_sent", "system", {
      order_number: orderNumber,
      checkout_request_id: checkout_request_id,
      merchant_request_id: merchant_request_id,
      payment_id: payment_id,
      phone,
      amount,
    }, clientIP);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment request sent. Enter your M-PESA PIN to complete the payment.",
        checkout_request_id: checkout_request_id,
        order_number: orderNumber,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      },
    );
  } catch (err) {
    logError("stk_push_handler", err);
    await logAudit("stkpush_exception", "system", {
      order_number: orderNumber,
      error: String(err).substring(0, 300),
    }, clientIP);
    return errorResponse(
      req,
      "An unexpected error occurred while sending the payment request.",
      500,
    );
  }
});
