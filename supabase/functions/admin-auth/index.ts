/**
 * admin-auth/index.ts
 * POST /login — admin login with email/password
 *
 * Security:
 * - Rate limited: 5 attempts per minute per IP
 * - Password verified server-side using SHA-256 + salt
 * - JWT token created with 8-hour expiry
 * - All login attempts logged to audit_logs (success and failure)
 * - No registration endpoint — admins created via DB/migration only
 */

import { supabaseAdmin } from '../_shared/supabase.ts';
import { handleOption, corsHeaders } from '../_shared/cors.ts';
import { errorResponse, logError } from '../_shared/errors.ts';
import { verifyPassword, createAdminToken } from '../_shared/auth.ts';
import { validateEmail, sanitizeInput, getClientIP } from '../_shared/validation.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

interface LoginBody {
  email?: string;
  password?: string;
}

/**
 * Logs an action to audit_logs
 */
async function logAudit(action: string, actor: string, details: Record<string, unknown>, ipAddress: string) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      actor,
      entity_type: 'admin_auth',
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

  // Rate limiting: 5 login attempts per minute per IP
  if (!checkRateLimit(clientIP, 'admin-auth-login', 5, 60 * 1000)) {
    return errorResponse(req, 'Too many login attempts. Please try again later.', 429);
  }

  try {
    let body: LoginBody;
    try {
      body = await req.json();
    } catch {
      return errorResponse(req, 'Invalid request body', 400);
    }

    // Validate email
    const email = sanitizeInput(body.email).toLowerCase();
    if (!email || !validateEmail(email)) {
      return errorResponse(req, 'Invalid email or password', 400);
    }

    // Validate password (basic check — don't reveal password rules)
    const password = body.password;
    if (!password || typeof password !== 'string' || password.length < 1) {
      return errorResponse(req, 'Invalid email or password', 400);
    }

    // Fetch admin user from database
    const { data: adminUser, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, password_hash')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      logError('admin-auth query', error);
      return errorResponse(req, 'Authentication failed', 500);
    }

    // SECURITY: Use same error message whether user doesn't exist or password is wrong
    // This prevents user enumeration
    if (!adminUser) {
      await logAudit('admin_login_failed', 'unknown', {
        email,
        reason: 'user_not_found',
      }, clientIP);
      return errorResponse(req, 'Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, adminUser.password_hash);

    if (!isPasswordValid) {
      await logAudit('admin_login_failed', 'unknown', {
        email,
        reason: 'invalid_password',
      }, clientIP);
      return errorResponse(req, 'Invalid email or password', 401);
    }

    // Create JWT token
    const token = await createAdminToken(adminUser.email);

    // Log successful login
    await logAudit('admin_login_success', adminUser.email, {
      email: adminUser.email,
    }, clientIP);

    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({
        token,
        email: adminUser.email,
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
    logError('admin-auth', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
});
