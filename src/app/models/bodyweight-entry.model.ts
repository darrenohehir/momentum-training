/**
 * A bodyweight log entry.
 */
export interface BodyweightEntry {
  /** UUID v4 */
  id: string;
  /** Date of measurement as YYYY-MM-DD (local date, derived from loggedAt) */
  date: string;
  /** ISO 8601 timestamp when measurement was taken (source of truth for ordering) */
  loggedAt: string;
  /** Body weight in kilograms */
  weightKg: number;
  /** Optional note */
  note?: string;
  /** ISO 8601 timestamp when record was created */
  createdAt: string;
  /** ISO 8601 timestamp when record was last updated */
  updatedAt?: string;
}

/**
 * Derive YYYY-MM-DD local date string from an ISO timestamp.
 */
export function deriveLocalDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
