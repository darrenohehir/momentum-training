import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { FoodEntry, deriveLocalDate } from '../../models';
import { DbService } from '../../services/db';
import { generateUUID } from '../../utils';

/** Debounce time for auto-save while typing (ms) */
const AUTOSAVE_DEBOUNCE_MS = 400;

/** Undo window duration in milliseconds */
const UNDO_TIMEOUT_MS = 5000;

/** State for undoing a deletion */
interface UndoState {
  entry: FoodEntry;
}

@Component({
  selector: 'app-food',
  templateUrl: './food.page.html',
  styleUrls: ['./food.page.scss'],
  standalone: false
})
export class FoodPage implements OnInit, OnDestroy, ViewWillEnter {
  /** All food entries (newest first) */
  entries: FoodEntry[] = [];

  /** Loading state */
  isLoading = true;

  /** Current entry being edited (null = list view, new object = creating, existing = editing) */
  editingEntry: FoodEntry | null = null;

  /** Whether we're creating a new entry vs editing existing */
  isNewEntry = false;

  /** Form fields for editing (bound to inputs) */
  formDate = '';
  formTime = '';
  formText = '';
  formNote = '';

  /** Undo state for deletions */
  undoState: UndoState | null = null;
  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  /** Subjects for debounced auto-save */
  private saveSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private db: DbService) {}

  ngOnInit(): void {
    // Set up debounced auto-save
    this.saveSubject.pipe(
      debounceTime(AUTOSAVE_DEBOUNCE_MS),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.persistCurrentEntry();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearUndo();
  }

  /**
   * Ionic lifecycle hook: reload data when page becomes active.
   */
  async ionViewWillEnter(): Promise<void> {
    await this.loadEntries();
  }

  /**
   * Load all food entries from IndexedDB.
   */
  private async loadEntries(): Promise<void> {
    this.isLoading = true;
    try {
      this.entries = await this.db.getFoodEntries();
    } catch (error) {
      console.error('Failed to load food entries:', error);
      this.entries = [];
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================
  // Entry form (create/edit)
  // ============================================

  /**
   * Start creating a new entry. Defaults to now.
   */
  startNewEntry(): void {
    const now = new Date();
    const id = generateUUID();
    const isoNow = now.toISOString();

    this.editingEntry = {
      id,
      date: deriveLocalDate(isoNow),
      loggedAt: isoNow,
      text: '',
      createdAt: isoNow
    };
    this.isNewEntry = true;

    // Set form fields
    this.formDate = this.formatDateForInput(now);
    this.formTime = this.formatTimeForInput(now);
    this.formText = '';
    this.formNote = '';
  }

  /**
   * Start editing an existing entry.
   */
  editEntry(entry: FoodEntry): void {
    this.editingEntry = { ...entry };
    this.isNewEntry = false;

    const loggedDate = new Date(entry.loggedAt);
    this.formDate = this.formatDateForInput(loggedDate);
    this.formTime = this.formatTimeForInput(loggedDate);
    this.formText = entry.text;
    this.formNote = entry.note || '';
  }

  /**
   * Cancel editing and return to list.
   */
  cancelEdit(): void {
    this.editingEntry = null;
    this.isNewEntry = false;
  }

  /**
   * Handle input changes - trigger debounced save.
   */
  onInputChange(): void {
    this.saveSubject.next();
  }

  /**
   * Handle blur on inputs - save immediately.
   */
  onInputBlur(): void {
    this.persistCurrentEntry();
  }

  /**
   * Persist the current entry to IndexedDB.
   * Only saves if text is provided (required field).
   * Updates the in-memory entries array directly (no full reload).
   */
  private async persistCurrentEntry(): Promise<void> {
    if (!this.editingEntry) return;

    // Parse form values
    const text = this.formText.trim();
    if (!text) {
      // Don't persist without text content
      return;
    }

    // Build ISO timestamp from date + time
    const loggedAt = this.buildIsoFromDateAndTime(this.formDate, this.formTime);
    const date = deriveLocalDate(loggedAt);
    const now = new Date().toISOString();

    // Update entry object
    this.editingEntry.text = text;
    this.editingEntry.loggedAt = loggedAt;
    this.editingEntry.date = date;
    this.editingEntry.note = this.formNote.trim() || undefined;
    this.editingEntry.updatedAt = now;

    try {
      if (this.isNewEntry) {
        // Check if this entry exists in DB (may have been created already by previous save)
        const existing = await this.db.getFoodEntry(this.editingEntry.id);
        if (existing) {
          await this.db.updateFoodEntry(this.editingEntry);
        } else {
          await this.db.addFoodEntry(this.editingEntry);
        }
      } else {
        await this.db.updateFoodEntry(this.editingEntry);
      }

      // Update in-memory array directly (no full reload)
      this.updateEntriesArray(this.editingEntry);
    } catch (error) {
      console.error('Failed to save food entry:', error);
    }
  }

  /**
   * Update the in-memory entries array with the given entry.
   * Inserts if new, replaces if existing, maintains sort order (newest first by loggedAt).
   */
  private updateEntriesArray(entry: FoodEntry): void {
    const existingIndex = this.entries.findIndex(e => e.id === entry.id);

    if (existingIndex >= 0) {
      // Replace existing entry
      this.entries[existingIndex] = { ...entry };
    } else {
      // Insert new entry
      this.entries.push({ ...entry });
    }

    // Re-sort by loggedAt descending (newest first)
    this.entries.sort((a, b) => {
      const aTime = new Date(a.loggedAt).getTime();
      const bTime = new Date(b.loggedAt).getTime();
      return bTime - aTime;
    });
  }

  /**
   * Save and close (explicit save action).
   */
  async saveAndClose(): Promise<void> {
    await this.persistCurrentEntry();
    this.cancelEdit();
  }

  // ============================================
  // Deletion with undo
  // ============================================

  /**
   * Delete an entry with undo support.
   */
  async deleteEntry(entry: FoodEntry): Promise<void> {
    // Clear any previous undo
    this.clearUndo();

    try {
      // Delete from DB
      await this.db.deleteFoodEntry(entry.id);

      // Remove from local list
      this.entries = this.entries.filter(e => e.id !== entry.id);

      // If we're editing this entry, close the editor
      if (this.editingEntry?.id === entry.id) {
        this.editingEntry = null;
        this.isNewEntry = false;
      }

      // Set undo state
      this.undoState = { entry };

      // Auto-clear undo after timeout
      this.undoTimer = setTimeout(() => {
        this.clearUndo();
      }, UNDO_TIMEOUT_MS);
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  }

  /**
   * Undo the last deletion.
   * Uses restoreFoodEntry (upsert) so it won't fail if entry already exists.
   */
  async undoDelete(): Promise<void> {
    if (!this.undoState) return;

    try {
      // Restore to DB using idempotent upsert
      await this.db.restoreFoodEntry(this.undoState.entry);

      // Reload list
      await this.loadEntries();
    } catch (error) {
      console.error('Failed to undo delete:', error);
    } finally {
      this.clearUndo();
    }
  }

  /**
   * Clear undo state and timer.
   */
  private clearUndo(): void {
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
    this.undoState = null;
  }

  // ============================================
  // Helpers
  // ============================================

  /**
   * Format date for input (YYYY-MM-DD).
   */
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format time for input (HH:mm).
   */
  private formatTimeForInput(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Build ISO timestamp from date and time strings.
   */
  private buildIsoFromDateAndTime(dateStr: string, timeStr: string): string {
    // dateStr: YYYY-MM-DD, timeStr: HH:mm
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return date.toISOString();
  }

  /**
   * Format loggedAt for display (date portion).
   */
  formatDisplayDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format loggedAt for display (time portion).
   */
  formatDisplayTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Truncate text for display in list view.
   */
  truncateText(text: string, maxLength = 60): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '…';
  }
}
