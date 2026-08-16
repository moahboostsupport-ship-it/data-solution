/**
 * Supabase client factory
 * Creates admin (service role) and anon (public) clients
 * SECURITY: The service role client bypasses RLS — NEVER expose it to the frontend
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

if (!SUPABASE_URL) {
  console.error('FATAL: SUPABASE_URL is not set');
}

if (!SERVICE_ROLE_KEY) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY is not set');
}

if (!ANON_KEY) {
  console.error('WARNING: SUPABASE_ANON_KEY is not set');
}

/**
 * Admin Supabase client — uses service role key
 * Bypasses Row Level Security (RLS)
 * ONLY use server-side, NEVER expose to frontend
 */
export function getSupabaseAdmin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Public Supabase client — uses anon key
 * Subject to Row Level Security (RLS) policies
 */
export function getSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Default singleton clients (created at import time)
 * Re-use these to avoid creating new clients on every request
 */
export const supabaseAdmin = getSupabaseAdmin();
export const supabaseClient = getSupabaseClient();
