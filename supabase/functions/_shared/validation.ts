/**
 * Input validation and sanitization utilities
 * All user inputs must be validated before processing
 */

/**
 * Validates and normalizes a Kenyan Safaricom phone number to 2547XXXXXXXX format
 * Accepts: 0712345678, +254712345678, 254712345678, 712345678
 * @returns normalized number or null if invalid
 */
export function validatePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;

  // Remove all whitespace, dashes, parentheses
  let cleaned = phone.trim().replace(/[\s\-()]/g, '');

  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // Handle different input formats
  if (cleaned.startsWith('254')) {
    // Already in 254 format: 2547XXXXXXXX or 2541XXXXXXXX
    // Should be 12 digits total: 254 + 9 digits
    if (cleaned.length === 12 && /^254[17]\d{8}$/.test(cleaned)) {
      return cleaned;
    }
    return null;
  }

  if (cleaned.startsWith('0')) {
    // Local format: 07XXXXXXXX or 01XXXXXXXX
    // Convert to 254 + remaining 9 digits
    const rest = cleaned.slice(1); // Remove leading 0
    if (rest.length === 9 && /^[17]\d{8}$/.test(rest)) {
      return '254' + rest;
    }
    return null;
  }

  if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    // Bare number: 7XXXXXXXX or 1XXXXXXXX (9 digits)
    if (cleaned.length === 9 && /^[17]\d{8}$/.test(cleaned)) {
      return '254' + cleaned;
    }
    return null;
  }

  return null;
}

/**
 * Validates that an amount is a positive integer
 * @returns true if valid
 */
export function validateAmount(amount: unknown): boolean {
  if (typeof amount !== 'number' && typeof amount !== 'string') return false;
  const num = typeof amount === 'string' ? parseInt(amount, 10) : amount;
  return Number.isInteger(num) && num > 0;
}

/**
 * Validates order number format: DS-YYYYMMDD-XXXXX
 * @returns true if valid format
 */
export function validateOrderNumber(orderNumber: string): boolean {
  if (!orderNumber || typeof orderNumber !== 'string') return false;
  // Format: DS-YYYYMMDD-XXXXX (e.g., DS-20240101-00001)
  return /^DS-\d{8}-\d{5}$/.test(orderNumber.trim());
}

/**
 * Basic input sanitization — removes control characters and trims
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  // Remove control characters (except newlines), trim whitespace
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Validates an email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 simplified pattern
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
    email.trim().toLowerCase()
  );
}

/**
 * Validates a UUID v4 format
 */
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid.trim());
}

/**
 * Validates pagination parameters
 */
export function validatePagination(page: unknown, limit: unknown): { page: number; limit: number } {
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : typeof page === 'number' ? page : 1;
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : typeof limit === 'number' ? limit : 20;

  return {
    page: pageNum > 0 ? Math.floor(pageNum) : 1,
    limit: limitNum > 0 && limitNum <= 100 ? Math.floor(limitNum) : 20,
  };
}

/**
 * Extracts client IP from request headers (best effort)
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
