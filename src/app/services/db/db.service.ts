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
}
