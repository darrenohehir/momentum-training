import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Session, SessionExercise, Exercise, QuestId } from '../../models';
import { DbService } from '../../services/db';
import { ExercisePickerComponent } from '../../components/exercise-picker/exercise-picker.component';

/** Map quest IDs to display labels */
const QUEST_LABELS: Record<QuestId, string> = {
  'quick': 'Quick Session',
  'full-body': 'Full Body',
  'upper': 'Upper Body',
  'lower': 'Lower Body'
};

/**
 * Combined view model for displaying session exercises with their details.
 */
interface SessionExerciseView {
  sessionExercise: SessionExercise;
  exercise: Exercise;
}

@Component({
  selector: 'app-session',
  templateUrl: './session.page.html',
  styleUrls: ['./session.page.scss'],
  standalone: false
})
export class SessionPage implements OnInit {
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

  constructor(
    private route: ActivatedRoute,
    private db: DbService,
    private modalController: ModalController
  ) {}

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

      // Combine into view models
      this.sessionExercises = sessionExercises
        .map(se => {
          const exercise = exerciseMap.get(se.exerciseId);
          if (!exercise) {
            console.warn(`Exercise not found for id: ${se.exerciseId}`);
            return null;
          }
          return { sessionExercise: se, exercise };
        })
        .filter((item): item is SessionExerciseView => item !== null);
    } catch (error) {
      console.error('Failed to load session exercises:', error);
    } finally {
      this.isLoadingExercises = false;
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
        exercise
      });
    } catch (error) {
      console.error('Failed to add exercise to session:', error);
      // TODO: Show error toast
    }
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
