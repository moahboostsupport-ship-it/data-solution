/**
 * In-memory rate limiting (per IP)
 * Simple sliding window counter
 *
 * Note: This is per-instance — each Edge Function instance has its own state.
 * For production at scale, consider Redis or Supabase-backed rate limiting.
 */

interface RateBucket {
  count: number;
  windowStart: number;
}

// Map structure: key -> RateBucket
// Key format: `${ip}:${endpoint}`
const rateBuckets = new Map<string, RateBucket>();

// Last cleanup time
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes

/**
 * Checks if a request should be rate limited
 * @param ip - client IP address
 * @param endpoint - endpoint identifier (e.g., 'orders-create')
 * @param limit - max requests allowed in window
 * @param windowMs - time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  ip: string,
  endpoint: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const key = `${ip}:${endpoint}`;

  // Periodic cleanup of expired buckets
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupBuckets(now, windowMs);
    lastCleanup = now;
  }

  const bucket = rateBuckets.get(key);

  if (!bucket) {
    // First request — create new bucket
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  // Check if window has expired
  if (now - bucket.windowStart > windowMs) {
    // Reset window
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  // Within current window — check count
  if (bucket.count >= limit) {
    return false; // Rate limited
  }

  // Increment count
  bucket.count++;
  return true;
}

/**
 * Removes expired buckets to prevent memory leaks
 */
function cleanupBuckets(now: number, windowMs: number): void {
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.windowStart > windowMs) {
      rateBuckets.delete(key);
    }
  }
}

/**
 * Returns remaining requests for a key (for informational headers)
 */
export function getRemainingRequests(
  ip: string,
  endpoint: string,
  limit: number,
  windowMs: number
): number {
  const now = Date.now();
  const key = `${ip}:${endpoint}`;
  const bucket = rateBuckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    return limit;
  }

  return Math.max(0, limit - bucket.count);
}

/**
 * Resets rate limit for a specific key (admin override)
 */
export function resetRateLimit(ip: string, endpoint: string): void {
  rateBuckets.delete(`${ip}:${endpoint}`);
}
