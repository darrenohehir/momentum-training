/**
 * A food log entry.
 * Free-text, timestamp-based record of what was eaten/drank.
 * No calories, macros, or judgement.
 */
export interface FoodEntry {
  /** UUID v4 */
  id: string;
  /** Date of log as YYYY-MM-DD (local date, derived from loggedAt) */
  date: string;
  /** ISO 8601 timestamp when food was logged (source of truth for ordering) */
  loggedAt: string;
  /** Free-text description of what was eaten/drank */
  text: string;
  /** Optional note */
  note?: string;
  /** ISO 8601 timestamp when record was created */
  createdAt: string;
  /** ISO 8601 timestamp when record was last updated */
  updatedAt?: string;
}
