import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import {
  DEFAULT_EXERCISES,
  DEFAULT_GAMIFICATION_STATE,
  GAMIFICATION_STATE_ID
} from './seed-data';

/**
 * Database initialization service.
 * Handles first-run seeding and ensures database is ready.
 *
 * Seed-only-once guard:
 * - Checks if GamificationState record exists with fixed ID
 * - If missing, this is a fresh install → seed all default data
 * - If present, skip seeding entirely (never duplicates/overwrites)
 */
@Injectable({
  providedIn: 'root'
})
export class DbInitService {
  private initialized = false;

  constructor(private db: DbService) {}

  /**
   * Initialize database and seed if needed.
   * Safe to call multiple times - will only seed once.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Ensure database is open
    await this.db.open();

    // Check if this is a fresh install by looking for gamification state
    const needsSeed = await this.checkNeedsSeed();

    if (needsSeed) {
      await this.seedDefaultData();
      console.log('Database seeded with default data');
    }

    this.initialized = true;
  }

  /**
   * Check if database needs seeding.
   * Returns true if GamificationState record is missing (fresh install).
   */
  private async checkNeedsSeed(): Promise<boolean> {
    const existingState = await this.db.gamificationState.get(GAMIFICATION_STATE_ID);
    return existingState === undefined;
  }

  /**
   * Seed default data for fresh install.
   * Runs in a transaction to ensure atomicity.
   */
  private async seedDefaultData(): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.exercises, this.db.gamificationState],
      async () => {
        // Seed default exercises
        await this.db.exercises.bulkPut(DEFAULT_EXERCISES);

        // Seed default gamification state
        await this.db.gamificationState.put(DEFAULT_GAMIFICATION_STATE);
      }
    );
  }
}

