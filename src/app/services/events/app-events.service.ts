import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Simple event service for cross-component communication.
 * Used to notify components when data changes that affect their display.
 */
@Injectable({
  providedIn: 'root'
})
export class AppEventsService {
  /** Emits when session data changes (created, completed, edited) */
  private sessionDataChanged = new Subject<void>();

  /** Observable for session data changes */
  sessionDataChanged$: Observable<void> = this.sessionDataChanged.asObservable();

  /**
   * Emit event when session data has changed.
   * Call this after completing a session, editing, etc.
   */
  emitSessionDataChanged(): void {
    this.sessionDataChanged.next();
  }
}

