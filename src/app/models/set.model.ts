/**
 * Discriminator for set type. Missing/legacy sets are treated as strength.
 */
export type SetKind = 'strength' | 'cardio' | 'timed';

/**
 * A single set within a SessionExercise.
 */
export interface Set {
  /** UUID v4 */
  id: string;
  /** Reference to parent SessionExercise.id */
  sessionExerciseId: string;
  /** Order of this set within the exercise (0-based) */
  setIndex: number;
  /** Set type; omit for backward compatibility — treat as 'strength' when missing */
  kind?: SetKind;
  /** Weight in kilograms (optional for bodyweight exercises) */
  weight?: number;
  /** Number of repetitions */
  reps?: number;
  /** Rate of Perceived Exertion (1-10 scale, optional) */
  rpe?: number;
  /** Whether this is a warm-up set */
  isWarmup?: boolean;
  /** ISO 8601 timestamp */
  createdAt: string;
  // --- Optional cardio / timed fields ---
  /** Duration in seconds (cardio/timed) */
  durationSec?: number;
  /** Distance (cardio) */
  distance?: number;
  /** Distance unit */
  distanceUnit?: 'km' | 'mi';
  /** Treadmill incline as percentage (e.g. 5 = 5%) */
  incline?: number;
}



