import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import {
  Exercise,
  Session,
  SessionExercise,
  Set,
  BodyweightEntry,
  GamificationState,
  SCHEMA_VERSION
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

    // Future versions would be added here with upgrade functions:
    // this.version(2).stores({...}).upgrade(tx => {...});
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
        this.gamificationState
      ],
      async () => {
        await Promise.all([
          this.exercises.clear(),
          this.sessions.clear(),
          this.sessionExercises.clear(),
          this.sets.clear(),
          this.bodyweightEntries.clear(),
          this.gamificationState.clear()
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
}
