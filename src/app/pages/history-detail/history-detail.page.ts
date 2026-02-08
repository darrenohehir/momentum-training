import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Session, SessionExercise, Exercise, Set } from '../../models';
import { DbService } from '../../services/db';
import { formatSetDisplay } from '../../utils';

/**
 * View model for displaying an exercise with its sets in history.
 */
interface ExerciseWithSets {
  exercise: Exercise;
  sessionExercise: SessionExercise;
  sets: Set[];
}

@Component({
  selector: 'app-history-detail',
  templateUrl: './history-detail.page.html',
  styleUrls: ['./history-detail.page.scss'],
  standalone: false
})
export class HistoryDetailPage implements OnInit {
  /** Session loaded from DB */
  session: Session | null = null;

  /** Exercises with their sets */
  exercises: ExerciseWithSets[] = [];

  /** Loading state */
  isLoading = true;

  /** Error state */
  loadError = false;

  constructor(
    private route: ActivatedRoute,
    private navController: NavController,
    private db: DbService
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
   * Load session and all related data.
   */
  private async loadSession(sessionId: string): Promise<void> {
    this.isLoading = true;
    try {
      // Load session
      const session = await this.db.getSession(sessionId);
      if (!session) {
        this.loadError = true;
        return;
      }
      this.session = session;

      // Load session exercises
      const sessionExercises = await this.db.getSessionExercises(sessionId);
      if (sessionExercises.length === 0) {
        this.exercises = [];
        return;
      }

      // Load exercise details
      const exerciseIds = sessionExercises.map(se => se.exerciseId);
      const exerciseMap = await this.db.getExercisesByIds(exerciseIds);

      // Load sets for each exercise
      const exercisesWithSets: ExerciseWithSets[] = [];
      for (const se of sessionExercises) {
        const exercise = exerciseMap.get(se.exerciseId);
        if (!exercise) continue;

        const sets = await this.db.getSetsForSessionExercise(se.id);
        exercisesWithSets.push({
          exercise,
          sessionExercise: se,
          sets
        });
      }

      this.exercises = exercisesWithSets;
    } catch (error) {
      console.error('Failed to load session:', error);
      this.loadError = true;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Navigate back to history list.
   */
  goBack(): void {
    this.navController.back();
  }

  /**
   * Format date for display.
   */
  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format time for display.
   */
  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Calculate duration in minutes.
   */
  getDurationMinutes(): number {
    if (!this.session?.startedAt || !this.session?.endedAt) return 0;
    const start = new Date(this.session.startedAt).getTime();
    const end = new Date(this.session.endedAt).getTime();
    return Math.round((end - start) / (1000 * 60));
  }

  /**
   * Format category for display.
   */
  formatCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  /**
   * Format a set for display (weight × reps).
   */
  formatSet(set: Set): string {
    return formatSetDisplay(set);
  }

  /**
   * Format RPE if present.
   */
  formatRpe(set: Set): string | null {
    return set.rpe !== undefined ? `RPE ${set.rpe}` : null;
  }
}
