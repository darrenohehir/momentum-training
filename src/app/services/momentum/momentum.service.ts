import { Injectable } from '@angular/core';
import { Session } from '../../models';

/**
 * Momentum status result.
 */
export interface MomentumStatus {
  /** Whether momentum is Active or Paused */
  status: 'Active' | 'Paused';

  /** Days remaining in the 7-day window (0-7). 0 means window has elapsed. */
  daysRemaining: number;

  /** Date of the last completed session (ISO string), or null if none */
  lastSessionDate: string | null;
}

/**
 * Service for calculating momentum status.
 *
 * Momentum is "Active" if the most recent completed session
 * is within the last 7 local calendar days.
 */
@Injectable({
  providedIn: 'root'
})
export class MomentumService {

  /**
   * Calculate momentum status based on completed sessions.
   *
   * @param sessions - Array of sessions (should include only completed sessions with endedAt)
   * @returns MomentumStatus with status, days remaining, and last session date
   */
  calculateMomentum(sessions: Session[]): MomentumStatus {
    // Filter to completed sessions only and sort by endedAt descending
    const completedSessions = sessions
      .filter(s => s.endedAt !== undefined)
      .sort((a, b) => {
        const aEnd = new Date(a.endedAt!).getTime();
        const bEnd = new Date(b.endedAt!).getTime();
        return bEnd - aEnd;
      });

    // No completed sessions = Paused with 0 days remaining
    if (completedSessions.length === 0) {
      return {
        status: 'Paused',
        daysRemaining: 0,
        lastSessionDate: null
      };
    }

    // Get the most recent completed session
    const lastSession = completedSessions[0];
    const lastSessionDate = lastSession.endedAt!;

    // Calculate days since last session using local calendar days
    const daysSinceLastSession = this.calculateDaysSince(lastSessionDate);

    // Momentum window is 7 days
    const MOMENTUM_WINDOW_DAYS = 7;

    if (daysSinceLastSession <= MOMENTUM_WINDOW_DAYS) {
      // Active: within the 7-day window
      const daysRemaining = MOMENTUM_WINDOW_DAYS - daysSinceLastSession;
      return {
        status: 'Active',
        daysRemaining,
        lastSessionDate
      };
    } else {
      // Paused: window has elapsed
      return {
        status: 'Paused',
        daysRemaining: 0,
        lastSessionDate
      };
    }
  }

  /**
   * Calculate the number of local calendar days since a given date.
   *
   * This uses local day boundaries, not a rolling 168-hour window.
   * - Same day = 0 days
   * - Yesterday = 1 day
   * - etc.
   *
   * @param isoDateString - ISO 8601 date string
   * @returns Number of days since the given date (0 = today)
   */
  private calculateDaysSince(isoDateString: string): number {
    const sessionDate = new Date(isoDateString);
    const today = new Date();

    // Reset times to start of day (local timezone) for accurate day comparison
    const sessionDay = new Date(
      sessionDate.getFullYear(),
      sessionDate.getMonth(),
      sessionDate.getDate()
    );
    const todayDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    // Calculate difference in milliseconds and convert to days
    const diffMs = todayDay.getTime() - sessionDay.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }
}



