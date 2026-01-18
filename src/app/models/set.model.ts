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
}



