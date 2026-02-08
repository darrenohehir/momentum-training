/**
 * How an exercise is logged (which editor to use). Omit = strength for backward compatibility.
 */
export type ExerciseLogType = 'strength' | 'cardio' | 'timed';

/**
 * Exercise category for grouping and filtering.
 */
export type ExerciseCategory =
  | 'full-body'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'cardio'
  | 'other';

/**
 * Equipment type used for the exercise.
 */
export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'cardio'
  | 'other';

/**
 * An exercise in the library.
 */
export interface Exercise {
  /** UUID v4 */
  id: string;
  /** Exercise name (e.g. "Bench Press") */
  name: string;
  /** Muscle group category */
  category: ExerciseCategory;
  /** Equipment used */
  equipmentType: EquipmentType;
  /** How this exercise is logged (strength / cardio / timed). Omit → treat as strength. */
  logType?: ExerciseLogType;
  /** Optional user notes */
  notes?: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}



