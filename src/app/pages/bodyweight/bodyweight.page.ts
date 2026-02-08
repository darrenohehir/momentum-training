import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewWillEnter, ViewWillLeave, NavController } from '@ionic/angular';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { BodyweightEntry, deriveLocalDate } from '../../models';
import { DbService } from '../../services/db';
import { ActivityEventsService } from '../../services/events';
import { UndoToastService } from '../../services/ui';
import {
  generateUUID,
  formatDateForInput,
  formatTimeForInput,
  buildIsoFromDateAndTime,
  formatDisplayDate,
  formatDisplayTime
} from '../../utils';

/** Debounce time for auto-save while typing (ms) */
const AUTOSAVE_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-bodyweight',
  templateUrl: './bodyweight.page.html',
  styleUrls: ['./bodyweight.page.scss'],
  standalone: false
})
export class BodyweightPage implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  /** All bodyweight entries (newest first) */
  entries: BodyweightEntry[] = [];

  /** Loading state */
  isLoading = true;

  /** Current entry being edited (null = list view, new object = creating, existing = editing) */
  editingEntry: BodyweightEntry | null = null;

  /** Whether we're creating a new entry vs editing existing */
  isNewEntry = false;

  /** Form fields for editing (bound to inputs) */
  formDate = '';
  formTime = '';
  formWeight: number | null = null;
  formNote = '';

  /** Subjects for debounced auto-save */
  private saveSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  /** Tracks whether a debounced save is pending (for flush-on-exit) */
  private hasPendingSave = false;
  private saveSubscription: Subscription | null = null;

  /** True when this page was opened via History deep-link (?id=); delete should return to History. */
  private openedFromHistory = false;

  /** When true, ngOnDestroy will not dismiss the undo toast (we just showed it and navigated to History). */
  private leaveUndoToastVisibleOnDestroy = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navController: NavController,
    private db: DbService,
    private activityEvents: ActivityEventsService,
    private undoToast: UndoToastService
  ) {}

  ngOnInit(): void {
    // Set up debounced auto-save
    this.saveSubscription = this.saveSubject.pipe(
      debounceTime(AUTOSAVE_DEBOUNCE_MS),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.hasPendingSave = false;
      this.persistCurrentEntry();
    });
  }

  ngOnDestroy(): void {
    // Flush any pending save before destroying
    this.flushPendingSave();
    this.destroy$.next();
    this.destroy$.complete();
    this.saveSubscription?.unsubscribe();
    if (!this.leaveUndoToastVisibleOnDestroy) {
      this.undoToast.dismiss();
    }
  }

  /**
   * Ionic lifecycle hook: reload data when page becomes active.
   * Supports ?new=1 (create mode from FAB) and ?id=<entryId> (edit mode from History deep-link).
   */
  async ionViewWillEnter(): Promise<void> {
    this.leaveUndoToastVisibleOnDestroy = false;

    await this.loadEntries();

    const idParam = this.route.snapshot.queryParamMap.get('id');
    if (idParam) {
      const entry = await this.db.getBodyweightEntry(idParam);
      if (entry) {
        this.openedFromHistory = true;
        this.editEntry(entry);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
      return;
    }

    const newParam = this.route.snapshot.queryParamMap.get('new');
    if (newParam === '1') {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
      this.startNewEntry();
    }
  }

  /**
   * Ionic lifecycle hook: flush pending saves when leaving the page.
   */
  async ionViewWillLeave(): Promise<void> {
    await this.flushPendingSave();
  }

  /**
   * Load all bodyweight entries from IndexedDB.
   */
  private async loadEntries(): Promise<void> {
    this.isLoading = true;
    try {
      this.entries = await this.db.getBodyweightEntries();
    } catch (error) {
      console.error('Failed to load bodyweight entries:', error);
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
      weightKg: 0,
      createdAt: isoNow
    };
    this.isNewEntry = true;

    // Set form fields
    this.formDate = formatDateForInput(now);
    this.formTime = formatTimeForInput(now);
    this.formWeight = null;
    this.formNote = '';
  }

  /**
   * Start editing an existing entry.
   */
  editEntry(entry: BodyweightEntry): void {
    this.editingEntry = { ...entry };
    this.isNewEntry = false;

    const loggedDate = new Date(entry.loggedAt);
    this.formDate = formatDateForInput(loggedDate);
    this.formTime = formatTimeForInput(loggedDate);
    this.formWeight = entry.weightKg;
    this.formNote = entry.note || '';
  }

  /**
   * Cancel editing and return to list, or to History when opened from History.
   * Flushes any pending save before exiting edit mode.
   */
  async cancelEdit(): Promise<void> {
    await this.flushPendingSave();
    this.editingEntry = null;
    this.isNewEntry = false;
    if (this.openedFromHistory) {
      this.navController.navigateRoot('/tabs/history', { replaceUrl: true });
    }
  }

  /**
   * Handle input changes - trigger debounced save.
   */
  onInputChange(): void {
    this.hasPendingSave = true;
    this.saveSubject.next();
  }

  /**
   * Handle blur on inputs - save immediately.
   */
  onInputBlur(): void {
    // Fire-and-forget flush on blur (don't block UI)
    this.flushPendingSave();
  }

  /**
   * Flush any pending save immediately.
   * Called when leaving edit mode or the page to prevent data loss.
   * Unconditionally attempts to persist if editing (persistCurrentEntry validates data).
   */
  private async flushPendingSave(): Promise<void> {
    if (!this.editingEntry) return;

    // Clear pending flag to prevent debounce callback from double-writing
    this.hasPendingSave = false;

    await this.persistCurrentEntry();
  }

  /**
   * Persist the current entry to IndexedDB.
   * Only saves if weight is valid (> 0).
   * Updates the in-memory entries array directly (no full reload).
   * 
   * Uses snapshotted values to avoid race conditions if state changes mid-flight.
   */
  private async persistCurrentEntry(): Promise<void> {
    // Snapshot current state at call time to avoid race conditions
    const editingEntry = this.editingEntry;
    if (!editingEntry) return;

    const weight = this.formWeight;
    if (weight === null || weight <= 0) {
      // Don't persist without valid weight
      return;
    }

    // Snapshot form values
    const formDate = this.formDate;
    const formTime = this.formTime;
    const formNote = this.formNote;
    const isNewEntry = this.isNewEntry;

    // Build ISO timestamp from date + time
    const loggedAt = buildIsoFromDateAndTime(formDate, formTime);
    const date = deriveLocalDate(loggedAt);
    const now = new Date().toISOString();

    // Build entry to save (don't mutate component state during async)
    const entryToSave: BodyweightEntry = {
      ...editingEntry,
      weightKg: weight,
      loggedAt,
      date,
      note: formNote.trim() || undefined,
      updatedAt: now
    };

    try {
      if (isNewEntry) {
        // Check if this entry exists in DB (may have been created already by previous save)
        const existing = await this.db.getBodyweightEntry(entryToSave.id);
        if (existing) {
          await this.db.updateBodyweightEntry(entryToSave);
        } else {
          await this.db.addBodyweightEntry(entryToSave);
        }
      } else {
        await this.db.updateBodyweightEntry(entryToSave);
      }

      // Update in-memory array directly (no full reload)
      this.updateEntriesArray(entryToSave);

      // Sync component state if still editing the same entry
      if (this.editingEntry?.id === entryToSave.id) {
        this.editingEntry = entryToSave;
      }

      this.activityEvents.notifyActivityChanged();
    } catch (error) {
      console.error('Failed to save bodyweight entry:', error);
    }
  }

  /**
   * Update the in-memory entries array with the given entry.
   * Inserts if new, replaces if existing, maintains sort order (newest first by loggedAt).
   */
  private updateEntriesArray(entry: BodyweightEntry): void {
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
   * Persists the entry then navigates to History tab (replaces stack so back does not return here).
   */
  async saveAndClose(): Promise<void> {
    await this.persistCurrentEntry();
    // Clear state directly (no need to flush again via cancelEdit)
    this.hasPendingSave = false;
    this.editingEntry = null;
    this.isNewEntry = false;
    this.navController.navigateRoot('/tabs/history', { replaceUrl: true });
  }

  // ============================================
  // Deletion with undo
  // ============================================

  /**
   * Delete an entry with undo support.
   * Shows an ion-toast with "Undo" button; restores if tapped within timeout.
   */
  async deleteEntry(entry: BodyweightEntry): Promise<void> {
    try {
      await this.db.deleteBodyweightEntry(entry.id);

      this.entries = this.entries.filter(e => e.id !== entry.id);

      const wasEditingThis = this.editingEntry?.id === entry.id;
      if (wasEditingThis) {
        this.editingEntry = null;
        this.isNewEntry = false;
      }

      this.activityEvents.notifyActivityChanged();

      if (wasEditingThis && this.openedFromHistory) {
        this.navController.navigateRoot('/tabs/history', { replaceUrl: true });
        this.leaveUndoToastVisibleOnDestroy = true;
      }

      await this.undoToast.present({
        message: 'Entry deleted',
        onUndo: async () => {
          try {
            await this.db.restoreBodyweightEntry(entry);
            await this.loadEntries();
            this.activityEvents.notifyActivityChanged();
          } catch (error) {
            console.error('Failed to undo delete:', error);
          }
        }
      });
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  }

  // ============================================
  // Template helpers (delegate to shared utils)
  // ============================================

  /** Format loggedAt for display (date portion). */
  formatDisplayDate = formatDisplayDate;

  /** Format loggedAt for display (time portion). */
  formatDisplayTime = formatDisplayTime;
}

