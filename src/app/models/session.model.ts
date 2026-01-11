/**
 * Quest identifiers for session templates.
 */
export type QuestId =
  | 'quick'
  | 'full-body'
  | 'upper'
  | 'lower';

/**
 * A training session.
 */
export interface Session {
  /** UUID v4 */
  id: string;
  /** ISO 8601 timestamp when session began */
  startedAt: string;
  /** ISO 8601 timestamp when session ended (null if in progress) */
  endedAt?: string;
  /** Optional quest/template identifier */
  questId?: QuestId;
  /** Optional user notes */
  notes?: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
  /** True if XP has been awarded for this session (prevents double-awarding) */
  xpAwarded?: boolean;
}

