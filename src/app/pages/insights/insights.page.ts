import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Session, QuestId, PREvent, BodyweightEntry, FoodEntry, deriveLocalDate } from '../../models';
import { DbService } from '../../services/db';
import { ActivityEventsService } from '../../services/events';
import { formatDisplayDate, formatDisplayTime, truncateText } from '../../utils';

/** Number of days to load for unified history list (bounded query). */
const HISTORY_DAYS = 60;

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

/** Interface for PR display with exercise name */
interface PRDisplayItem extends PREvent {
  exerciseName: string;
}

/** View model for a single item in the unified history list. */
export interface HistoryItem {
  type: 'session' | 'bodyweight' | 'food';
  id: string;
  loggedAt: string;
  dayKey: string;
  timeText: string;
  secondaryText: string;
}

/** A day group in the unified history list (newest first). */
export interface HistoryDayGroup {
  dayKey: string;
  dateHeading: string;
  items: HistoryItem[];
}

@Component({
  selector: 'app-insights',
  templateUrl: './insights.page.html',
  styleUrls: ['./insights.page.scss'],
  standalone: false
})
export class InsightsPage implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  /** Completed sessions (newest first) – used for weekly insights and PRs */
  sessions: Session[] = [];

  /** Unified history list grouped by day (newest first) */
  unifiedGroups: HistoryDayGroup[] = [];

  /** Loading state */
  isLoading = true;

  /** Total sessions in last 4 weeks */
  sessionsLast4Weeks = 0;

  /** Per-week breakdown (current week first) */
  weeklyBreakdown: WeeklyBreakdown[] = [];

  /** Recent PRs with exercise names */
  recentPRs: PRDisplayItem[] = [];

  /** True when this tab/page is visible (so we only refresh on activityChanged when active). */
  private isActive = false;

  /** Prevents overlapping loads when activityChanged fires. */
  private isRefreshing = false;

  private activityChangedSub: Subscription | null = null;

  constructor(
    private db: DbService,
    private router: Router,
    private activityEvents: ActivityEventsService
  ) {}

  ngOnInit(): void {
    this.activityChangedSub = this.activityEvents.activityChanged$.subscribe(() => {
      if (this.isActive && !this.isRefreshing) {
        this.loadSessions();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.activityChangedSub) {
      this.activityChangedSub.unsubscribe();
      this.activityChangedSub = null;
    }
  }

  /**
   * Ionic lifecycle hook: reload data when page becomes active.
   */
  async ionViewWillEnter(): Promise<void> {
    this.isActive = true;
    await this.loadSessions();
  }

  /**
   * Ionic lifecycle hook: mark page as not active when leaving.
   */
  ionViewWillLeave(): void {
    this.isActive = false;
  }

  /**
   * Load completed sessions, unified history (sessions + bodyweight + food), and recent PRs.
   * Uses bounded queries (60-day window for unified list, 28-day for weekly insights).
   */
  private async loadSessions(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    this.isLoading = true;
    try {
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - HISTORY_DAYS);

      const [sessionsLast28Days, prEvents, sessionsSince60d, bodyweightSince60d, foodSince60d] = await Promise.all([
        this.db.getCompletedSessionsSince(fourWeeksAgo),
        this.db.getRecentPREvents(10),
        this.db.getCompletedSessionsSince(sixtyDaysAgo),
        this.db.getBodyweightEntriesSince(sixtyDaysAgo),
        this.db.getFoodEntriesSince(sixtyDaysAgo)
      ]);

      this.calculateWeeklyInsights(sessionsLast28Days);

      if (prEvents.length > 0) {
        const exerciseIds = [...new Set(prEvents.map(pr => pr.exerciseId))];
        const exerciseMap = await this.db.getExercisesByIds(exerciseIds);
        this.recentPRs = prEvents.map(pr => ({
          ...pr,
          exerciseName: exerciseMap.get(pr.exerciseId)?.name || 'Unknown Exercise'
        }));
      } else {
        this.recentPRs = [];
      }

      this.unifiedGroups = this.buildUnifiedHistoryGroups(
        sessionsSince60d,
        bodyweightSince60d,
        foodSince60d
      );
    } catch (error) {
      console.error('Failed to load history data:', error);
      this.sessionsLast4Weeks = 0;
      this.weeklyBreakdown = [];
      this.recentPRs = [];
      this.unifiedGroups = [];
    } finally {
      this.isLoading = false;
      this.isRefreshing = false;
    }
  }

  /**
   * Build unified history items from sessions, bodyweight, and food; group by day (newest first).
   */
  private buildUnifiedHistoryGroups(
    sessions: Session[],
    bodyweightEntries: BodyweightEntry[],
    foodEntries: FoodEntry[]
  ): HistoryDayGroup[] {
    const items: HistoryItem[] = [];

    for (const s of sessions) {
      const loggedAt = s.endedAt || s.startedAt;
      if (!loggedAt) continue;
      items.push({
        type: 'session',
        id: s.id,
        loggedAt,
        dayKey: deriveLocalDate(loggedAt),
        timeText: formatDisplayTime(loggedAt),
        secondaryText: this.getQuestNameForSession(s) || 'Completed session'
      });
    }

    for (const b of bodyweightEntries) {
      const notePreview = b.note?.trim() ? truncateText(b.note.trim(), 40) : '';
      const secondary = `${b.weightKg} kg` + (notePreview ? ` · ${notePreview}` : '');
      items.push({
        type: 'bodyweight',
        id: b.id,
        loggedAt: b.loggedAt,
        dayKey: b.date,
        timeText: formatDisplayTime(b.loggedAt),
        secondaryText: secondary
      });
    }

    for (const f of foodEntries) {
      const firstLine = f.text.split('\n')[0].trim() || 'Food log';
      items.push({
        type: 'food',
        id: f.id,
        loggedAt: f.loggedAt,
        dayKey: f.date,
        timeText: formatDisplayTime(f.loggedAt),
        secondaryText: truncateText(firstLine, 50)
      });
    }

    items.sort((a, b) => (b.loggedAt.localeCompare(a.loggedAt)));

    const byDay = new Map<string, HistoryItem[]>();
    for (const item of items) {
      const list = byDay.get(item.dayKey) || [];
      list.push(item);
      byDay.set(item.dayKey, list);
    }

    const groups: HistoryDayGroup[] = Array.from(byDay.entries())
      .map(([dayKey, dayItems]) => ({
        dayKey,
        dateHeading: formatDisplayDate(dayItems[0].loggedAt),
        items: dayItems
      }))
      .sort((a, b) => b.dayKey.localeCompare(a.dayKey));

    return groups;
  }

  /**
   * Get quest name for a session (for display in history). Returns null if no quest.
   */
  private getQuestNameForSession(session: Session): string | null {
    if (session.questId && QUEST_NAMES[session.questId]) {
      return QUEST_NAMES[session.questId];
    }
    return null;
  }

  /**
   * Calculate sessions per week for the last 4 weeks.
   * Uses Monday as week start (AU-friendly).
   *
   * @param recentSessions - Sessions from the last 28 days (bounded query result)
   */
  private calculateWeeklyInsights(recentSessions: Session[]): void {
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
    
    // Count sessions per week (using bounded sessions from last 28 days)
    const weeklyCounts: WeeklyBreakdown[] = weekBoundaries.map(week => ({
      weekLabel: week.label,
      count: 0
    }));
    
    let totalLast4Weeks = 0;
    
    for (const session of recentSessions) {
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
   * Navigate to session detail/summary view.
   */
  openSession(item: HistoryItem): void {
    if (item.type !== 'session') return;
    this.router.navigate(['/history', item.id]);
  }

  /**
   * Open bodyweight editor for the given entry (deep-link edit).
   */
  openBodyweight(item: HistoryItem): void {
    if (item.type !== 'bodyweight') return;
    this.router.navigate(['/bodyweight'], { queryParams: { id: item.id } });
  }

  /**
   * Open food editor for the given entry (deep-link edit).
   */
  openFood(item: HistoryItem): void {
    if (item.type !== 'food') return;
    this.router.navigate(['/food'], { queryParams: { id: item.id } });
  }

  /**
   * Handle tap on a unified history item (routes to the correct detail/edit view).
   */
  onHistoryItemClick(item: HistoryItem): void {
    switch (item.type) {
      case 'session':
        this.openSession(item);
        break;
      case 'bodyweight':
        this.openBodyweight(item);
        break;
      case 'food':
        this.openFood(item);
        break;
    }
  }

  /**
   * Get type label for display (Session / Bodyweight / Food).
   */
  getHistoryItemTypeLabel(type: HistoryItem['type']): string {
    switch (type) {
      case 'session': return 'Session';
      case 'bodyweight': return 'Bodyweight';
      case 'food': return 'Food';
    }
  }

  /**
   * Format short date for display (e.g., "Jan 6").
   */
  formatShortDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  }

}
