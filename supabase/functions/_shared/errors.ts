/**
 * Error handling utilities
 * SECURITY: Never expose technical errors (stack traces, DB errors) to client
 */

import { corsHeaders } from './cors.ts';

/**
 * Returns a safe JSON error response with CORS headers
 * Only generic, user-friendly messages are sent to client
 */
export function errorResponse(req: Request, message: string, status: number): Response {
  const origin = req.headers.get('origin');
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    }
  );
}

/**
 * Logs detailed error server-side (console only, never sent to client)
 */
export function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${timestamp}] ERROR [${context}]`);
  console.error(`  Message: ${message}`);
  if (stack) {
    console.error(`  Stack: ${stack}`);
  }
}

/**
 * Extracts a safe error message for logging
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Determines HTTP status from error type
 */
export function getErrorStatus(error: unknown): number {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('unauthorized') || msg.includes('invalid token')) return 401;
    if (msg.includes('forbidden')) return 403;
    if (msg.includes('not found')) return 404;
    if (msg.includes('rate limit')) return 429;
    if (msg.includes('validation') || msg.includes('invalid')) return 400;
  }
  return 500;
}
