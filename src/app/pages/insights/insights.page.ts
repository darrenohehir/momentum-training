import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { Session } from '../../models';
import { DbService } from '../../services/db';

@Component({
  selector: 'app-insights',
  templateUrl: './insights.page.html',
  styleUrls: ['./insights.page.scss'],
  standalone: false
})
export class InsightsPage implements OnInit, ViewWillEnter {
  /** Completed sessions (newest first) */
  sessions: Session[] = [];

  /** Loading state */
  isLoading = true;

  constructor(
    private db: DbService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initial load handled by ionViewWillEnter
  }

  /**
   * Ionic lifecycle hook: reload data when page becomes active.
   */
  async ionViewWillEnter(): Promise<void> {
    await this.loadSessions();
  }

  /**
   * Load completed sessions from IndexedDB.
   */
  private async loadSessions(): Promise<void> {
    this.isLoading = true;
    try {
      this.sessions = await this.db.getCompletedSessions();
    } catch (error) {
      console.error('Failed to load sessions:', error);
      this.sessions = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Navigate to session detail view.
   */
  viewSession(session: Session): void {
    this.router.navigate(['/history', session.id]);
  }

  /**
   * Format date for display (e.g., "Mon, Jan 6").
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
   * Calculate duration in minutes.
   */
  getDuration(session: Session): number | null {
    if (!session.startedAt || !session.endedAt) return null;
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.endedAt).getTime();
    return Math.round((end - start) / (1000 * 60));
  }
}
