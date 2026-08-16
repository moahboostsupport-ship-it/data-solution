/**
 * Time zone utilities for Africa/Nairobi
 * Critical for time-based package availability checks
 * Uses Intl.DateTimeFormat with timeZone: 'Africa/Nairobi'
 */

export interface TimePackage {
  start_time?: string | null;
  end_time?: string | null;
  active?: boolean;
}

/**
 * Returns the current time in Africa/Nairobi timezone
 * @returns Date object representing current Nairobi time
 */
export function getNairobiTime(): Date {
  const now = new Date();
  // Get Nairobi time components using Intl.DateTimeFormat
  const nairobiStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  // Parse the formatted string into a Date
  // Format from en-US with 2-digit options: "MM/DD/YYYY, HH:mm:SS"
  const [datePart, timePart] = nairobiStr.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');

  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
}

/**
 * Returns the current hour (0-23) in Africa/Nairobi timezone
 */
export function getNairobiHour(): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    hour: '2-digit',
    hour12: false,
  });
  const hourStr = formatter.format(new Date());
  return parseInt(hourStr, 10);
}

/**
 * Returns the current minutes (0-59) in Africa/Nairobi timezone
 */
export function getNairobiMinutes(): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    minute: '2-digit',
  });
  return parseInt(formatter.format(new Date()), 10);
}

/**
 * Returns the current time in minutes since midnight (0-1439) in Nairobi timezone
 */
export function getNairobiMinutesSinceMidnight(): number {
  const hour = getNairobiHour();
  const minute = getNairobiMinutes();
  return hour * 60 + minute;
}

/**
 * Converts a time string "HH:MM" to minutes since midnight
 * @param timeStr - time in "HH:MM" format (24-hour)
 * @returns minutes since midnight or null if invalid
 */
export function timeStringToMinutes(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

/**
 * Checks if a package is available based on current Nairobi time
 *
 * If start_time or end_time is null/empty, package is always available (no time restriction)
 * If both are set, checks if current Nairobi time falls within the window
 * Handles overnight windows (e.g., 22:00 to 06:00)
 *
 * @param pkg - package object with optional start_time and end_time
 * @returns true if package is available now
 */
export function isPackageAvailable(pkg: TimePackage): boolean {
  // If package is inactive, it's never available
  if (pkg.active === false) return false;

  // If no time restrictions, always available
  if (!pkg.start_time && !pkg.end_time) return true;
  if (!pkg.start_time || !pkg.end_time) return true; // Partial time = no restriction

  const startMinutes = timeStringToMinutes(pkg.start_time);
  const endMinutes = timeStringToMinutes(pkg.end_time);

  if (startMinutes === null || endMinutes === null) {
    // Invalid time format — be safe and allow (config issue, don't block customers)
    return true;
  }

  const currentMinutes = getNairobiMinutesSinceMidnight();

  // Handle overnight windows (e.g., start=22:00, end=06:00)
  if (startMinutes > endMinutes) {
    // Window crosses midnight
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Normal window (e.g., start=06:00, end=22:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Formats a date in Africa/Nairobi timezone
 * @param date - date to format
 * @param format - 'datetime' (default), 'date', or 'time'
 * @returns formatted date string
 */
export function formatNairobiTime(date: Date | string, format: 'datetime' | 'date' | 'time' = 'datetime'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions =
    format === 'date'
      ? { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }
      : format === 'time'
      ? { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hour12: true }
      : {
          timeZone: 'Africa/Nairobi',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        };

  return new Intl.DateTimeFormat('en-GB', options).format(d);
}

/**
 * Returns current Nairobi time as ISO-like string
 */
export function nairobiISOString(): string {
  return getNairobiTime().toISOString();
}
