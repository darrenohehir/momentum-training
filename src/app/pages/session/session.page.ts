import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Session, SessionExercise, Exercise, QuestId, Set } from '../../models';
import { DbService } from '../../services/db';
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

@Component({
  selector: 'app-session',
  templateUrl: './session.page.html',
  styleUrls: ['./session.page.scss'],
  standalone: false
})
export class SessionPage implements OnInit, OnDestroy {
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

  /** Subject for debounced set updates */
  private setUpdateSubject = new Subject<PendingSetUpdate>();

  /** Destroy subject for cleanup */
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private db: DbService,
    private modalController: ModalController
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
  }

  async ngOnInit(): Promise<void> {
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

      // Load sets for all exercises
      await this.loadAllSets();
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
    } catch (error) {
      console.error('Failed to add exercise to session:', error);
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
}
