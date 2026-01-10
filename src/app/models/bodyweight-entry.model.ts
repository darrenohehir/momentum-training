/**
 * A bodyweight log entry.
 */
export interface BodyweightEntry {
  /** UUID v4 */
  id: string;
  /** Date of measurement as YYYY-MM-DD (local date, not timestamp) */
  date: string;
  /** Body weight in kilograms */
  weightKg: number;
  /** Optional note */
  note?: string;
  /** ISO 8601 timestamp */
  createdAt: string;
}

