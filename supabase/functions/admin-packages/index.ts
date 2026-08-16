/**
 * admin-packages/index.ts
 * Admin package management endpoint
 *
 * GET — list all packages (including inactive)
 * POST — create new package
 * PUT — update existing package
 * DELETE — soft-disable (set active=false) or hard delete
 *
 * Security:
 * - Requires admin JWT auth on EVERY request
 * - All changes logged to audit_logs
 * - Input validation on all fields
 */

import { supabaseAdmin } from '../_shared/supabase.ts';
import { handleOption, corsHeaders } from '../_shared/cors.ts';
import { errorResponse, logError } from '../_shared/errors.ts';
import { verifyAdminToken } from '../_shared/auth.ts';
import { validatePagination, sanitizeInput, validateUUID, validateAmount, getClientIP } from '../_shared/validation.ts';
import { logAuditAdmin } from '../_shared/audit.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const preflight = handleOption(req);
  if (preflight) return preflight;

  // Verify admin auth on EVERY request
  const authResult = await verifyAdminToken(req);
  if (!authResult.valid) {
    return errorResponse(req, 'Unauthorized', 401);
  }

  const adminEmail = authResult.email!;
  const clientIP = getClientIP(req);

  switch (req.method) {
    case 'GET':
      return handleGetPackages(req, adminEmail, clientIP);
    case 'POST':
      return handleCreatePackage(req, adminEmail, clientIP);
    case 'PUT':
      return handleUpdatePackage(req, adminEmail, clientIP);
    case 'DELETE':
      return handleDeletePackage(req, adminEmail, clientIP);
    default:
      return errorResponse(req, 'Method not allowed', 405);
  }
});

/**
 * GET — list all packages (including inactive)
 */
async function handleGetPackages(req: Request, _adminEmail: string, _clientIP: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const { page, limit } = validatePagination(
      url.searchParams.get('page'),
      url.searchParams.get('limit')
    );
    const category = sanitizeInput(url.searchParams.get('category'));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('packages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: packages, error, count } = await query;

    if (error) {
      logError('admin-packages GET', error);
      return errorResponse(req, 'Unable to fetch packages', 500);
    }

    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({
        packages: packages || [],
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
    logError('admin-packages GET', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
}

/**
 * POST — create new package
 */
async function handleCreatePackage(req: Request, adminEmail: string, clientIP: string): Promise<Response> {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse(req, 'Invalid request body', 400);
    }

    // Validate required fields
    const name = sanitizeInput(body.name);
    const category = sanitizeInput(body.category);
    const description = sanitizeInput(body.description);

    if (!name) return errorResponse(req, 'Package name is required', 400);
    if (!category) return errorResponse(req, 'Category is required', 400);

    // Validate price
    if (!validateAmount(body.price)) {
      return errorResponse(req, 'Invalid price', 400);
    }
    const price = typeof body.price === 'string' ? parseInt(body.price, 10) : body.price as number;

    // Validate optional fields
    const validity = sanitizeInput(body.validity) || null;
    const featured = body.featured === true;
    const active = body.active !== false; // Default to true
    const purchaseFrequency = sanitizeInput(body.purchase_frequency) || null;
    const startTime = sanitizeInput(body.start_time) || null;
    const endTime = sanitizeInput(body.end_time) || null;

    // Validate time format if provided
    if ((startTime && !endTime) || (!startTime && endTime)) {
      return errorResponse(req, 'Both start_time and end_time must be provided together', 400);
    }

    // Insert package
    const { data: pkg, error } = await supabaseAdmin
      .from('packages')
      .insert({
        name,
        category,
        price,
        description,
        validity,
        active,
        featured,
        purchase_frequency: purchaseFrequency,
        start_time: startTime,
        end_time: endTime,
      })
      .select()
      .single();

    if (error) {
      logError('admin-packages POST', error);
      return errorResponse(req, 'Failed to create package', 500);
    }

    // Log to audit
    await logAuditAdmin('package_created', adminEmail, 'package', pkg.id, {
      name,
      category,
      price,
    }, clientIP);

    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({ package: pkg }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  } catch (err) {
    logError('admin-packages POST', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
}

/**
 * PUT — update existing package
 */
async function handleUpdatePackage(req: Request, adminEmail: string, clientIP: string): Promise<Response> {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse(req, 'Invalid request body', 400);
    }

    const packageId = sanitizeInput(body.id);
    if (!packageId || !validateUUID(packageId)) {
      return errorResponse(req, 'Invalid package ID', 400);
    }

    // Fetch existing package for audit
    const { data: existingPkg, error: fetchError } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .maybeSingle();

    if (fetchError || !existingPkg) {
      return errorResponse(req, 'Package not found', 404);
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) {
      const name = sanitizeInput(body.name);
      if (!name) return errorResponse(req, 'Name cannot be empty', 400);
      updateData.name = name;
    }

    if (body.category !== undefined) {
      const category = sanitizeInput(body.category);
      if (!category) return errorResponse(req, 'Category cannot be empty', 400);
      updateData.category = category;
    }

    if (body.price !== undefined) {
      if (!validateAmount(body.price)) return errorResponse(req, 'Invalid price', 400);
      updateData.price = typeof body.price === 'string' ? parseInt(body.price, 10) : body.price as number;
    }

    if (body.description !== undefined) {
      updateData.description = sanitizeInput(body.description) || null;
    }

    if (body.validity !== undefined) {
      updateData.validity = sanitizeInput(body.validity) || null;
    }

    if (body.active !== undefined) {
      updateData.active = body.active === true;
    }

    if (body.featured !== undefined) {
      updateData.featured = body.featured === true;
    }

    if (body.purchase_frequency !== undefined) {
      updateData.purchase_frequency = sanitizeInput(body.purchase_frequency) || null;
    }

    if (body.start_time !== undefined) {
      updateData.start_time = sanitizeInput(body.start_time) || null;
    }

    if (body.end_time !== undefined) {
      updateData.end_time = sanitizeInput(body.end_time) || null;
    }

    // Validate time pair
    const newStartTime = (updateData.start_time !== undefined ? updateData.start_time : existingPkg.start_time) as string | null;
    const newEndTime = (updateData.end_time !== undefined ? updateData.end_time : existingPkg.end_time) as string | null;

    if ((newStartTime && !newEndTime) || (!newStartTime && newEndTime)) {
      return errorResponse(req, 'Both start_time and end_time must be provided together', 400);
    }

    // Update package
    const { data: pkg, error } = await supabaseAdmin
      .from('packages')
      .update(updateData)
      .eq('id', packageId)
      .select()
      .single();

    if (error) {
      logError('admin-packages PUT', error);
      return errorResponse(req, 'Failed to update package', 500);
    }

    // Log to audit with changes
    await logAuditAdmin('package_updated', adminEmail, 'package', packageId, {
      previous: existingPkg,
      updated: pkg,
    }, clientIP);

    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({ package: pkg }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  } catch (err) {
    logError('admin-packages PUT', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
}

/**
 * DELETE — soft-disable (set active=false) or hard delete
 * Default: soft-disable. Use ?hard=true for hard delete.
 */
async function handleDeletePackage(req: Request, adminEmail: string, clientIP: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const packageId = sanitizeInput(url.searchParams.get('id'));
    const hardDelete = url.searchParams.get('hard') === 'true';

    if (!packageId || !validateUUID(packageId)) {
      return errorResponse(req, 'Invalid package ID', 400);
    }

    // Fetch existing package
    const { data: existingPkg, error: fetchError } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .maybeSingle();

    if (fetchError || !existingPkg) {
      return errorResponse(req, 'Package not found', 404);
    }

    if (hardDelete) {
      // Hard delete — use with caution
      const { error } = await supabaseAdmin
        .from('packages')
        .delete()
        .eq('id', packageId);

      if (error) {
        logError('admin-packages DELETE', error);
        return errorResponse(req, 'Failed to delete package', 500);
      }

      await logAuditAdmin('package_deleted', adminEmail, 'package', packageId, {
        deleted_package: existingPkg,
      }, clientIP);
    } else {
      // Soft disable — set active=false
      const { error } = await supabaseAdmin
        .from('packages')
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', packageId);

      if (error) {
        logError('admin-packages soft disable', error);
        return errorResponse(req, 'Failed to disable package', 500);
      }

      await logAuditAdmin('package_disabled', adminEmail, 'package', packageId, {
        previous_name: existingPkg.name,
      }, clientIP);
    }

    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({
        id: packageId,
        action: hardDelete ? 'deleted' : 'disabled',
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
    logError('admin-packages DELETE', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
}
