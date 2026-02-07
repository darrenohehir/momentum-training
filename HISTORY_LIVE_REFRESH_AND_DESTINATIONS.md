# Unified History live-refresh and completion destinations (follow-up)

This document describes the fix for: (1) the History tab staying stale after create/edit/delete when returning from food/bodyweight or after completing a session, and (2) delete-from-edit (when opened via History) navigating to the list page instead of back to History.

**Context:** Task 11.0 added a unified History list (`unifiedGroups` in `insights.page.ts`). Data is loaded in `loadSessions()` (60-day window). Without a cross-component signal, returning to the History tab did not refresh the list. Deleting an entry while editing (after opening from History) could leave the user on `/food` or `/bodyweight` instead of `/tabs/history`.

**Scope:** New event service, History subscription with active/refresh guards, notify-after-mutations in Food/Bodyweight/Session, and delete-destination logic when opened from History. No DB schema, no History UI refactor, no autosave changes.

---

## 1. ActivityEventsService

**New file:** `src/app/services/events/activity-events.service.ts`

Single responsibility: expose an observable that emits when any activity (session, bodyweight, food) has changed, so the History page can reload.

```typescript
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
```

**Barrel:** `src/app/services/events/index.ts` exports `ActivityEventsService` alongside `AppEventsService`.

---

## 2. History page (Insights): reload when activity changes (only when active)

**File:** `src/app/pages/insights/insights.page.ts`

### Lifecycle and state

- Implements `OnDestroy` and `ViewWillLeave` in addition to existing hooks.
- **`isActive`:** `true` in `ionViewWillEnter()`, `false` in `ionViewWillLeave()`. Used so we only run a refresh on `activityChanged$` when the History tab is visible.
- **`isRefreshing`:** Prevents overlapping loads (e.g. rapid events or event + view enter).
- **`activityChangedSub`:** Subscription to `activityChanged$`; cleaned up in `ngOnDestroy()`.

### Subscription (ngOnInit)

```typescript
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
```

### View lifecycle

```typescript
async ionViewWillEnter(): Promise<void> {
  this.isActive = true;
  await this.loadSessions();
}

ionViewWillLeave(): void {
  this.isActive = false;
}
```

### loadSessions() guard and finally

```typescript
private async loadSessions(): Promise<void> {
  if (this.isRefreshing) return;
  this.isRefreshing = true;
  this.isLoading = true;
  try {
    // ... existing load logic ...
  } catch (error) {
    // ...
  } finally {
    this.isLoading = false;
    this.isRefreshing = false;
  }
}
```

This avoids duplicate concurrent loads and ensures the spinner and refresh state are cleared.

---

## 3. Food page: notify after mutations and delete destination

**File:** `src/app/pages/food/food.page.ts`

### Injected service and openedFromHistory

```typescript
/** True when this page was opened via History deep-link (?id=); delete should return to History. */
private openedFromHistory = false;

constructor(
  // ...
  private activityEvents: ActivityEventsService,
  // ...
) {}
```

When entering with `?id=...`, set the flag so delete can navigate back to History:

```typescript
const idParam = this.route.snapshot.queryParamMap.get('id');
if (idParam) {
  const entry = await this.db.getFoodEntry(idParam);
  if (entry) {
    this.openedFromHistory = true;
    this.editEntry(entry);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }
  return;
}
```

### Notify after successful persist

Inside `persistCurrentEntry()`, after updating the in-memory array and syncing `editingEntry`:

```typescript
// ... updateEntriesArray(entryToSave); sync editingEntry ...

this.activityEvents.notifyActivityChanged();
```

(Same pattern is used for debounced autosave and for `saveAndClose()` which calls `persistCurrentEntry()`.)

### Delete: notify, then navigate to History when opened from History

```typescript
async deleteEntry(entry: FoodEntry): Promise<void> {
  try {
    await this.db.deleteFoodEntry(entry.id);

    this.entries = this.entries.filter(e => e.id !== entry.id);

    const wasEditingThis = this.editingEntry?.id === entry.id;
    if (wasEditingThis) {
      this.editingEntry = null;
      this.isNewEntry = false;
    }

    this.activityEvents.notifyActivityChanged();

    if (wasEditingThis && this.openedFromHistory) {
      this.navController.navigateRoot('/tabs/history', { replaceUrl: true });
    }

    await this.undoToast.present({
      message: 'Entry deleted',
      onUndo: async () => {
        try {
          await this.db.restoreFoodEntry(entry);
          await this.loadEntries();
          this.activityEvents.notifyActivityChanged();
        } catch (error) {
          console.error('Failed to undo delete:', error);
        }
      }
    });
  } catch (error) {
    console.error('Failed to delete entry:', error);
  }
}
```

So: after delete we always notify; if the user was editing this entry and came from History, we navigate to `/tabs/history` with `replaceUrl: true`. Undo restores, reloads the list, and notifies so History stays in sync.

---

## 4. Bodyweight page: same pattern as Food

**File:** `src/app/pages/bodyweight/bodyweight.page.ts`

- **`openedFromHistory`** set to `true` when entering with `?id=...` (same `ionViewWillEnter` pattern as Food).
- **`activityEvents.notifyActivityChanged()`** after a successful persist in `persistCurrentEntry()` (after `updateEntriesArray` and sync).
- **`deleteEntry()`:** After DB delete and local update, set `wasEditingThis`, clear editor state if needed, call `notifyActivityChanged()`, then if `wasEditingThis && openedFromHistory` call `this.navController.navigateRoot('/tabs/history', { replaceUrl: true })`. Undo handler: `restoreBodyweightEntry`, `loadEntries()`, then `notifyActivityChanged()`.

Code structure mirrors the Food snippets above.

---

## 5. Session completion: emit activity changed

**File:** `src/app/pages/session/session.page.ts`

Session completion already called `this.appEvents.emitSessionDataChanged()` after persisting the session. To drive the unified History list, we also notify the activity bus:

```typescript
// Notify other components that session data has changed
this.appEvents.emitSessionDataChanged();
this.activityEvents.notifyActivityChanged();

// Navigate to session summary
this.router.navigate(['/session', this.session.id, 'summary']);
```

So when the user finishes a session and later lands on History (e.g. from summary “Done”), History has either already refreshed on `activityChanged$` or will refresh on `ionViewWillEnter`.

---

## Summary of files changed

| File | Change |
|------|--------|
| `src/app/services/events/activity-events.service.ts` | **New.** Subject + `activityChanged$` + `notifyActivityChanged()`. |
| `src/app/services/events/index.ts` | Export `ActivityEventsService`. |
| `src/app/pages/insights/insights.page.ts` | `OnDestroy`, `ViewWillLeave`; `isActive`, `isRefreshing`; subscribe to `activityChanged$` in `ngOnInit`, refresh only when `isActive && !isRefreshing`; guard and `finally` in `loadSessions()`. |
| `src/app/pages/food/food.page.ts` | Inject `ActivityEventsService`; `openedFromHistory` set when entering with `?id=`; notify after persist; in delete: notify, then navigate to History when `wasEditingThis && openedFromHistory`; notify in undo. |
| `src/app/pages/bodyweight/bodyweight.page.ts` | Same as Food (openedFromHistory, notify on persist/delete/undo, delete → History when from History). |
| `src/app/pages/session/session.page.ts` | Inject `ActivityEventsService`; call `notifyActivityChanged()` after `emitSessionDataChanged()` in `finishSession()`. |

---

## Verification checklist (no new UI)

- On History, open a food item → edit → Done: History list updates without manual refresh.
- On History, open a bodyweight item → edit → Done: History list updates without manual refresh.
- On History, open food or bodyweight item → delete: user is taken to History (not `/food` or `/bodyweight`), and the item disappears without manual refresh.
- From FAB, start a session while on History → finish → Done: History shows the new session without manual refresh.
- No infinite refresh loops and no repeated reload spinners (guarded by `isActive`, `isRefreshing`, and `finally`).

---

## Guardrails respected

- No History UI refactor (no calendar, filters, or new components).
- No DB schema or export/import changes.
- Autosave logic unchanged.
- Changes kept minimal and localized (event service + subscriptions and notify at mutation points).
