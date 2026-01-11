/**
 * A Personal Record (PR) event.
 *
 * PRs are detected when a user exceeds their previous best weight for an exercise.
 * First attempts (no previous history) do NOT create PREvents - they establish a baseline.
 */
export interface PREvent {
  /** UUID v4 */
  id: string;
  /** Session where the PR was achieved */
  sessionId: string;
  /** Exercise that had the PR */
  exerciseId: string;
  /** Historical max weight (kg) - always > 0 */
  previousMax: number;
  /** New max weight (kg) - always > previousMax */
  newMax: number;
  /** ISO 8601 timestamp when PR was detected */
  detectedAt: string;
}

