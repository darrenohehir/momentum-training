import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, ItemReorderEventDetail, ViewWillEnter } from '@ionic/angular';
import { Session, SessionExercise, Exercise, QuestId, Set } from '../../models';
import { DbService, LastAttemptResult } from '../../services/db';
import { AppEventsService } from '../../services/events';
import { XpService } from '../../services/xp';
import { ExercisePickerComponent } from '../../components/exercise-picker/exercise-picker.component';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

/** Map quest IDs to display labels */
const QUEST_LABELS: Record<QuestId, string> = {
  'quick': 'Quick Session',
  'full-body': 'Full Body',
  'upper': 'Upper Body',
  'lower': 'Lower Body'
};

/** Debounce time for auto-save while typing (ms) */
const AUTOSAVE_DEBOUNCE_MS = 300;

/**
 * Combined view model for displaying session exercises with their details and sets.
 */
interface SessionExerciseView {
  sessionExercise: SessionExercise;
  exercise: Exercise;
  sets: Set[];
  showRpe: boolean;
  isLoadingSets: boolean;
}

/**
 * Pending set update for debouncing.
 */
interface PendingSetUpdate {
  set: Set;
}

/**
 * State for undoing an exercise removal.
 * Only one undo is supported at a time; new removals replace the previous.
 */
interface UndoState {
  /** The removed SessionExerciseView (contains sessionExercise, exercise, sets) */
  item: SessionExerciseView;
  /** Original index in the sessionExercises array */
  originalIndex: number;
}

/** Undo window duration in milliseconds */
const UNDO_TIMEOUT_MS = 5000;

@Component({
  selector: 'app-session',
  templateUrl: './session.page.html',
  styleUrls: ['./session.page.scss'],
  standalone: false
})
export class SessionPage implements OnInit, OnDestroy, ViewWillEnter {
  /** Current session loaded from DB */
  session: Session | null = null;

  /** Session exercises with exercise details, in order */
  sessionExercises: SessionExerciseView[] = [];

  /** Loading state */
  isLoading = true;

  /** Loading state for exercises list */
  isLoadingExercises = false;

  /** Error state */
  loadError = false;

  /** Finishing session in progress */
  isFinishing = false;

  /**
   * Ghost Mode: cached last attempt data per exercise.
   * Keyed by exerciseId for lookup when rendering.
   * null = no previous attempt exists (normal state).
   */
  ghostByExerciseId: Record<string, LastAttemptResult | null> = {};

  /**
   * Undo state for exercise removal.
   * Only one undoable action at a time; null when no undo is available.
   */
  undoState: UndoState | null = null;

  /** Timer reference for auto-clearing undo state */
  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  /** Subject for debounced set updates */
  private setUpdateSubject = new Subject<PendingSetUpdate>();

  /** Destroy subject for cleanup */
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: DbService,
    private modalController: ModalController,
    private appEvents: AppEventsService,
    private xpService: XpService
  ) {
    // Set up debounced auto-save for set updates
    this.setUpdateSubject.pipe(
      debounceTime(AUTOSAVE_DEBOUNCE_MS),
      takeUntil(this.destroy$)
    ).subscribe(update => {
      this.persistSet(update.set);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clean up undo timer
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
  }

  async ngOnInit(): Promise<void> {
    // Session ID extracted in ionViewWillEnter
  }

  /**
   * Ionic lifecycle hook: called every time the page becomes active.
   * Resets state and reloads data to ensure fresh state after edits.
   */
  async ionViewWillEnter(): Promise<void> {
    // Reset finishing state (critical: prevents disabled button bug)
    this.isFinishing = false;

    // Clear any stale undo state
    this.clearUndo();

    const sessionId = this.route.snapshot.paramMap.get('id');
    if (!sessionId) {
      this.loadError = true;
      this.isLoading = false;
      return;
    }

    await this.loadSession(sessionId);
  }

  /**
   * Load session from database.
   */
  private async loadSession(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const session = await this.db.getSession(id);
      if (session) {
        this.session = session;
        await this.loadSessionExercises();
      } else {
        this.loadError = true;
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      this.loadError = true;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load session exercises with their exercise details.
   * Avoids N+1 by batch-loading exercises.
   */
  private async loadSessionExercises(): Promise<void> {
    if (!this.session) return;

    this.isLoadingExercises = true;
    try {
      // Get all session exercises for this session (sorted by orderIndex)
      const sessionExercises = await this.db.getSessionExercises(this.session.id);

      if (sessionExercises.length === 0) {
        this.sessionExercises = [];
        return;
      }

      // Batch load all exercises by their IDs
      const exerciseIds = sessionExercises.map(se => se.exerciseId);
      const exerciseMap = await this.db.getExercisesByIds(exerciseIds);

      // Combine into view models with empty sets (will load lazily)
      this.sessionExercises = sessionExercises
        .map((se): SessionExerciseView | null => {
          const exercise = exerciseMap.get(se.exerciseId);
          if (!exercise) {
            console.warn(`Exercise not found for id: ${se.exerciseId}`);
            return null;
          }
          return {
            sessionExercise: se,
            exercise,
            sets: [] as Set[],
            showRpe: false,
            isLoadingSets: true
          };
        })
        .filter((item): item is SessionExerciseView => item !== null);

      // Load sets and ghost data for all exercises in parallel
      await Promise.all([
        this.loadAllSets(),
        this.loadAllGhostData()
      ]);
    } catch (error) {
      console.error('Failed to load session exercises:', error);
    } finally {
      this.isLoadingExercises = false;
    }
  }

  /**
   * Load sets for all session exercises.
   */
  private async loadAllSets(): Promise<void> {
    await Promise.all(
      this.sessionExercises.map(item => this.loadSetsForExercise(item))
    );
  }

  /**
   * Load ghost (last attempt) data for all session exercises.
   * Fetches in parallel for performance.
   */
  private async loadAllGhostData(): Promise<void> {
    if (!this.session) return;

    await Promise.all(
      this.sessionExercises.map(item => this.loadGhostForExercise(item.exercise.id))
    );
  }

  /**
   * Load ghost (last attempt) data for a single exercise.
   * Caches result in ghostByExerciseId. No UI noise on error.
   */
  private async loadGhostForExercise(exerciseId: string): Promise<void> {
    if (!this.session) return;

    // Skip if already loaded (avoid redundant calls)
    if (exerciseId in this.ghostByExerciseId) return;

    try {
      const result = await this.db.getLastAttempt(exerciseId, this.session.id);
      this.ghostByExerciseId[exerciseId] = result;
    } catch (error) {
      console.error(`Failed to load ghost data for exercise ${exerciseId}:`, error);
      // Mark as checked to avoid retrying
      this.ghostByExerciseId[exerciseId] = null;
    }
  }

  /**
   * Load sets for a specific session exercise.
   */
  private async loadSetsForExercise(item: SessionExerciseView): Promise<void> {
    item.isLoadingSets = true;
    try {
      item.sets = await this.db.getSetsForSessionExercise(item.sessionExercise.id);
    } catch (error) {
      console.error(`Failed to load sets for exercise ${item.sessionExercise.id}:`, error);
      item.sets = [];
    } finally {
      item.isLoadingSets = false;
    }
  }

  /**
   * Open the exercise picker modal.
   */
  async openExercisePicker(): Promise<void> {
    const modal = await this.modalController.create({
      component: ExercisePickerComponent
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.exercise) {
      await this.addExerciseToSession(data.exercise);
    }
  }

  /**
   * Add an exercise to the current session.
   */
  private async addExerciseToSession(exercise: Exercise): Promise<void> {
    if (!this.session) return;

    try {
      // Get the next orderIndex
      const orderIndex = await this.db.getNextOrderIndex(this.session.id);

      // Create the SessionExercise record
      const sessionExercise: SessionExercise = {
        id: crypto.randomUUID(),
        sessionId: this.session.id,
        exerciseId: exercise.id,
        orderIndex
      };

      await this.db.addSessionExercise(sessionExercise);

      // Add to local list immediately (optimistic update)
      this.sessionExercises.push({
        sessionExercise,
        exercise,
        sets: [] as Set[],
        showRpe: false,
        isLoadingSets: false
      });

      // Load ghost data for the newly added exercise (non-blocking)
      this.loadGhostForExercise(exercise.id);
    } catch (error) {
      console.error('Failed to add exercise to session:', error);
    }
  }

  /**
   * Finish the current session.
   * Updates endedAt and updatedAt, awards XP, then navigates to summary.
   */
  async finishSession(): Promise<void> {
    if (!this.session || this.isFinishing) return;

    this.isFinishing = true;
    try {
      const now = new Date().toISOString();
      this.session.endedAt = now;
      this.session.updatedAt = now;

      await this.db.updateSession(this.session);

      // Award XP for completing the session (only awards if not already awarded)
      await this.xpService.awardSessionXp(this.session.id);

      // Notify other components that session data has changed
      this.appEvents.emitSessionDataChanged();

      // Navigate to session summary
      this.router.navigate(['/session', this.session.id, 'summary']);
    } catch (error) {
      console.error('Failed to finish session:', error);
      this.isFinishing = false;
    }
  }

  // ============================================
  // Exercise removal + undo
  // ============================================

  /**
   * Remove an exercise from the current session.
   * Deletes the SessionExercise and all associated sets from IndexedDB.
   * Shows undo affordance for a short window.
   */
  async removeExercise(item: SessionExerciseView): Promise<void> {
    // Clear any previous undo state (only one at a time)
    this.clearUndo();

    // Find the index in the array
    const index = this.sessionExercises.findIndex(
      se => se.sessionExercise.id === item.sessionExercise.id
    );
    if (index === -1) return;

    try {
      // Delete from IndexedDB
      await this.db.deleteSessionExercise(item.sessionExercise.id);

      // Remove from local array
      this.sessionExercises.splice(index, 1);

      // Store undo state
      this.undoState = {
        item,
        originalIndex: index
      };

      // Set timer to auto-clear undo
      this.undoTimer = setTimeout(() => {
        this.clearUndo();
      }, UNDO_TIMEOUT_MS);
    } catch (error) {
      console.error('Failed to remove exercise:', error);
    }
  }

  /**
   * Undo the last exercise removal.
   * Restores the exercise and all its sets to IndexedDB and UI.
   */
  async undoRemoveExercise(): Promise<void> {
    if (!this.undoState) return;

    const { item, originalIndex } = this.undoState;

    try {
      // Restore to IndexedDB
      await this.db.restoreSessionExercise(item.sessionExercise, item.sets);

      // Restore to local array at original position
      this.sessionExercises.splice(originalIndex, 0, item);

      // Clear undo state
      this.clearUndo();
    } catch (error) {
      console.error('Failed to undo exercise removal:', error);
      // Clear undo state even on error to avoid stale state
      this.clearUndo();
    }
  }

  /**
   * Clear the undo state and timer.
   */
  private clearUndo(): void {
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
    this.undoState = null;
  }

  // ============================================
  // Exercise reordering
  // ============================================

  /**
   * Handle exercise reorder event from ion-reorder-group.
   * Updates local array and persists new orderIndex values to IndexedDB.
   * Drag = truth; no confirmation, no undo.
   */
  async handleExerciseReorder(event: CustomEvent<ItemReorderEventDetail>): Promise<void> {
    const { from, to } = event.detail;

    // Complete the reorder in the DOM (required by Ionic)
    event.detail.complete();

    // Guard: no actual change
    if (from === to) return;

    // Reorder local array
    const [movedItem] = this.sessionExercises.splice(from, 1);
    this.sessionExercises.splice(to, 0, movedItem);

    // Update orderIndex for all items and persist
    const updates = this.sessionExercises.map((item, index) => ({
      id: item.sessionExercise.id,
      orderIndex: index
    }));

    // Update local state immediately
    this.sessionExercises.forEach((item, index) => {
      item.sessionExercise.orderIndex = index;
    });

    // Persist to IndexedDB (non-blocking, no UI feedback)
    try {
      await this.db.updateSessionExerciseOrder(updates);
    } catch (error) {
      console.error('Failed to persist exercise order:', error);
      // Note: local state already updated; reload would fix any inconsistency
    }
  }

  // ============================================
  // Set management
  // ============================================

  /**
   * Add a new set to a session exercise.
   */
  async addSet(item: SessionExerciseView): Promise<void> {
    try {
      const setIndex = await this.db.getNextSetIndex(item.sessionExercise.id);
      const newSet: Set = {
        id: crypto.randomUUID(),
        sessionExerciseId: item.sessionExercise.id,
        setIndex,
        createdAt: new Date().toISOString()
      };

      await this.db.addSet(newSet);

      // Add to local list immediately
      item.sets.push(newSet);
    } catch (error) {
      console.error('Failed to add set:', error);
    }
  }

  /**
   * Remove a set from a session exercise.
   */
  async removeSet(item: SessionExerciseView, set: Set): Promise<void> {
    try {
      await this.db.deleteSet(set.id);

      // Remove from local list
      const index = item.sets.findIndex(s => s.id === set.id);
      if (index !== -1) {
        item.sets.splice(index, 1);
      }

      // Reindex remaining sets
      await this.db.reindexSets(item.sessionExercise.id);

      // Update local setIndex values to match
      item.sets.forEach((s, i) => {
        s.setIndex = i;
      });
    } catch (error) {
      console.error('Failed to remove set:', error);
    }
  }

  /**
   * Toggle RPE visibility for an exercise.
   */
  toggleRpe(item: SessionExerciseView): void {
    item.showRpe = !item.showRpe;
  }

  // ============================================
  // Input change handlers (debounced auto-save)
  // ============================================

  /**
   * Handle weight input change (debounced).
   */
  onWeightChange(set: Set, value: string): void {
    set.weight = this.parseWeight(value);
    this.queueSetUpdate(set);
  }

  /**
   * Handle reps input change (debounced).
   */
  onRepsChange(set: Set, value: string): void {
    set.reps = this.parseReps(value);
    this.queueSetUpdate(set);
  }

  /**
   * Handle RPE input change (debounced).
   */
  onRpeChange(set: Set, value: string): void {
    set.rpe = this.parseRpe(value);
    this.queueSetUpdate(set);
  }

  /**
   * Handle input blur - persist immediately.
   */
  onInputBlur(set: Set): void {
    this.persistSet(set);
  }

  /**
   * Queue a set update for debounced persistence.
   */
  private queueSetUpdate(set: Set): void {
    this.setUpdateSubject.next({ set });
  }

  /**
   * Persist a set to the database.
   */
  private async persistSet(set: Set): Promise<void> {
    try {
      await this.db.updateSet(set);
    } catch (error) {
      console.error('Failed to persist set:', error);
    }
  }

  // ============================================
  // Input parsing helpers
  // ============================================

  /**
   * Parse weight input to number or undefined.
   */
  private parseWeight(value: string): number | undefined {
    if (!value || value.trim() === '') return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse reps input to integer or undefined.
   */
  private parseReps(value: string): number | undefined {
    if (!value || value.trim() === '') return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse RPE input to integer (clamped 1-10) or undefined.
   */
  private parseRpe(value: string): number | undefined {
    if (!value || value.trim() === '') return undefined;
    const num = parseInt(value, 10);
    if (isNaN(num)) return undefined;
    return Math.max(1, Math.min(10, num));
  }

  /**
   * Format start time for display.
   */
  formatStartTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Format start date for display.
   */
  formatStartDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  /**
   * Get quest label for display.
   */
  getQuestLabel(questId: QuestId | undefined): string | null {
    if (!questId) return null;
    return QUEST_LABELS[questId] || null;
  }

  /**
   * Format category for display.
   */
  formatCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  // ============================================
  // Ghost Mode helpers
  // ============================================

  /**
   * Get ghost data for an exercise (if available).
   * Returns null if no previous attempt exists.
   */
  getGhost(exerciseId: string): LastAttemptResult | null {
    return this.ghostByExerciseId[exerciseId] ?? null;
  }

  /**
   * Format ghost session date for display.
   * Returns compact format like "Jan 3" or "Dec 15".
   */
  formatGhostDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  /**
   * Format a ghost set for display.
   * Returns "{weight} kg × {reps}" with graceful handling of missing values.
   */
  formatGhostSet(set: Set): string {
    const weightStr = set.weight !== undefined ? `${set.weight} kg` : '—';
    const repsStr = set.reps !== undefined ? `${set.reps}` : '—';
    return `${weightStr} × ${repsStr}`;
  }

  /**
   * Check if copy last sets action should be shown for an exercise.
   * Only show when ghost exists with sets AND current exercise has no sets yet.
   */
  canCopyLastSets(item: SessionExerciseView): boolean {
    const ghost = this.getGhost(item.exercise.id);
    return ghost !== null && ghost.sets.length > 0 && item.sets.length === 0;
  }

  /**
   * Copy sets from the last attempt into the current session exercise.
   * Creates new Set records with new IDs, preserving weight/reps/rpe values.
   */
  async copyLastSets(item: SessionExerciseView): Promise<void> {
    // Guard: check if copy is allowed
    if (!this.canCopyLastSets(item)) return;

    const ghost = this.getGhost(item.exercise.id);
    if (!ghost || ghost.sets.length === 0) return;

    try {
      const now = new Date().toISOString();

      // Create new Set records from the ghost sets
      const newSets: Set[] = ghost.sets.map((templateSet, index) => ({
        id: crypto.randomUUID(),
        sessionExerciseId: item.sessionExercise.id,
        setIndex: index,
        weight: templateSet.weight,
        reps: templateSet.reps,
        rpe: templateSet.rpe,
        isWarmup: templateSet.isWarmup,
        createdAt: now
      }));

      // Persist all sets in a single transaction
      await this.db.bulkAddSets(newSets);

      // Update local state immediately
      item.sets = newSets;
    } catch (error) {
      console.error('Failed to copy last sets:', error);
    }
  }
}
