/**
 * fulfillment/index.ts
 * Internal function called after payment is confirmed
 *
 * Responsibilities:
 * - Sends package to fulfillment system/API (placeholder for actual airtime/data API)
 * - If fulfillment API not configured (no TUMA_API_KEY), sets fulfillment_status to 'pending'
 * - If fulfillment succeeds: fulfillment_status → 'completed', order → 'completed'
 * - If fulfillment fails: fulfillment_status → 'failed', payment stays 'confirmed'
 * - Never lose customer's payment — if fulfillment fails, stays as 'Payment Confirmed – Fulfillment Pending'
 * - Idempotent: checks if already processed
 * - Logs all fulfillment attempts to audit_logs
 *
 * This function can be invoked:
 * 1. By the webhook handler after payment confirmation
 * 2. By the admin-orders PATCH endpoint (admin manual trigger)
 * 3. Via a cron/scheduled function for retries
 */

import { supabaseAdmin } from '../_shared/supabase.ts';
import { logError } from '../_shared/errors.ts';

interface FulfillmentRequest {
  order_id?: string;
  order_number?: string;
}

/**
 * Logs an action to audit_logs
 */
async function logAudit(action: string, details: Record<string, unknown>) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      actor: 'system',
      entity_type: 'fulfillment',
      details,
      ip_address: 'system',
    });
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}

/**
 * Attempts fulfillment via the TUMA API (or external data/airtime API)
 * Placeholder — will integrate with actual provider API
 */
async function attemptFulfillment(order: {
  id: string;
  order_number: string;
  customer_phone: string;
  package_name: string;
  amount: number;
}): Promise<{ success: boolean; reference?: string; error?: string }> {
  const tumaApiKey = Deno.env.get('TUMA_API_KEY');
  const tumaApiSecret = Deno.env.get('TUMA_API_SECRET');

  // If no API credentials configured, return failure (will be logged for admin)
  if (!tumaApiKey || !tumaApiSecret) {
    return {
      success: false,
      error: 'Fulfillment API not configured',
    };
  }

  try {
    // PLACEHOLDER: Replace with actual TUMA/data provider API call
    // Example structure:
    //
    // const response = await fetch('https://api.tuma.co.ke/v1/data/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${tumaApiKey}`,
    //     'X-API-Secret': tumaApiSecret,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     phone: order.customer_phone,
    //     package: order.package_name,
    //     amount: order.amount,
    //     reference: order.order_number,
    //   }),
    // });
    //
    // if (response.ok) {
    //   const data = await response.json();
    //   return { success: true, reference: data.reference };
    // }
    //
    // return { success: false, error: `API returned ${response.status}` };

    // For now, return that API is not configured
    return {
      success: false,
      error: 'Fulfillment API integration not yet implemented',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fulfillment API error',
    };
  }
}

Deno.serve(async (req: Request) => {
  try {
    // Parse request body
    let body: FulfillmentRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find the order
    let query = supabaseAdmin.from('orders').select('*');

    if (body.order_id) {
      query = query.eq('id', body.order_id);
    } else if (body.order_number) {
      query = query.eq('order_number', body.order_number);
    } else {
      return new Response(JSON.stringify({ error: 'order_id or order_number required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: order, error: orderError } = await query.maybeSingle();

    if (orderError || !order) {
      logError('fulfillment order lookup', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // IDEMPOTENCY CHECK: If fulfillment is already completed, don't re-process
    if (order.fulfillment_status === 'completed') {
      await logAudit('fulfillment_already_completed', {
        order_id: order.id,
        order_number: order.order_number,
      });
      return new Response(JSON.stringify({
        status: 'already_completed',
        order_number: order.order_number,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // SECURITY: Only fulfill orders with confirmed payment
    if (order.payment_status !== 'payment_confirmed') {
      await logAudit('fulfillment_rejected_not_paid', {
        order_id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
      });
      return new Response(JSON.stringify({
        error: 'Payment not confirmed. Cannot fulfill.',
        payment_status: order.payment_status,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If fulfillment is already 'processing', allow retry (could be a failed attempt)
    // If fulfillment is 'failed', allow retry
    // If fulfillment is 'pending', proceed

    // Update status to processing
    await supabaseAdmin
      .from('orders')
      .update({
        fulfillment_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // Attempt fulfillment
    const result = await attemptFulfillment({
      id: order.id,
      order_number: order.order_number,
      customer_phone: order.customer_phone,
      package_name: order.package_name,
      amount: order.amount,
    });

    if (result.success) {
      // Fulfillment succeeded
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          fulfillment_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) {
        logError('fulfillment success update', updateError);
      }

      await logAudit('fulfillment_completed', {
        order_id: order.id,
        order_number: order.order_number,
        reference: result.reference,
      });

      return new Response(JSON.stringify({
        status: 'completed',
        order_number: order.order_number,
        reference: result.reference,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Fulfillment failed — NEVER lose the payment
      // Order stays as: Payment Confirmed, Fulfillment Failed
      // Admin can manually retry or fulfill
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          fulfillment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) {
        logError('fulfillment failure update', updateError);
      }

      await logAudit('fulfillment_failed', {
        order_id: order.id,
        order_number: order.order_number,
        error: result.error,
        payment_status: 'payment_confirmed', // Payment still confirmed
      });

      return new Response(JSON.stringify({
        status: 'failed',
        order_number: order.order_number,
        error: 'Fulfillment failed. Admin review required.',
        payment_status: 'payment_confirmed', // Payment is NOT lost
      }), {
        status: 200, // 200 because the function executed successfully, fulfillment just failed
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    logError('fulfillment', err);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
