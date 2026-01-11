import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Session, QuestId, computeLevel } from '../../models';
import { DbService } from '../../services/db';
import { MomentumService, MomentumStatus } from '../../services/momentum';
import { AppEventsService } from '../../services/events';

/** Maximum number of recent sessions to display */
const MAX_RECENT_SESSIONS = 5;

/** Quest ID to display name mapping */
const QUEST_NAMES: Record<QuestId, string> = {
  'quick': 'Quick Session',
  'full-body': 'Full Body',
  'upper': 'Upper Body',
  'lower': 'Lower Body'
};

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy, ViewWillEnter {
  /** Momentum status (Active/Paused, days remaining) */
  momentum: MomentumStatus | null = null;

  /** Recent completed sessions */
  recentSessions: Session[] = [];

  /** Total XP accumulated */
  totalXp = 0;

  /** Current level (derived from XP) */
  level = 1;

  /** Loading state */
  isLoading = true;

  /** Subscription for session data changes */
  private sessionDataSub: Subscription | null = null;

  constructor(
    private db: DbService,
    private momentumService: MomentumService,
    private router: Router,
    private appEvents: AppEventsService
  ) {}

  ngOnInit(): void {
    // Subscribe to session data changes
    this.sessionDataSub = this.appEvents.sessionDataChanged$.subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription
    if (this.sessionDataSub) {
      this.sessionDataSub.unsubscribe();
      this.sessionDataSub = null;
    }
  }

  /**
   * Ionic lifecycle hook: reload data when page becomes active.
   */
  async ionViewWillEnter(): Promise<void> {
    await this.loadData();
  }

  /**
   * Load momentum status, recent sessions, and gamification state.
   */
  private async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      // Load completed sessions
      const completedSessions = await this.db.getCompletedSessions();

      // Calculate momentum
      this.momentum = this.momentumService.calculateMomentum(completedSessions);

      // Get recent sessions (already sorted newest first)
      this.recentSessions = completedSessions.slice(0, MAX_RECENT_SESSIONS);

      // Load gamification state
      const gamificationState = await this.db.getGamificationState();
      this.totalXp = gamificationState?.totalXp ?? 0;
      this.level = computeLevel(this.totalXp);
    } catch (error) {
      console.error('Failed to load home data:', error);
      this.momentum = null;
      this.recentSessions = [];
      this.totalXp = 0;
      this.level = 1;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Navigate to session history detail.
   */
  viewSession(session: Session): void {
    this.router.navigate(['/history', session.id]);
  }

  /**
   * Format date for display (e.g., "Jan 9").
   */
  formatDate(isoString: string | undefined): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  /**
   * Format full date for display (e.g., "Mon, Jan 9").
   */
  formatFullDate(isoString: string | undefined): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Calculate duration in minutes.
   * Returns at least 1 minute for very short sessions.
   */
  getDuration(session: Session): number | null {
    if (!session.startedAt || !session.endedAt) return null;
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.endedAt).getTime();
    const minutes = Math.round((end - start) / (1000 * 60));
    // Minimum 1 minute for display
    return Math.max(1, minutes);
  }

  /**
   * Format days remaining text.
   */
  formatDaysRemaining(days: number): string {
    if (days === 0) return '0 days remaining';
    if (days === 1) return '1 day remaining';
    return `${days} days remaining`;
  }

  /**
   * Get quest name or fallback to "Session".
   */
  getQuestName(session: Session): string {
    if (session.questId && QUEST_NAMES[session.questId]) {
      return QUEST_NAMES[session.questId];
    }
    return 'Session';
  }

  /**
   * Navigate to the History tab.
   */
  goToHistory(): void {
    this.router.navigate(['/tabs/history']);
  }
}
