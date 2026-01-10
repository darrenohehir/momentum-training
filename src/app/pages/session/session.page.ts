import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Session, QuestId } from '../../models';
import { DbService } from '../../services/db';

/** Map quest IDs to display labels */
const QUEST_LABELS: Record<QuestId, string> = {
  'quick': 'Quick Session',
  'full-body': 'Full Body',
  'upper': 'Upper Body',
  'lower': 'Lower Body'
};

@Component({
  selector: 'app-session',
  templateUrl: './session.page.html',
  styleUrls: ['./session.page.scss'],
  standalone: false
})
export class SessionPage implements OnInit {
  /** Current session loaded from DB */
  session: Session | null = null;

  /** Loading state */
  isLoading = true;

  /** Error state */
  loadError = false;

  constructor(
    private route: ActivatedRoute,
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
   * Load session from database.
   */
  private async loadSession(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const session = await this.db.getSession(id);
      if (session) {
        this.session = session;
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
}
