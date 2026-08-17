/**
 * CORS helpers for Supabase Edge Functions
 * Handles OPTIONS preflight and adds CORS headers to all responses
 */

const ALLOWED_ORIGINS = [
  '*', // Allow all origins (public API for mobile-data website)
];

const ALLOWED_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'authorization, content-type, apikey, x-admin-token';

/**
 * Returns CORS headers for responses
 */
export function corsHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };

  // If configured origin is '*', or origin matches allow list
  if (ALLOWED_ORIGINS.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

/**
 * allowCors(req) — returns CORS headers for OPTIONS and responses
 * If the request is an OPTIONS preflight, returns a full 204 Response.
 * Otherwise, returns the CORS header object to attach to responses.
 *
 * Usage:
 *   const corsResult = allowCors(req);
 *   if (corsResult instanceof Response) return corsResult; // preflight handled
 *   // ... build your response and spread: ...corsResult
 */
export function allowCors(req: Request): Response | Record<string, string> {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  return corsHeaders(origin);
}

/**
 * Handles OPTIONS preflight requests and returns appropriate response
 * Returns null if the request is not an OPTIONS request
 */
export function handleOption(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }
  return null;
}

/**
 * Adds CORS headers to a JSON response
 */
export function withCors(req: Request, body: unknown, status = 200): Response {
  const origin = req.headers.get('origin');
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}
