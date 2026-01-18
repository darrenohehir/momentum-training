import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import {
  Exercise,
  Session,
  SessionExercise,
  Set,
  BodyweightEntry,
  GamificationState,
  PREvent,
  SCHEMA_VERSION,
  ExportData
} from '../../models';

/**
 * Result of a last attempt query for Ghost Mode.
 * Contains the previous session exercise and its sets.
 */
export interface LastAttemptResult {
  /** The SessionExercise from the previous completed session */
  sessionExercise: SessionExercise;
  /** The Session the attempt belongs to (for date display) */
  session: Session;
  /** All sets from that attempt, ordered by setIndex ascending */
  sets: Set[];
}

/**
 * Database name for IndexedDB.
 */
export const DB_NAME = 'MomentumDB';

/**
 * Current database schema version.
 * This should stay in sync with SCHEMA_VERSION from models for export/import compatibility.
 * Increment when schema changes require migration.
 */
export const DB_VERSION = SCHEMA_VERSION;

/**
 * Core database service using Dexie for IndexedDB persistence.
 *
 * Stores:
 * - exercises: Exercise library
 * - sessions: Training sessions
 * - sessionExercises: Links sessions to exercises with ordering
 * - sets: Individual sets within session exercises
 * - bodyweightEntries: Bodyweight log
 * - gamificationState: XP tracking (single record)
 */
@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  /**
   * Exercise library table.
   * Indexes: id (primary), category
   */
  exercises!: Table<Exercise, string>;

  /**
   * Sessions table.
   * Indexes: id (primary), startedAt (for sorting by date)
   */
  sessions!: Table<Session, string>;

  /**
   * Session-Exercise junction table.
   * Indexes: id (primary), sessionId (get exercises in session), exerciseId (find last attempt)
   */
  sessionExercises!: Table<SessionExercise, string>;

  /**
   * Sets table.
   * Indexes: id (primary), sessionExerciseId (get sets for exercise)
   */
  sets!: Table<Set, string>;

  /**
   * Bodyweight entries table.
   * Indexes: id (primary), date (for lookup/sorting)
   */
  bodyweightEntries!: Table<BodyweightEntry, string>;

  /**
   * Gamification state table (single record).
   * Uses a fixed key 'state' for the single record pattern.
   */
  gamificationState!: Table<GamificationState & { id: string }, string>;

  /**
   * PR events table.
   * Indexes: id (primary), sessionId (get PRs for session), exerciseId (PR history per exercise)
   */
  prEvents!: Table<PREvent, string>;

  constructor() {
    super(DB_NAME);
    this.defineSchema();
  }

  /**
   * Define database schema with versioning and migration support.
   * Each version() call defines a schema version and optional upgrade logic.
   */
  private defineSchema(): void {
    // Version 1: Initial schema
    this.version(1).stores({
      // Primary key is 'id' (UUID string), additional indexes after comma
      exercises: 'id, category, name',
      sessions: 'id, startedAt, endedAt',
      sessionExercises: 'id, sessionId, exerciseId, [sessionId+orderIndex]',
      sets: 'id, sessionExerciseId, [sessionExerciseId+setIndex]',
      bodyweightEntries: 'id, date',
      gamificationState: 'id'
    });

    // Version 2: Add prEvents table for PR detection
    this.version(2).stores({
      exercises: 'id, category, name',
      sessions: 'id, startedAt, endedAt',
      sessionExercises: 'id, sessionId, exerciseId, [sessionId+orderIndex]',
      sets: 'id, sessionExerciseId, [sessionExerciseId+setIndex]',
      bodyweightEntries: 'id, date',
      gamificationState: 'id',
      prEvents: 'id, sessionId, exerciseId'
    });
  }

  /**
   * Check if the database is open and ready.
   */
  async isReady(): Promise<boolean> {
    try {
      await this.open();
      return this.isOpen();
    } catch (error) {
      console.error('Failed to open database:', error);
      return false;
    }
  }

  /**
   * Clear all data from all stores.
   * Use with caution - primarily for import/reset functionality.
   * Includes all stores: exercises, sessions, sessionExercises, sets,
   * bodyweightEntries, gamificationState, and prEvents.
   */
  async clearAllStores(): Promise<void> {
    await this.transaction(
      'rw',
      [
        this.exercises,
        this.sessions,
        this.sessionExercises,
        this.sets,
        this.bodyweightEntries,
        this.gamificationState,
        this.prEvents
      ],
      async () => {
        await Promise.all([
          this.exercises.clear(),
          this.sessions.clear(),
          this.sessionExercises.clear(),
          this.sets.clear(),
          this.bodyweightEntries.clear(),
          this.gamificationState.clear(),
          this.prEvents.clear()
        ]);
      }
    );
  }

  // ============================================
  // Exercise queries
  // ============================================

  /**
   * Get all exercises sorted by name (ascending).
   */
  async getAllExercises(): Promise<Exercise[]> {
    return this.exercises.orderBy('name').toArray();
  }

  // ============================================
  // Session queries
  // ============================================

  /**
   * Create a new session and persist to IndexedDB.
   * @returns The session id
   */
  async createSession(session: Session): Promise<string> {
    await this.sessions.add(session);
    return session.id;
  }

  /**
   * Get a session by id.
   */
  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  /**
   * Update an existing session.
   */
  async updateSession(session: Session): Promise<void> {
    await this.sessions.put(session);
  }

  /**
   * Get all completed sessions (where endedAt exists), sorted by endedAt descending.
   *
   * Note: This method fetches ALL completed sessions. For bounded queries, use:
   * - getRecentCompletedSessions(limit) for recent N sessions
   * - getCompletedSessionsSince(date) for sessions after a date
   *
   * @param limit Optional limit on number of sessions to return (applied after fetch)
   */
  async getCompletedSessions(limit?: number): Promise<Session[]> {
    // Use the endedAt index with above('') to get only completed sessions
    // ISO strings sort lexicographically, reverse() gives newest first
    const completedSessions = await this.sessions
      .where('endedAt')
      .above('')
      .reverse()
      .toArray();

    return limit ? completedSessions.slice(0, limit) : completedSessions;
  }

  /**
   * Get recent completed sessions using the endedAt index.
   * More efficient than getCompletedSessions() for fetching a limited number of recent sessions.
   *
   * @param limit Maximum number of sessions to return
   * @returns Completed sessions sorted by endedAt descending (newest first)
   */
  async getRecentCompletedSessions(limit: number): Promise<Session[]> {
    // Use the endedAt index to get sessions where endedAt is defined
    // ISO strings sort lexicographically, so we can use reverse() for descending order
    // Filter by endedAt > '' to exclude undefined/null values (they don't match the index anyway)
    const sessions = await this.sessions
      .where('endedAt')
      .above('')
      .reverse()
      .limit(limit)
      .toArray();

    return sessions;
  }

  /**
   * Get completed sessions since a given date using the endedAt index.
   * Useful for bounded queries like "sessions in the last 28 days".
   *
   * @param sinceDate The cutoff date (sessions with endedAt >= this date are included)
   * @returns Completed sessions sorted by endedAt descending (newest first)
   */
  async getCompletedSessionsSince(sinceDate: Date): Promise<Session[]> {
    const sinceIso = sinceDate.toISOString();

    // Use the endedAt index to get sessions where endedAt >= sinceDate
    const sessions = await this.sessions
      .where('endedAt')
      .aboveOrEqual(sinceIso)
      .reverse()
      .toArray();

    return sessions;
  }

  // ============================================
  // Exercise queries
  // ============================================

  /**
   * Get a single exercise by id.
   */
  async getExerciseById(id: string): Promise<Exercise | undefined> {
    return this.exercises.get(id);
  }

  /**
   * Get multiple exercises by their ids.
   * Returns a map of id -> Exercise for efficient lookups.
   */
  async getExercisesByIds(ids: string[]): Promise<Map<string, Exercise>> {
    const exercises = await this.exercises.where('id').anyOf(ids).toArray();
    return new Map(exercises.map(ex => [ex.id, ex]));
  }

  /**
   * Add a new exercise to the library.
   * @returns The exercise id
   */
  async addExercise(exercise: Exercise): Promise<string> {
    await this.exercises.add(exercise);
    return exercise.id;
  }

  // ============================================
  // SessionExercise queries
  // ============================================

  /**
   * Get all session exercises for a session, sorted by orderIndex.
   */
  async getSessionExercises(sessionId: string): Promise<SessionExercise[]> {
    return this.sessionExercises
      .where('sessionId')
      .equals(sessionId)
      .sortBy('orderIndex');
  }

  /**
   * Add a session exercise.
   * @returns The session exercise id
   */
  async addSessionExercise(sessionExercise: SessionExercise): Promise<string> {
    await this.sessionExercises.add(sessionExercise);
    return sessionExercise.id;
  }

  /**
   * Get the next orderIndex for a session (max + 1, or 0 if none).
   */
  async getNextOrderIndex(sessionId: string): Promise<number> {
    const existing = await this.getSessionExercises(sessionId);
    if (existing.length === 0) return 0;
    const maxIndex = Math.max(...existing.map(se => se.orderIndex));
    return maxIndex + 1;
  }

  /**
   * Delete a session exercise and all its associated sets.
   * Uses a transaction to ensure atomicity.
   */
  async deleteSessionExercise(sessionExerciseId: string): Promise<void> {
    await this.transaction('rw', [this.sessionExercises, this.sets], async () => {
      // Delete all sets for this session exercise
      await this.sets.where('sessionExerciseId').equals(sessionExerciseId).delete();
      // Delete the session exercise itself
      await this.sessionExercises.delete(sessionExerciseId);
    });
  }

  /**
   * Restore a session exercise and its sets (for undo functionality).
   * Uses a transaction to ensure atomicity.
   */
  async restoreSessionExercise(sessionExercise: SessionExercise, sets: Set[]): Promise<void> {
    await this.transaction('rw', [this.sessionExercises, this.sets], async () => {
      await this.sessionExercises.add(sessionExercise);
      if (sets.length > 0) {
        await this.sets.bulkAdd(sets);
      }
    });
  }

  /**
   * Update orderIndex for multiple session exercises.
   * Used for reordering exercises within a session.
   * @param updates - Array of { id, orderIndex } to update
   */
  async updateSessionExerciseOrder(updates: Array<{ id: string; orderIndex: number }>): Promise<void> {
    if (updates.length === 0) return;

    await this.transaction('rw', this.sessionExercises, async () => {
      for (const update of updates) {
        await this.sessionExercises.update(update.id, { orderIndex: update.orderIndex });
      }
    });
  }

  // ============================================
  // Ghost Mode: Last Attempt queries
  // ============================================

  /**
   * Get the most recent completed previous attempt for an exercise.
   *
   * Ghost Mode query: returns the SessionExercise and Sets from the most
   * recent completed session where this exercise was performed.
   *
   * Filtering rules:
   * - Excludes the current session (never show in-progress data as ghost)
   * - Only considers completed sessions (endedAt must be defined)
   * - Orders by session.endedAt descending to find the most recent
   *
   * @param exerciseId - The exercise to find previous attempts for
   * @param currentSessionId - The current session to exclude from results
   * @returns LastAttemptResult with sessionExercise, session, and sets, or null if none exists
   */
  async getLastAttempt(
    exerciseId: string,
    currentSessionId: string
  ): Promise<LastAttemptResult | null> {
    // Step 1: Find all SessionExercise records for this exercise
    const sessionExercises = await this.sessionExercises
      .where('exerciseId')
      .equals(exerciseId)
      .toArray();

    if (sessionExercises.length === 0) {
      return null;
    }

    // Step 2: Get unique session IDs (excluding current session)
    const sessionIds = [
      ...new Set(
        sessionExercises
          .map(se => se.sessionId)
          .filter(id => id !== currentSessionId)
      )
    ];

    if (sessionIds.length === 0) {
      return null;
    }

    // Step 3: Fetch those sessions and filter to completed only
    const sessions = await this.sessions
      .where('id')
      .anyOf(sessionIds)
      .toArray();

    // Filter to only completed sessions (endedAt must be defined)
    const completedSessions = sessions.filter(s => s.endedAt !== undefined);

    if (completedSessions.length === 0) {
      return null;
    }

    // Step 4: Sort by endedAt descending to find the most recent
    completedSessions.sort((a, b) => {
      // Both have endedAt (filtered above), compare as ISO strings
      return b.endedAt!.localeCompare(a.endedAt!);
    });

    const mostRecentSession = completedSessions[0];

    // Step 5: Find the SessionExercise for this exercise in that session
    const matchingSessionExercise = sessionExercises.find(
      se => se.sessionId === mostRecentSession.id
    );

    if (!matchingSessionExercise) {
      // Should not happen given our query, but handle gracefully
      return null;
    }

    // Step 6: Fetch all sets for that SessionExercise, sorted by setIndex
    const sets = await this.getSetsForSessionExercise(matchingSessionExercise.id);

    return {
      sessionExercise: matchingSessionExercise,
      session: mostRecentSession,
      sets
    };
  }

  // ============================================
  // Set queries
  // ============================================

  /**
   * Get all sets for a session exercise, sorted by setIndex.
   */
  async getSetsForSessionExercise(sessionExerciseId: string): Promise<Set[]> {
    return this.sets
      .where('sessionExerciseId')
      .equals(sessionExerciseId)
      .sortBy('setIndex');
  }

  /**
   * Add a new set.
   * @returns The set id
   */
  async addSet(set: Set): Promise<string> {
    await this.sets.add(set);
    return set.id;
  }

  /**
   * Update an existing set.
   */
  async updateSet(set: Set): Promise<void> {
    await this.sets.put(set);
  }

  /**
   * Delete a set by id.
   */
  async deleteSet(id: string): Promise<void> {
    await this.sets.delete(id);
  }

  /**
   * Reindex sets for a session exercise so setIndex is contiguous 0..n-1.
   * Call this after deleting a set to maintain proper ordering.
   */
  async reindexSets(sessionExerciseId: string): Promise<void> {
    const sets = await this.getSetsForSessionExercise(sessionExerciseId);
    // Update setIndex for each set to be contiguous
    await this.transaction('rw', this.sets, async () => {
      for (let i = 0; i < sets.length; i++) {
        if (sets[i].setIndex !== i) {
          sets[i].setIndex = i;
          await this.sets.put(sets[i]);
        }
      }
    });
  }

  /**
   * Get the next setIndex for a session exercise (max + 1, or 0 if none).
   */
  async getNextSetIndex(sessionExerciseId: string): Promise<number> {
    const existing = await this.getSetsForSessionExercise(sessionExerciseId);
    if (existing.length === 0) return 0;
    const maxIndex = Math.max(...existing.map(s => s.setIndex));
    return maxIndex + 1;
  }

  /**
   * Bulk add multiple sets in a single transaction.
   * Used for copying sets from a previous attempt.
   * @param sets - Array of Set records to add
   */
  async bulkAddSets(sets: Set[]): Promise<void> {
    if (sets.length === 0) return;

    await this.transaction('rw', this.sets, async () => {
      await this.sets.bulkAdd(sets);
    });
  }

  // ============================================
  // Gamification queries
  // ============================================

  /**
   * Get the current gamification state.
   * Returns null if no state exists (should be seeded on first run).
   */
  async getGamificationState(): Promise<(GamificationState & { id: string }) | undefined> {
    // Use the fixed ID from seed-data for the single record pattern
    return this.gamificationState.get('default');
  }

  /**
   * Update the gamification state.
   * Creates the record if it doesn't exist.
   */
  async updateGamificationState(state: GamificationState & { id: string }): Promise<void> {
    await this.gamificationState.put(state);
  }

  /**
   * Add XP to the gamification state.
   * Creates the state record if it doesn't exist.
   * @param amount - Amount of XP to add
   * @returns The new total XP
   */
  async addXp(amount: number): Promise<number> {
    const currentState = await this.getGamificationState();
    const newTotalXp = (currentState?.totalXp ?? 0) + amount;

    await this.gamificationState.put({
      id: 'default',
      totalXp: newTotalXp
    });

    return newTotalXp;
  }

  /**
   * Count the total number of sets for a session.
   * Used for XP calculation.
   * @param sessionId - The session to count sets for
   */
  async countSetsForSession(sessionId: string): Promise<number> {
    const sessionExercises = await this.getSessionExercises(sessionId);
    let totalSets = 0;

    for (const se of sessionExercises) {
      const sets = await this.getSetsForSessionExercise(se.id);
      totalSets += sets.length;
    }

    return totalSets;
  }

  // ============================================
  // PR Event queries
  // ============================================

  /**
   * Get PR events for a specific session.
   * @param sessionId - The session to get PRs for
   */
  async getPREventsForSession(sessionId: string): Promise<PREvent[]> {
    return this.prEvents.where('sessionId').equals(sessionId).toArray();
  }

  /**
   * Get recent PR events, ordered by detection date (newest first).
   * @param limit - Maximum number of PR events to return (default 10)
   */
  async getRecentPREvents(limit = 10): Promise<PREvent[]> {
    // Get all PR events, sort by detectedAt descending, and limit
    const allPRs = await this.prEvents.toArray();

    return allPRs
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Add multiple PR events in a single transaction.
   * Used when detecting PRs at session completion.
   * @param events - Array of PREvent records to add
   */
  async addPREvents(events: PREvent[]): Promise<void> {
    if (events.length === 0) return;

    await this.transaction('rw', this.prEvents, async () => {
      await this.prEvents.bulkAdd(events);
    });
  }

  /**
   * Get all sets for an exercise from completed sessions, excluding a specific session.
   * Used for calculating historical max weight for PR detection.
   *
   * Filtering rules:
   * - Only from completed sessions (endedAt exists)
   * - Excludes the specified session
   * - Returns sets with valid weights (weight > 0)
   *
   * @param exerciseId - The exercise to get historical sets for
   * @param excludeSessionId - Session to exclude (usually the current session)
   */
  async getHistoricalSetsForExercise(
    exerciseId: string,
    excludeSessionId: string
  ): Promise<Set[]> {
    // Step 1: Find all SessionExercises for this exercise
    const sessionExercises = await this.sessionExercises
      .where('exerciseId')
      .equals(exerciseId)
      .toArray();

    if (sessionExercises.length === 0) {
      return [];
    }

    // Step 2: Get unique session IDs (excluding current session)
    const sessionIds = [
      ...new Set(
        sessionExercises
          .map(se => se.sessionId)
          .filter(id => id !== excludeSessionId)
      )
    ];

    if (sessionIds.length === 0) {
      return [];
    }

    // Step 3: Fetch those sessions and filter to completed only
    const sessions = await this.sessions
      .where('id')
      .anyOf(sessionIds)
      .toArray();

    const completedSessionIds = new Set(
      sessions
        .filter(s => s.endedAt !== undefined)
        .map(s => s.id)
    );

    if (completedSessionIds.size === 0) {
      return [];
    }

    // Step 4: Get SessionExercises from completed sessions only
    const validSessionExercises = sessionExercises.filter(
      se => completedSessionIds.has(se.sessionId)
    );

    // Step 5: Fetch all sets for those SessionExercises
    const allSets: Set[] = [];
    for (const se of validSessionExercises) {
      const sets = await this.getSetsForSessionExercise(se.id);
      // Filter to sets with valid weights (not null/undefined and > 0)
      const validSets = sets.filter(s => s.weight !== undefined && s.weight !== null && s.weight > 0);
      allSets.push(...validSets);
    }

    return allSets;
  }

  /**
   * Get all sets for an exercise in a specific session.
   * Used for calculating current max weight for PR detection.
   *
   * @param exerciseId - The exercise to get sets for
   * @param sessionId - The session to get sets from
   */
  async getSetsForExerciseInSession(
    exerciseId: string,
    sessionId: string
  ): Promise<Set[]> {
    // Find the SessionExercise for this exercise in this session
    const sessionExercises = await this.sessionExercises
      .where('sessionId')
      .equals(sessionId)
      .toArray();

    const matchingSE = sessionExercises.find(se => se.exerciseId === exerciseId);

    if (!matchingSE) {
      return [];
    }

    // Get all sets for this SessionExercise
    const sets = await this.getSetsForSessionExercise(matchingSE.id);

    // Filter to sets with valid weights (not null/undefined and > 0)
    return sets.filter(s => s.weight !== undefined && s.weight !== null && s.weight > 0);
  }

  // ============================================
  // Export / Import (Backup)
  // ============================================

  /**
   * Get all data from all stores for export.
   * Used for generating backup JSON.
   */
  async getAllDataForExport(): Promise<ExportData> {
    const [
      exercises,
      sessions,
      sessionExercises,
      sets,
      bodyweightEntries,
      gamificationState,
      prEvents
    ] = await Promise.all([
      this.exercises.toArray(),
      this.sessions.toArray(),
      this.sessionExercises.toArray(),
      this.sets.toArray(),
      this.bodyweightEntries.toArray(),
      this.gamificationState.toArray(),
      this.prEvents.toArray()
    ]);

    return {
      exercises,
      sessions,
      sessionExercises,
      sets,
      bodyweightEntries,
      gamificationState,
      prEvents,
      foodEntries: [] // Placeholder for future food logging
    };
  }

  /**
   * Import all data from a backup.
   * This is an all-or-nothing operation using a single transaction.
   * Clears all existing data before importing.
   *
   * @param data - The ExportData object containing all entity arrays
   * @throws Error if import fails (existing data is preserved on failure)
   */
  async importAllData(data: ExportData): Promise<void> {
    await this.transaction(
      'rw',
      [
        this.exercises,
        this.sessions,
        this.sessionExercises,
        this.sets,
        this.bodyweightEntries,
        this.gamificationState,
        this.prEvents
      ],
      async () => {
        // Step 1: Clear all stores
        await Promise.all([
          this.exercises.clear(),
          this.sessions.clear(),
          this.sessionExercises.clear(),
          this.sets.clear(),
          this.bodyweightEntries.clear(),
          this.gamificationState.clear(),
          this.prEvents.clear()
        ]);

        // Step 2: Bulk add all data
        // Use bulkAdd for better performance with large datasets
        const addPromises: Promise<unknown>[] = [];

        if (data.exercises.length > 0) {
          addPromises.push(this.exercises.bulkAdd(data.exercises));
        }
        if (data.sessions.length > 0) {
          addPromises.push(this.sessions.bulkAdd(data.sessions));
        }
        if (data.sessionExercises.length > 0) {
          addPromises.push(this.sessionExercises.bulkAdd(data.sessionExercises));
        }
        if (data.sets.length > 0) {
          addPromises.push(this.sets.bulkAdd(data.sets));
        }
        if (data.bodyweightEntries.length > 0) {
          addPromises.push(this.bodyweightEntries.bulkAdd(data.bodyweightEntries));
        }
        if (data.gamificationState.length > 0) {
          addPromises.push(this.gamificationState.bulkAdd(data.gamificationState));
        }
        if (data.prEvents.length > 0) {
          addPromises.push(this.prEvents.bulkAdd(data.prEvents));
        }

        await Promise.all(addPromises);
      }
    );
  }
}
