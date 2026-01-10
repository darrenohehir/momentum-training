/**
 * Persistent gamification state.
 * MVP stores totalXp; level is computed.
 */
export interface GamificationState {
  /** Cumulative experience points earned */
  totalXp: number;
}

/**
 * Compute level from total XP.
 * Level = floor(totalXp / 1000) + 1
 */
export function computeLevel(totalXp: number): number {
  return Math.floor(totalXp / 1000) + 1;
}

