import { Exercise } from './exercise.model';
import { Session } from './session.model';
import { SessionExercise } from './session-exercise.model';
import { Set } from './set.model';
import { BodyweightEntry } from './bodyweight-entry.model';
import { FoodEntry } from './food-entry.model';
import { GamificationState } from './gamification-state.model';
import { PREvent } from './pr-event.model';

/**
 * Current schema version for export/import compatibility.
 * Version 4: Added foodEntries table
 */
export const SCHEMA_VERSION = 4;

/**
 * Data container within ExportPayload.
 * Each field is an array of the respective entity type.
 *
 * Backward compatibility:
 * - Set may include optional cardio fields (kind, durationSec, distance, distanceUnit, incline).
 *   Missing fields are allowed; import and app treat missing kind as 'strength'.
 * - Exercise may include optional logType. Missing logType is treated as 'strength'.
 */
export interface ExportData {
  /** All exercises (may include optional logType) */
  exercises: Exercise[];
  /** All sessions */
  sessions: Session[];
  /** All session-exercise links */
  sessionExercises: SessionExercise[];
  /** All sets (may include optional kind, durationSec, distance, distanceUnit, incline) */
  sets: Set[];
  /** All bodyweight entries */
  bodyweightEntries: BodyweightEntry[];
  /** Gamification state records (with id field) */
  gamificationState: (GamificationState & { id: string })[];
  /** PR events */
  prEvents: PREvent[];
  /** Food entries */
  foodEntries: FoodEntry[];
}

/**
 * Complete data export payload for backup/restore.
 */
export interface ExportPayload {
  /** Schema version for migration compatibility */
  schemaVersion: number;
  /** ISO 8601 timestamp when export was created */
  exportedAt: string;
  /** All entity data */
  data: ExportData;
}

