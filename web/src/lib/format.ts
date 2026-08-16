// ===== Format utilities =====

/**
 * Format a number as Kenyan Shillings.
 * Example: 55 -> "KSh 55"
 */
export function formatCurrency(amount: number): string {
  return `KSh ${amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

/**
 * Format a phone number to international 2547XXXXXXXX format.
 * Handles inputs like 0798507804, 254798507804, +254798507804, 798507804.
 */
export function formatPhone(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Handle +254 prefix
  if (digits.startsWith('254') && digits.length >= 12) {
    digits = digits.substring(3);
  }

  // Handle 254 prefix without +
  if (digits.startsWith('254') && digits.length >= 12) {
    digits = digits.substring(3);
  }

  // Remove leading 0 if present
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  return `254${digits}`;
}

/**
 * Validate that a phone number is a valid Safaricom number.
 * Accepts formats: 07XXXXXXXX or 2547XXXXXXXX
 * Returns true for valid Safaricom numbers.
 */
export function validateSafaricomPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');

  // Strip 254 prefix
  let local = digits;
  if (local.startsWith('254')) {
    local = local.substring(3);
  }
  // Strip leading 0
  if (local.startsWith('0')) {
    local = local.substring(1);
  }

  // Safaricom numbers start with 7 (prefixes 7xx) — 9 digits after removing prefix
  return /^7\d{8}$/.test(local);
}

/**
 * Format a time string or Date for display.
 * Example: "2024-01-15T14:30:00Z" -> "15 Jan 2024, 2:30 PM"
 */
export function formatTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  return date.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
