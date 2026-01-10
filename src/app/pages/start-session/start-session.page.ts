import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { QuestId, Session } from '../../models';
import { DbService } from '../../services/db';

interface QuestOption {
  id: QuestId | null;
  label: string;
}

@Component({
  selector: 'app-start-session',
  templateUrl: './start-session.page.html',
  styleUrls: ['./start-session.page.scss'],
  standalone: false
})
export class StartSessionPage {
  /** Available quest presets */
  questOptions: QuestOption[] = [
    { id: null, label: 'No quest' },
    { id: 'quick', label: 'Quick Session' },
    { id: 'full-body', label: 'Full Body' },
    { id: 'upper', label: 'Upper Body' },
    { id: 'lower', label: 'Lower Body' }
  ];

  /** Currently selected quest (null = no quest) */
  selectedQuestId: QuestId | null = null;

  /** Loading state for button */
  isStarting = false;

  constructor(
    private db: DbService,
    private router: Router
  ) {}

  /**
   * Create a new session and navigate to session in progress.
   */
  async startSession(): Promise<void> {
    if (this.isStarting) return;

    this.isStarting = true;

    try {
      const now = new Date().toISOString();
      const session: Session = {
        id: crypto.randomUUID(),
        startedAt: now,
        createdAt: now,
        updatedAt: now,
        questId: this.selectedQuestId ?? undefined,
        // endedAt and notes are undefined (active session)
      };

      await this.db.createSession(session);
      await this.router.navigate(['/session', session.id]);
    } catch (error) {
      console.error('Failed to start session:', error);
      this.isStarting = false;
    }
  }
}
