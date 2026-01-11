import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { Session, QuestId } from '../../models';
import { DbService } from '../../services/db';

/** Quest ID to display name mapping */
const QUEST_NAMES: Record<QuestId, string> = {
  'quick': 'Quick Session',
  'full-body': 'Full Body',
  'upper': 'Upper Body',
  'lower': 'Lower Body'
};

/** Interface for weekly session breakdown */
interface WeeklyBreakdown {
  weekLabel: string;  // e.g., "This week", "Last week", "2 weeks ago", "3 weeks ago"
  count: number;
}

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

  /** Total sessions in last 4 weeks */
  sessionsLast4Weeks = 0;

  /** Per-week breakdown (current week first) */
  weeklyBreakdown: WeeklyBreakdown[] = [];

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
      this.calculateWeeklyInsights();
    } catch (error) {
      console.error('Failed to load sessions:', error);
      this.sessions = [];
      this.sessionsLast4Weeks = 0;
      this.weeklyBreakdown = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Calculate sessions per week for the last 4 weeks.
   * Uses Monday as week start (AU-friendly).
   */
  private calculateWeeklyInsights(): void {
    const now = new Date();
    
    // Get the most recent Monday (start of current week)
    const currentWeekStart = this.getMondayOfWeek(now);
    
    // Calculate week boundaries (4 weeks back)
    const weekBoundaries: { start: Date; end: Date; label: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const label = i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i} weeks ago`;
      weekBoundaries.push({ start: weekStart, end: weekEnd, label });
    }
    
    // Count sessions per week
    const weeklyCounts: WeeklyBreakdown[] = weekBoundaries.map(week => ({
      weekLabel: week.label,
      count: 0
    }));
    
    let totalLast4Weeks = 0;
    
    for (const session of this.sessions) {
      if (!session.endedAt) continue;
      
      const sessionDate = new Date(session.endedAt);
      
      // Check which week this session falls into
      for (let i = 0; i < weekBoundaries.length; i++) {
        const week = weekBoundaries[i];
        if (sessionDate >= week.start && sessionDate < week.end) {
          weeklyCounts[i].count++;
          totalLast4Weeks++;
          break;
        }
      }
    }
    
    this.sessionsLast4Weeks = totalLast4Weeks;
    this.weeklyBreakdown = weeklyCounts;
  }

  /**
   * Get the Monday of the week containing the given date.
   * Sets time to start of day (00:00:00.000).
   */
  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    // We need to find how many days back Monday is
    const diff = day === 0 ? 6 : day - 1; // Sunday = go back 6 days, otherwise go back (day - 1)
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
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
   * Returns at least 1 minute for very short sessions.
   */
  getDuration(session: Session): number | null {
    if (!session.startedAt || !session.endedAt) return null;
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.endedAt).getTime();
    const minutes = Math.round((end - start) / (1000 * 60));
    return Math.max(1, minutes);
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
}
