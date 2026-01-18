import { Injectable } from '@angular/core';
import { DbService } from '../db';
import { ExportPayload, ExportData, SCHEMA_VERSION } from '../../models';

/**
 * Result of an import validation.
 */
export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  payload?: ExportPayload;
}

/**
 * Service for exporting and importing app data as JSON backup files.
 *
 * Export: Generates a JSON file containing all app data for download.
 * Import: Validates and restores data from a previously exported JSON file.
 *
 * Safety guarantees:
 * - Import validates data BEFORE any database modifications
 * - Import uses a single Dexie transaction: if any operation fails,
 *   the transaction aborts and all changes are rolled back
 * - Schema version must match exactly (no auto-migration)
 */
@Injectable({
  providedIn: 'root'
})
export class BackupService {
  constructor(private db: DbService) {}

  // ============================================
  // Export
  // ============================================

  /**
   * Export all app data as a JSON file and trigger download.
   * Filename format: momentum-backup-YYYY-MM-DD.json
   */
  async exportToFile(): Promise<void> {
    const payload = await this.generateExportPayload();
    const json = JSON.stringify(payload, null, 2);
    const filename = this.generateFilename();

    this.downloadJson(json, filename);
  }

  /**
   * Generate the export payload containing all app data.
   */
  async generateExportPayload(): Promise<ExportPayload> {
    const data = await this.db.getAllDataForExport();

    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data
    };
  }

  /**
   * Generate a filename for the backup file.
   * Format: momentum-backup-YYYY-MM-DD.json
   */
  private generateFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `momentum-backup-${year}-${month}-${day}.json`;
  }

  /**
   * Trigger a client-side download of a JSON string.
   */
  private downloadJson(json: string, filename: string): void {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL
    URL.revokeObjectURL(url);
  }

  // ============================================
  // Import
  // ============================================

  /**
   * Read and parse a JSON file from user input.
   * @param file - The File object from a file input
   * @returns The parsed JSON content
   */
  async readFile(file: File): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string);
          resolve(json);
        } catch (error) {
          reject(new Error('Invalid JSON file. Please select a valid backup file.'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file. Please try again.'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate an import payload before importing.
   * Checks:
   * - Valid JSON structure
   * - Schema version matches
   * - Required top-level keys exist
   * - Data fields are arrays
   *
   * @param payload - The parsed JSON object to validate
   * @returns Validation result with error message if invalid
   */
  validateImportPayload(payload: unknown): ImportValidationResult {
    // Check it's an object
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Invalid backup file format.' };
    }

    const obj = payload as Record<string, unknown>;

    // Check required top-level keys
    if (!('schemaVersion' in obj)) {
      return { valid: false, error: 'Missing schemaVersion in backup file.' };
    }
    if (!('exportedAt' in obj)) {
      return { valid: false, error: 'Missing exportedAt in backup file.' };
    }
    if (!('data' in obj)) {
      return { valid: false, error: 'Missing data in backup file.' };
    }

    // Check schema version matches exactly
    if (obj['schemaVersion'] !== SCHEMA_VERSION) {
      return {
        valid: false,
        error: `Schema version mismatch. Expected ${SCHEMA_VERSION}, got ${obj['schemaVersion']}. This backup is not compatible with the current app version.`
      };
    }

    // Check exportedAt is a string
    if (typeof obj['exportedAt'] !== 'string') {
      return { valid: false, error: 'Invalid exportedAt format in backup file.' };
    }

    // Check data is an object
    const data = obj['data'];
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid data format in backup file.' };
    }

    // Validate data fields are arrays
    const dataObj = data as Record<string, unknown>;

    // Required fields that must exist and be arrays
    const requiredArrayFields = [
      'exercises',
      'sessions',
      'sessionExercises',
      'sets',
      'bodyweightEntries',
      'gamificationState',
      'prEvents'
    ];

    for (const field of requiredArrayFields) {
      if (!(field in dataObj)) {
        return { valid: false, error: `Missing ${field} in backup data.` };
      }
      if (!Array.isArray(dataObj[field])) {
        return { valid: false, error: `${field} must be an array in backup data.` };
      }
    }

    // Optional fields: if present, must be arrays; if missing, will default to []
    const optionalArrayFields = ['foodEntries'];

    for (const field of optionalArrayFields) {
      if (field in dataObj && !Array.isArray(dataObj[field])) {
        return { valid: false, error: `${field} must be an array in backup data.` };
      }
    }

    // Lightweight sanity check: verify records have string `id` fields
    // This catches corrupted or malformed data without full schema validation
    const fieldsToCheckIds = [
      'exercises',
      'sessions',
      'sessionExercises',
      'sets',
      'bodyweightEntries',
      'prEvents'
    ];

    for (const field of fieldsToCheckIds) {
      const arr = dataObj[field] as unknown[];
      for (let i = 0; i < arr.length; i++) {
        const record = arr[i];
        if (!record || typeof record !== 'object') {
          return { valid: false, error: `Invalid record at ${field}[${i}]: expected object.` };
        }
        const rec = record as Record<string, unknown>;
        if (!('id' in rec) || typeof rec['id'] !== 'string') {
          return { valid: false, error: `Invalid record at ${field}[${i}]: missing or invalid 'id' field.` };
        }
      }
    }

    // All validation passed
    return {
      valid: true,
      payload: obj as unknown as ExportPayload
    };
  }

  /**
   * Import data from a validated payload.
   * This replaces ALL existing data with the imported data.
   *
   * The import is transactional: all operations (clear + add) occur within
   * a single Dexie transaction. If any operation fails, the transaction
   * aborts and all changes are rolled back automatically.
   *
   * IMPORTANT: Call validateImportPayload() first and confirm with user.
   *
   * @param payload - A validated ExportPayload
   * @throws Error if import fails (transaction will have been rolled back)
   */
  async importFromPayload(payload: ExportPayload): Promise<void> {
    // Ensure data object exists with default empty arrays for missing fields
    const data: ExportData = {
      exercises: payload.data.exercises || [],
      sessions: payload.data.sessions || [],
      sessionExercises: payload.data.sessionExercises || [],
      sets: payload.data.sets || [],
      bodyweightEntries: payload.data.bodyweightEntries || [],
      gamificationState: payload.data.gamificationState || [],
      prEvents: payload.data.prEvents || [],
      foodEntries: [] // Ignored during import; placeholder for future
    };

    await this.db.importAllData(data);
  }

  /**
   * Get a summary of what will be imported.
   * Useful for showing the user what they're about to import.
   */
  getImportSummary(payload: ExportPayload): {
    exportedAt: string;
    counts: {
      exercises: number;
      sessions: number;
      sets: number;
      bodyweightEntries: number;
      prEvents: number;
    };
  } {
    return {
      exportedAt: payload.exportedAt,
      counts: {
        exercises: payload.data.exercises?.length || 0,
        sessions: payload.data.sessions?.length || 0,
        sets: payload.data.sets?.length || 0,
        bodyweightEntries: payload.data.bodyweightEntries?.length || 0,
        prEvents: payload.data.prEvents?.length || 0
      }
    };
  }
}

/*
 * MANUAL SMOKE TEST PATH (for developer verification):
 *
 * 1. Create some sessions with exercises and sets
 * 2. Go to Settings → Export Backup
 * 3. Note the exported filename and counts
 * 4. Clear all app data (or use a fresh browser profile)
 * 5. Go to Settings → Import Backup
 * 6. Select the exported file
 * 7. Confirm the import
 * 8. Verify:
 *    - Sessions appear in Home (Recent Sessions)
 *    - Exercises appear in Exercise Library
 *    - Session details show correct sets
 *    - XP/Level reflects imported gamification state
 *    - PRs appear in History/Insights
 */
