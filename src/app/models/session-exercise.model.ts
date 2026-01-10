/**
 * An exercise performed within a session.
 * Links a Session to an Exercise with ordering.
 */
export interface SessionExercise {
  /** UUID v4 */
  id: string;
  /** Reference to parent Session.id */
  sessionId: string;
  /** Reference to Exercise.id */
  exerciseId: string;
  /** Order of this exercise within the session (0-based) */
  orderIndex: number;
  /** Optional user notes for this exercise in this session */
  notes?: string;
}

