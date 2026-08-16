/**
 * Admin authentication utilities
 * JWT creation/verification, password hashing using Web Crypto API
 */

const ADMIN_JWT_SECRET = Deno.env.get('ADMIN_JWT_SECRET') ?? '';

if (!ADMIN_JWT_SECRET) {
  console.error('FATAL: ADMIN_JWT_SECRET is not set. Admin auth will not work.');
}

/**
 * Encodes a string to Uint8Array
 */
function textEncode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Decodes a Uint8Array to string
 */
function textDecode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Base64url encode (for JWT)
 */
function base64urlEncode(bytes: Uint8Array): string {
  const binary = btoa(String.fromCharCode(...bytes));
  return binary.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64url decode (for JWT)
 */
function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const base64 = pad ? padded + '='.repeat(4 - pad) : padded;
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Creates a HMAC-SHA256 signature using Web Crypto API
 */
async function hmacSign(data: string, secret: string): Promise<string> {
  const keyData = textEncode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, textEncode(data));
  return base64urlEncode(new Uint8Array(signature));
}

/**
 * Verifies a HMAC-SHA256 signature (constant-time comparison)
 */
async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await hmacSign(data, secret);
  if (expectedSignature.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

export interface AdminTokenPayload {
  email: string;
  iat: number;
  exp: number;
}

/**
 * Creates an admin JWT token (HS256, 8-hour expiry)
 * @param email - admin email
 * @returns JWT token string
 */
export async function createAdminToken(email: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = {
    email,
    iat: now,
    exp: now + 8 * 60 * 60, // 8 hour expiry
  };

  const headerB64 = base64urlEncode(textEncode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(textEncode(JSON.stringify(payload)));
  const data = `${headerB64}.${payloadB64}`;
  const signature = await hmacSign(data, ADMIN_JWT_SECRET);

  return `${data}.${signature}`;
}

export interface VerifyResult {
  valid: boolean;
  email?: string;
  reason?: string;
}

/**
 * Verifies an admin JWT token from the x-admin-token header
 * @param req - the incoming request
 * @returns {valid, email} — whether token is valid and the admin email
 */
export async function verifyAdminToken(req: Request): Promise<VerifyResult> {
  const token = req.headers.get('x-admin-token');
  if (!token) {
    return { valid: false, reason: 'No admin token provided' };
  }

  if (!ADMIN_JWT_SECRET) {
    console.error('Cannot verify admin token: ADMIN_JWT_SECRET not set');
    return { valid: false, reason: 'Server configuration error' };
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid token format' };
    }

    const [headerB64, payloadB64, signature] = parts;
    const data = `${headerB64}.${payloadB64}`;

    // Verify signature
    const isValid = await hmacVerify(data, signature, ADMIN_JWT_SECRET);
    if (!isValid) {
      return { valid: false, reason: 'Invalid signature' };
    }

    // Decode payload
    const payloadBytes = base64urlDecode(payloadB64);
    const payload = JSON.parse(textDecode(payloadBytes)) as AdminTokenPayload;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, reason: 'Token expired' };
    }

    if (!payload.email) {
      return { valid: false, reason: 'Invalid token payload' };
    }

    return { valid: true, email: payload.email };
  } catch (err) {
    console.error('Token verification error:', err);
    return { valid: false, reason: 'Token verification failed' };
  }
}

/**
 * Generates a random salt as hex string
 */
async function generateSalt(length = 16): Promise<string> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes a password using SHA-256 with a random salt
 * Format: salt:hash (both hex strings)
 * @param password - plain text password
 * @returns hashed password string "salt:hash"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await generateSalt(16);
  const hashInput = salt + password;
  const hashBytes = await crypto.subtle.digest('SHA-256', textEncode(hashInput));
  const hash = Array.from(new Uint8Array(hashBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 * @param password - plain text password to verify
 * @param storedHash - stored hash in format "salt:hash"
 * @returns true if password matches
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;

    const hashInput = salt + password;
    const hashBytes = await crypto.subtle.digest('SHA-256', textEncode(hashInput));
    const computedHash = Array.from(new Uint8Array(hashBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (computedHash.length !== hash.length) return false;
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result |= computedHash.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    return result === 0;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}
