import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewWillEnter, NavController } from '@ionic/angular';
import { Session, SessionExercise, Exercise, QuestId, PREvent } from '../../models';
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

/**
 * View model for PR display with exercise name.
 */
interface PRSummary {
  exerciseName: string;
  previousMax: number;
  newMax: number;
}

@Component({
  selector: 'app-session-summary',
  templateUrl: './session-summary.page.html',
  styleUrls: ['./session-summary.page.scss'],
  standalone: false
})
export class SessionSummaryPage implements OnInit, ViewWillEnter {
  /** Session loaded from DB */
  session: Session | null = null;

  /** Exercise summaries with set counts */
  exercises: ExerciseSummary[] = [];

  /** PRs detected for this session */
  prs: PRSummary[] = [];

  /** Loading state */
  isLoading = true;

  /** Error state */
  loadError = false;

  /** Session ID from route (stored for re-fetching) */
  private sessionId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navController: NavController,
    private db: DbService
  ) {}

  ngOnInit(): void {
    // Extract session ID from route params (only once)
    this.sessionId = this.route.snapshot.paramMap.get('id');
    if (!this.sessionId) {
      this.loadError = true;
      this.isLoading = false;
    }
  }

  /**
   * Ionic lifecycle hook: called every time the page becomes active.
   * Re-fetches session data to ensure the summary reflects the latest state.
   */
  async ionViewWillEnter(): Promise<void> {
    if (!this.sessionId) return;
    await this.loadSessionSummary(this.sessionId);
  }

  /**
   * Load session, exercise, and PR data.
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

      // Load PRs for this session
      const prEvents = await this.db.getPREventsForSession(sessionId);
      if (prEvents.length > 0) {
        // Get exercise names for PRs
        const prExerciseIds = prEvents.map(pr => pr.exerciseId);
        const prExerciseMap = await this.db.getExercisesByIds(prExerciseIds);

        this.prs = prEvents.map(pr => {
          const exercise = prExerciseMap.get(pr.exerciseId);
          return {
            exerciseName: exercise?.name || 'Unknown Exercise',
            previousMax: pr.previousMax,
            newMax: pr.newMax
          };
        });
      } else {
        this.prs = [];
      }

    } catch (error) {
      console.error('Failed to load session summary:', error);
      this.loadError = true;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Navigate to History tab after completing a session.
   * Replaces the stack so back does not return to the summary screen.
   */
  goToHistory(): void {
    this.navController.navigateRoot('/tabs/history', {
      replaceUrl: true,
      animated: true,
      animationDirection: 'back'
    });
  }

  /**
   * Navigate to the session page to edit the completed session.
   * The session page supports editing completed sessions.
   */
  editSession(): void {
    if (!this.session) return;
    this.router.navigate(['/session', this.session.id]);
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
