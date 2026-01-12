import { Injectable } from '@angular/core';
import { PREvent } from '../../models';
import { DbService } from '../db';
import { generateUUID } from '../../utils';

/**
 * Service for detecting and managing Personal Records (PRs).
 *
 * PR Rules:
 * - A PR is detected only when a user exceeds their previous best weight for an exercise
 * - First attempts (no previous history) establish a baseline, NOT a PR
 * - PRs require strictly greater weight (not equal)
 * - Detection is idempotent: if PRs already exist for a session, return them
 */
@Injectable({
  providedIn: 'root'
})
export class PrService {
  constructor(private db: DbService) {}

  /**
   * Detect PRs for a completed session.
   *
   * This method is idempotent: if PREvents already exist for the session,
   * they are returned without re-detecting.
   *
   * Detection algorithm:
   * 1. Check if PREvents already exist for session (idempotency)
   * 2. For each exercise in session:
   *    - Get current max weight (filter: weight > 0)
   *    - Get historical max weight (completed sessions only, exclude current)
   *    - If historicalMax > 0 AND currentMax > historicalMax: create PREvent
   * 3. Store and return detected PREvents
   *
   * @param sessionId - The session to detect PRs for
   * @returns Array of PREvents (may be empty if no PRs or first attempts)
   */
  async detectSessionPRs(sessionId: string): Promise<PREvent[]> {
    // Step 1: Idempotency check - if PRs already exist, return them
    const existingPRs = await this.db.getPREventsForSession(sessionId);
    if (existingPRs.length > 0) {
      return existingPRs;
    }

    // Step 2: Get all exercises in this session
    const sessionExercises = await this.db.getSessionExercises(sessionId);
    if (sessionExercises.length === 0) {
      return [];
    }

    const detectedPRs: PREvent[] = [];
    const now = new Date().toISOString();

    // Step 3: Check each exercise for PRs
    for (const se of sessionExercises) {
      const exerciseId = se.exerciseId;

      // Get current max weight for this exercise in this session
      const currentMax = await this.getCurrentMaxWeight(exerciseId, sessionId);
      if (currentMax === null) {
        // No valid weights in current session, skip
        continue;
      }

      // Get historical max weight (from completed sessions, excluding current)
      const historicalMax = await this.getHistoricalMaxWeight(exerciseId, sessionId);
      if (historicalMax === null) {
        // No previous history - this is a baseline, not a PR
        continue;
      }

      // PR condition: both must be true
      // - historicalMax > 0 (already guaranteed by getHistoricalMaxWeight)
      // - currentMax > historicalMax (strictly greater)
      if (currentMax > historicalMax) {
        const prEvent: PREvent = {
          id: generateUUID(),
          sessionId,
          exerciseId,
          previousMax: historicalMax,
          newMax: currentMax,
          detectedAt: now
        };
        detectedPRs.push(prEvent);
      }
    }

    // Step 4: Store detected PRs
    if (detectedPRs.length > 0) {
      await this.db.addPREvents(detectedPRs);
    }

    return detectedPRs;
  }

  /**
   * Get the maximum weight for an exercise in a specific session.
   * Only considers sets with valid weights (weight > 0).
   *
   * @param exerciseId - The exercise to check
   * @param sessionId - The session to check
   * @returns Maximum weight, or null if no valid weights
   */
  async getCurrentMaxWeight(exerciseId: string, sessionId: string): Promise<number | null> {
    const sets = await this.db.getSetsForExerciseInSession(exerciseId, sessionId);

    if (sets.length === 0) {
      return null;
    }

    // Find max weight (sets are already filtered to weight > 0 by DbService)
    const maxWeight = Math.max(...sets.map(s => s.weight!));
    return maxWeight;
  }

  /**
   * Get the historical maximum weight for an exercise.
   * Only considers completed sessions (endedAt exists), excluding the specified session.
   *
   * @param exerciseId - The exercise to check
   * @param excludeSessionId - Session to exclude (usually current session)
   * @returns Maximum weight, or null if no history exists
   */
  async getHistoricalMaxWeight(
    exerciseId: string,
    excludeSessionId: string
  ): Promise<number | null> {
    const historicalSets = await this.db.getHistoricalSetsForExercise(
      exerciseId,
      excludeSessionId
    );

    if (historicalSets.length === 0) {
      return null;
    }

    // Find max weight (sets are already filtered to weight > 0 by DbService)
    const maxWeight = Math.max(...historicalSets.map(s => s.weight!));
    return maxWeight;
  }

  /**
   * Get PRs for a specific session.
   * Simple wrapper around DbService for convenience.
   *
   * @param sessionId - The session to get PRs for
   */
  async getPRsForSession(sessionId: string): Promise<PREvent[]> {
    return this.db.getPREventsForSession(sessionId);
  }
}

