import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Session } from '../../models';
import { DbService } from '../../services/db';
import { MomentumService, MomentumStatus } from '../../services/momentum';
import { AppEventsService } from '../../services/events';

/** Maximum number of recent sessions to display */
const MAX_RECENT_SESSIONS = 5;

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
   * Load momentum status and recent sessions.
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
    } catch (error) {
      console.error('Failed to load home data:', error);
      this.momentum = null;
      this.recentSessions = [];
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
   */
  getDuration(session: Session): number | null {
    if (!session.startedAt || !session.endedAt) return null;
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.endedAt).getTime();
    return Math.round((end - start) / (1000 * 60));
  }

  /**
   * Format days remaining text.
   */
  formatDaysRemaining(days: number): string {
    if (days === 0) return '0 days remaining';
    if (days === 1) return '1 day remaining';
    return `${days} days remaining`;
  }
}
