import { Exercise } from './exercise.model';
import { Session } from './session.model';
import { SessionExercise } from './session-exercise.model';
import { Set } from './set.model';
import { BodyweightEntry } from './bodyweight-entry.model';
import { GamificationState } from './gamification-state.model';
import { PREvent } from './pr-event.model';

/**
 * Current schema version for export/import compatibility.
 */
export const SCHEMA_VERSION = 2;

/**
 * Data container within ExportPayload.
 * Each field is an array of the respective entity type.
 */
export interface ExportData {
  /** All exercises */
  exercises: Exercise[];
  /** All sessions */
  sessions: Session[];
  /** All session-exercise links */
  sessionExercises: SessionExercise[];
  /** All sets */
  sets: Set[];
  /** All bodyweight entries */
  bodyweightEntries: BodyweightEntry[];
  /** Gamification state records (with id field) */
  gamificationState: (GamificationState & { id: string })[];
  /** PR events */
  prEvents: PREvent[];
  /** Food entries (placeholder for future use; always [] until implemented) */
  foodEntries: never[];
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

