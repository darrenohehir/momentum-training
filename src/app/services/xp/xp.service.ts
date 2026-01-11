import { Injectable } from '@angular/core';
import { Session } from '../../models';
import { DbService } from '../db';

/**
 * XP calculation constants.
 */
const XP_PER_SESSION = 100;
const XP_PER_SET = 5;

/**
 * Result of XP award calculation.
 */
export interface XpAwardResult {
  /** Total XP earned for this session */
  sessionXp: number;
  /** XP from completing the session */
  sessionCompletionXp: number;
  /** XP from sets logged */
  setXp: number;
  /** Number of sets counted */
  setCount: number;
  /** New total XP after awarding */
  newTotalXp: number;
}

/**
 * Service for managing XP calculations and awards.
 *
 * XP Rules:
 * - +100 XP per completed session
 * - +5 XP per set logged in that session
 * - XP is awarded only once per session (tracked via session.xpAwarded flag)
 */
@Injectable({
  providedIn: 'root'
})
export class XpService {
  constructor(private db: DbService) {}

  /**
   * Calculate XP for a completed session without awarding it.
   * Useful for preview or display purposes.
   *
   * @param sessionId - The session to calculate XP for
   * @returns XP breakdown, or null if session not found
   */
  async calculateSessionXp(sessionId: string): Promise<Omit<XpAwardResult, 'newTotalXp'> | null> {
    const session = await this.db.getSession(sessionId);
    if (!session) {
      return null;
    }

    const setCount = await this.db.countSetsForSession(sessionId);
    const sessionCompletionXp = XP_PER_SESSION;
    const setXp = setCount * XP_PER_SET;
    const sessionXp = sessionCompletionXp + setXp;

    return {
      sessionXp,
      sessionCompletionXp,
      setXp,
      setCount
    };
  }

  /**
   * Award XP for a completed session.
   *
   * This method:
   * 1. Checks if XP has already been awarded (via session.xpAwarded)
   * 2. Calculates XP (+100 for session, +5 per set)
   * 3. Adds XP to GamificationState
   * 4. Marks the session as xpAwarded
   *
   * XP is only awarded once per session - subsequent calls return null.
   *
   * @param sessionId - The session to award XP for
   * @returns XpAwardResult with breakdown, or null if already awarded/session not found
   */
  async awardSessionXp(sessionId: string): Promise<XpAwardResult | null> {
    // Load the session
    const session = await this.db.getSession(sessionId);
    if (!session) {
      console.error('[XpService] Session not found:', sessionId);
      return null;
    }

    // Check if session is completed
    if (!session.endedAt) {
      console.error('[XpService] Cannot award XP for incomplete session:', sessionId);
      return null;
    }

    // Check if XP has already been awarded
    if (session.xpAwarded) {
      // This is expected when editing completed sessions - not an error
      return null;
    }

    // Calculate XP
    const setCount = await this.db.countSetsForSession(sessionId);
    const sessionCompletionXp = XP_PER_SESSION;
    const setXp = setCount * XP_PER_SET;
    const sessionXp = sessionCompletionXp + setXp;

    // Add XP to GamificationState
    const newTotalXp = await this.db.addXp(sessionXp);

    // Mark session as xpAwarded
    const updatedSession: Session = {
      ...session,
      xpAwarded: true,
      updatedAt: new Date().toISOString()
    };
    await this.db.updateSession(updatedSession);

    return {
      sessionXp,
      sessionCompletionXp,
      setXp,
      setCount,
      newTotalXp
    };
  }
}

