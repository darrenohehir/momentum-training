import { Injectable } from '@angular/core';
import { Session, PREvent } from '../../models';
import { DbService } from '../db';
import { PrService } from '../pr';

/**
 * XP calculation constants.
 */
const XP_PER_SESSION = 100;
const XP_PER_SET = 5;
const XP_PER_PR = 50;
const MAX_PR_XP_COUNT = 3; // Cap at 3 PRs for XP purposes

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
  /** XP from PRs (0 if none) */
  prXp: number;
  /** Number of PRs detected (may be more than MAX_PR_XP_COUNT) */
  prCount: number;
  /** The PR events detected (may be more than MAX_PR_XP_COUNT) */
  prs: PREvent[];
  /** New total XP after awarding */
  newTotalXp: number;
}

/**
 * Service for managing XP calculations and awards.
 *
 * XP Rules:
 * - +100 XP per completed session
 * - +5 XP per set logged in that session
 * - +50 XP per PR detected (cap at 3 PRs = 150 XP max from PRs)
 * - XP is awarded only once per session (tracked via session.xpAwarded flag)
 */
@Injectable({
  providedIn: 'root'
})
export class XpService {
  constructor(
    private db: DbService,
    private prService: PrService
  ) {}

  /**
   * Calculate XP for a completed session without awarding it.
   * Useful for preview or display purposes.
   * Note: This does NOT include PR XP as PRs are detected during awarding.
   *
   * @param sessionId - The session to calculate XP for
   * @returns XP breakdown (without PRs), or null if session not found
   */
  async calculateSessionXp(sessionId: string): Promise<Omit<XpAwardResult, 'newTotalXp' | 'prXp' | 'prCount' | 'prs'> | null> {
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
   * 2. Detects PRs for the session (idempotent via PrService)
   * 3. Calculates XP (+100 for session, +5 per set, +50 per PR up to 3)
   * 4. Adds XP to GamificationState
   * 5. Marks the session as xpAwarded
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

    // Detect PRs (this is idempotent - if already detected, returns existing)
    const prs = await this.prService.detectSessionPRs(sessionId);
    const prCount = prs.length;
    // Cap PR XP at MAX_PR_XP_COUNT PRs
    const prXpCount = Math.min(prCount, MAX_PR_XP_COUNT);
    const prXp = prXpCount * XP_PER_PR;

    // Calculate base XP
    const setCount = await this.db.countSetsForSession(sessionId);
    const sessionCompletionXp = XP_PER_SESSION;
    const setXp = setCount * XP_PER_SET;

    // Total session XP = base + PRs
    const sessionXp = sessionCompletionXp + setXp + prXp;

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
      prXp,
      prCount,
      prs,
      newTotalXp
    };
  }
}
