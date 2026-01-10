import { Injectable } from '@angular/core';
import Dexie from 'dexie';

/**
 * Database name for IndexedDB.
 */
export const DB_NAME = 'MomentumDB';

/**
 * Current database schema version.
 * Increment when schema changes require migration.
 */
export const DB_VERSION = 1;

/**
 * Core database service using Dexie for IndexedDB persistence.
 * 
 * This service:
 * - Initializes and opens the IndexedDB database
 * - Manages schema versioning
 * - Will expose CRUD operations per store (Task 1.2+)
 * 
 * Stores and schema are defined in Task 1.2.
 */
@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {

  constructor() {
    super(DB_NAME);
    
    // Schema definition will be added in Task 1.2
    // For now, just initialize with version placeholder
    this.version(DB_VERSION).stores({
      // Stores will be defined in Task 1.2
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
}

