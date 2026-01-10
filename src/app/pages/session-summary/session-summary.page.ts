import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Session, SessionExercise, Exercise, QuestId } from '../../models';
import { DbService } from '../../services/db';

/** Map quest IDs to display labels */
const QUEST_LABELS: Record<QuestId, string> = {
  'quick': 'Quick Session',
  'full-body': 'Full Body',
  'upper': 'Upper Body',
  'lower': 'Lower Body'
};

/**
 * View model for exercise summary display.
 */
interface ExerciseSummary {
  name: string;
  category: string;
  setCount: number;
}

@Component({
  selector: 'app-session-summary',
  templateUrl: './session-summary.page.html',
  styleUrls: ['./session-summary.page.scss'],
  standalone: false
})
export class SessionSummaryPage implements OnInit {
  /** Session loaded from DB */
  session: Session | null = null;

  /** Exercise summaries with set counts */
  exercises: ExerciseSummary[] = [];

  /** Loading state */
  isLoading = true;

  /** Error state */
  loadError = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: DbService
  ) {}

  async ngOnInit(): Promise<void> {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (!sessionId) {
      this.loadError = true;
      this.isLoading = false;
      return;
    }

    await this.loadSessionSummary(sessionId);
  }

  /**
   * Load session and exercise data.
   */
  private async loadSessionSummary(sessionId: string): Promise<void> {
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

      // Load set counts for each exercise
      const summaries: ExerciseSummary[] = [];
      for (const se of sessionExercises) {
        const exercise = exerciseMap.get(se.exerciseId);
        if (!exercise) continue;

        const sets = await this.db.getSetsForSessionExercise(se.id);
        summaries.push({
          name: exercise.name,
          category: exercise.category,
          setCount: sets.length
        });
      }

      this.exercises = summaries;
    } catch (error) {
      console.error('Failed to load session summary:', error);
      this.loadError = true;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Navigate back to home.
   */
  goHome(): void {
    this.router.navigate(['/tabs/home']);
  }

  /**
   * Get quest label for display.
   */
  getQuestLabel(questId: QuestId | undefined): string | null {
    if (!questId) return null;
    return QUEST_LABELS[questId] || null;
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
   * Get total set count.
   */
  getTotalSets(): number {
    return this.exercises.reduce((sum, ex) => sum + ex.setCount, 0);
  }

  /**
   * Format category for display.
   */
  formatCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

