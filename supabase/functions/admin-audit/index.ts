/**
 * admin-audit/index.ts
 * GET — list audit logs with pagination and filters
 *
 * Security:
 * - Requires admin JWT auth on EVERY request
 * - Supports filtering by action, entity_type, date range
 * - Pagination with configurable page size
 */

import { supabaseAdmin } from '../_shared/supabase.ts';
import { handleOption, corsHeaders } from '../_shared/cors.ts';
import { errorResponse, logError } from '../_shared/errors.ts';
import { verifyAdminToken } from '../_shared/auth.ts';
import { validatePagination, sanitizeInput } from '../_shared/validation.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const preflight = handleOption(req);
  if (preflight) return preflight;

  // Verify admin auth on EVERY request
  const authResult = await verifyAdminToken(req);
  if (!authResult.valid) {
    return errorResponse(req, 'Unauthorized', 401);
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    const url = new URL(req.url);
    const { page, limit } = validatePagination(
      url.searchParams.get('page'),
      url.searchParams.get('limit')
    );

    const action = sanitizeInput(url.searchParams.get('action'));
    const entityType = sanitizeInput(url.searchParams.get('entity_type'));
    const actor = sanitizeInput(url.searchParams.get('actor'));
    const dateFrom = sanitizeInput(url.searchParams.get('date_from'));
    const dateTo = sanitizeInput(url.searchParams.get('date_to'));

    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (action) {
      query = query.ilike('action', `%${action}%`);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (actor) {
      query = query.ilike('actor', `%${actor}%`);
    }

    // Date range filters
    if (dateFrom) {
      // Validate date format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
        query = query.gte('created_at', `${dateFrom}T00:00:00Z`);
      }
    }

    if (dateTo) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        query = query.lte('created_at', `${dateTo}T23:59:59Z`);
      }
    }

    // Pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      logError('admin-audit GET', error);
      return errorResponse(req, 'Unable to fetch audit logs', 500);
    }

    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({
        logs: logs || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
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
    logError('admin-audit', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
});
