/**
 * Shared date/time utility functions.
 * Pure functions for formatting and parsing dates used across log entry pages.
 */

/**
 * Format a Date for HTML date input (YYYY-MM-DD).
 * Uses local date parts.
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date for HTML time input (HH:mm).
 * Uses local time parts.
 */
export function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Build an ISO 8601 timestamp string from separate date and time strings.
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:mm format
 * @returns ISO 8601 string (e.g., "2024-01-15T10:30:00.000Z")
 */
export function buildIsoFromDateAndTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return date.toISOString();
}

/**
 * Format an ISO timestamp for display (date portion).
 * Example output: "Sat, Jan 18"
 */
export function formatDisplayDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format an ISO timestamp for display (time portion).
 * Example output: "10:30 AM"
 */
export function formatDisplayTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Truncate text for display, adding ellipsis if needed.
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default 60)
 * @returns Truncated text with ellipsis, or original if within limit
 */
export function truncateText(text: string, maxLength = 60): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '…';
}
