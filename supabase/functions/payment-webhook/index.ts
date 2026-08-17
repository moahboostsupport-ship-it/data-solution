/**
 * payment-webhook/index.ts
 * POST — receives payment callbacks from Tuma.co.ke (and Daraja-style fallback)
 *
 * SECURITY:
 * 1. Matches order by checkout_request_id stored in provider_reference
 * 2. Idempotency: mpesa_receipt_number must be unique in payments table
 * 3. Verifies amount matches order
 * 4. Only result_code === 0 means payment success
 * 5. All callbacks logged to audit_logs
 * 6. Always returns 200 to prevent retries
 */

import { supabaseAdmin } from "../_shared/supabase.ts";
import { handleOption, corsHeaders } from "../_shared/cors.ts";
import { errorResponse, logError } from "../_shared/errors.ts";
import { getClientIP, validatePhone } from "../_shared/validation.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Tuma flat callback format
interface TumaCallback {
  payment_id?: string;
  checkout_request_id?: string;
  merchant_request_id?: string;
  status?: string; // "completed" | "failed"
  amount?: number;
  phone?: string;
  mpesa_receipt_number?: string;
  mpesa_transaction_id?: string;
  result_code?: number;
  result_description?: string;
  // Some callbacks nest data
  data?: TumaCallback;
}

// Daraja nested callback format (fallback)
interface DarajaCallback {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Audit helper
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
// Trigger fulfillment
// ---------------------------------------------------------------------------
async function triggerFulfillment(orderId: string, orderNumber: string): Promise<void> {
  try {
    await supabaseAdmin
      .from("orders")
      .update({
        fulfillment_status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    await logAudit("fulfillment_triggered", "system", {
      order_id: orderId,
      order_number: orderNumber,
    }, "system");
  } catch (err) {
    console.error("Failed to trigger fulfillment:", err);
  }
}

// ---------------------------------------------------------------------------
// Parse callback — handles both Tuma flat format and Daraja nested format
// ---------------------------------------------------------------------------
interface ParsedCallback {
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount: number | null;
  mpesaReceiptNumber: string | null;
  phone: string | null;
}

function parseCallback(raw: string): ParsedCallback | null {
  let payload: TumaCallback & DarajaCallback;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }

  // Try Daraja nested format first (Body.stkCallback)
  if (payload.Body?.stkCallback) {
    const cb = payload.Body.stkCallback;
    const metadata = cb.CallbackMetadata?.Item || [];

    return {
      checkoutRequestId: cb.CheckoutRequestID || "",
      resultCode: cb.ResultCode ?? -1,
      resultDesc: cb.ResultDesc || "",
      amount: metadata.find((m) => m.Name === "Amount")?.Value
        ? Number(metadata.find((m) => m.Name === "Amount")?.Value)
        : null,
      mpesaReceiptNumber:
        (metadata.find((m) => m.Name === "MpesaReceiptNumber")?.Value as string) || null,
      phone:
        (metadata.find((m) => m.Name === "PhoneNumber")?.Value as string) || null,
    };
  }

  // Try Tuma flat format (possibly nested in data)
  const tumaData = payload.data || payload;

  if (tumaData.checkout_request_id || tumaData.payment_id) {
    return {
      checkoutRequestId: tumaData.checkout_request_id || tumaData.payment_id || "",
      resultCode: tumaData.result_code ?? (tumaData.status === "completed" ? 0 : 1),
      resultDesc: tumaData.result_description || tumaData.status || "",
      amount: tumaData.amount ? Number(tumaData.amount) : null,
      mpesaReceiptNumber: tumaData.mpesa_receipt_number || tumaData.mpesa_transaction_id || null,
      phone: tumaData.phone || null,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const preflight = handleOption(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  const clientIP = getClientIP(req);

  // Rate limiting
  if (!checkRateLimit(clientIP, "payment-webhook", 60, 60 * 1000)) {
    return errorResponse(req, "Rate limited", 429);
  }

  try {
    const rawBody = await req.text();
    const parsed = parseCallback(rawBody);

    if (!parsed) {
      await logAudit("webhook_invalid_payload", "system", { ip: clientIP }, clientIP);
      return new Response(JSON.stringify({ status: "invalid" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("origin")) },
      });
    }

    const {
      checkoutRequestId,
      resultCode,
      resultDesc,
      amount: callbackAmount,
      mpesaReceiptNumber,
      phone: callbackPhone,
    } = parsed;

    // Log all callbacks
    await logAudit("payment_callback_received", "system", {
      checkout_request_id: checkoutRequestId,
      result_code: resultCode,
      result_desc: resultDesc,
      amount: callbackAmount,
      receipt: mpesaReceiptNumber,
      phone: callbackPhone,
    }, clientIP);

    // Find order by checkout_request_id (stored in provider_reference)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("provider_reference", checkoutRequestId)
      .maybeSingle();

    if (orderError) {
      logError("webhook order lookup", orderError);
      return new Response(JSON.stringify({ status: "error" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("origin")) },
      });
    }

    if (!order) {
      await logAudit("webhook_order_not_found", "system", {
        checkout_request_id: checkoutRequestId,
      }, clientIP);
      return new Response(JSON.stringify({ status: "order_not_found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("origin")) },
      });
    }

    // ---- PAYMENT FAILED — resultCode !== 0 -----------------------------------
    if (resultCode !== 0) {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("payment_status", "payment_verification");

      await logAudit("payment_failed", "system", {
        order_number: order.order_number,
        checkout_request_id: checkoutRequestId,
        result_code: resultCode,
        result_desc: resultDesc,
      }, clientIP);

      return new Response(JSON.stringify({ status: "payment_failed" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("origin")) },
      });
    }

    // ---- PAYMENT SUCCESS — resultCode === 0 ----------------------------------

    // Idempotency: check if receipt already processed
    if (mpesaReceiptNumber) {
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id, status")
        .eq("mpesa_transaction_id", mpesaReceiptNumber)
        .maybeSingle();

      if (existingPayment) {
        await logAudit("webhook_duplicate_receipt", "system", {
          order_number: order.order_number,
          receipt: mpesaReceiptNumber,
        }, clientIP);
        return new Response(JSON.stringify({ status: "already_processed" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("origin")) },
        });
      }
    }

    // SECURITY: Verify amount matches order
    if (callbackAmount && callbackAmount !== order.amount) {
      await logAudit("webhook_amount_mismatch", "system", {
        order_number: order.order_number,
        expected: order.amount,
        received: callbackAmount,
      }, clientIP);

      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return new Response(JSON.stringify({ status: "amount_mismatch" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("origin")) },
      });
    }

    // Record payment
    const normalizedPhone = callbackPhone ? validatePhone(String(callbackPhone)) : order.customer_phone;

    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        order_id: order.id,
        amount: order.amount,
        phone_number: normalizedPhone || order.customer_phone,
        status: "verified",
        mpesa_transaction_id: mpesaReceiptNumber,
        provider_transaction_id: checkoutRequestId,
      });

    if (paymentError && paymentError.code !== "23505") {
      logError("webhook payment insert", paymentError);
    }

    // Update order to payment_confirmed
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "payment_confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("payment_status", "payment_verification");

    if (updateError) {
      logError("webhook order update", updateError);
    }

    await logAudit("payment_confirmed", "system", {
      order_number: order.order_number,
      order_id: order.id,
      receipt: mpesaReceiptNumber,
      amount: order.amount,
      phone: normalizedPhone || order.customer_phone,
    }, clientIP);

    // Trigger fulfillment
    await triggerFulfillment(order.id, order.order_number);

    return new Response(JSON.stringify({ status: "payment_confirmed" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("origin")) },
    });
  } catch (err) {
    logError("payment-webhook", err);
    // Always return 200 to prevent retries
    return new Response(JSON.stringify({ status: "error" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("origin")) },
    });
  }
});
