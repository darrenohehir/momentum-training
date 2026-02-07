import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Lightweight event bus for unified History refresh.
 * Emit when sessions, bodyweight, or food data change so the History page can reload.
 */
@Injectable({
  providedIn: 'root'
})
export class ActivityEventsService {
  private activityChanged = new Subject<void>();

  /** Emits when any activity (session, bodyweight, food) has been created, updated, or deleted. */
  activityChanged$: Observable<void> = this.activityChanged.asObservable();

  /** Notify that activity data changed; History (if active) should refresh. */
  notifyActivityChanged(): void {
    this.activityChanged.next();
  }
}
