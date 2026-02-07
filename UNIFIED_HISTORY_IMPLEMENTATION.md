# Unified History list – implementation (Task 11.0)

This document describes the implementation of the unified History list: a single, day-grouped list of sessions, bodyweight entries, and food entries, with tap-to-open behavior and deep-link edit support.

**Task reference:** `cursor-task-list-new.md` – Task 11.0 (Unified History list foundation)

**Scope:** History page (Insights), minimal DbService additions, and deep-link query params on Bodyweight and Food pages. No DB schema changes, no calendar/counts/streaks, no export/import changes.

---

## Goal

- Make History the primary place to browse all logged activity (sessions, bodyweight, food).
- Entries grouped by day (newest day first); within each day, sorted by timestamp descending.
- Each row shows a type label, time, and a short secondary line; tap opens the correct detail or editor.
- Bounded data loading (e.g. last 60 days) for performance.
- Deep-link edit: opening bodyweight or food by id from History uses `?id=<entryId>` and clears the param after opening.

---

## 1. DbService – bounded queries

Two new methods provide a date-bounded window for the unified list (no full-table scans).

**File:** `src/app/services/db/db.service.ts`

### `getBodyweightEntriesSince(sinceDate: Date)`

```typescript
/**
 * Get bodyweight entries on or after a given date (bounded query for unified history).
 * Sorted by loggedAt descending (newest first).
 */
async getBodyweightEntriesSince(sinceDate: Date): Promise<BodyweightEntry[]> {
  const sinceIso = sinceDate.toISOString();
  return this.bodyweightEntries
    .where('loggedAt')
    .aboveOrEqual(sinceIso)
    .reverse()
    .toArray();
}
```

### `getFoodEntriesSince(sinceDate: Date)`

```typescript
/**
 * Get food entries on or after a given date (bounded query for unified history).
 * Sorted by loggedAt descending (newest first).
 */
async getFoodEntriesSince(sinceDate: Date): Promise<FoodEntry[]> {
  const sinceIso = sinceDate.toISOString();
  return this.foodEntries
    .where('loggedAt')
    .aboveOrEqual(sinceIso)
    .reverse()
    .toArray();
}
```

Both use the existing `loggedAt` index for efficient, bounded reads.

---

## 2. History page (Insights) – view model and loading

**File:** `src/app/pages/insights/insights.page.ts`

### View model types

```typescript
/** Number of days to load for unified history list (bounded query). */
const HISTORY_DAYS = 60;

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
```

### Loading unified data

`loadSessions()` now fetches a 60-day window for the unified list and builds day groups (weekly insights still use a 28-day window):

```typescript
const sixtyDaysAgo = new Date();
sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - HISTORY_DAYS);

const [sessionsLast28Days, prEvents, sessionsSince60d, bodyweightSince60d, foodSince60d] = await Promise.all([
  this.db.getCompletedSessionsSince(fourWeeksAgo),
  this.db.getRecentPREvents(10),
  this.db.getCompletedSessionsSince(sixtyDaysAgo),
  this.db.getBodyweightEntriesSince(sixtyDaysAgo),
  this.db.getFoodEntriesSince(sixtyDaysAgo)
]);
// ... weekly insights and PRs ...
this.unifiedGroups = this.buildUnifiedHistoryGroups(
  sessionsSince60d,
  bodyweightSince60d,
  foodSince60d
);
```

### Building items and grouping by day

`buildUnifiedHistoryGroups()` maps each source into `HistoryItem`, merges, sorts by `loggedAt` descending, then groups by `dayKey`:

- **Session:** `loggedAt` = `endedAt || startedAt`; `secondaryText` = quest name or `"Completed session"`.
- **Bodyweight:** `secondaryText` = e.g. `"75.5 kg"` plus optional note preview (truncated to 40 chars).
- **Food:** `secondaryText` = first line of `text`, truncated to 50 chars (or `"Food log"` if empty).

```typescript
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
```

### Tap handling and navigation

```typescript
onHistoryItemClick(item: HistoryItem): void {
  switch (item.type) {
    case 'session':
      this.openSession(item);   // -> /history/:id
      break;
    case 'bodyweight':
      this.openBodyweight(item); // -> /bodyweight?id=...
      break;
    case 'food':
      this.openFood(item);       // -> /food?id=...
      break;
  }
}

openSession(item: HistoryItem): void {
  if (item.type !== 'session') return;
  this.router.navigate(['/history', item.id]);
}

openBodyweight(item: HistoryItem): void {
  if (item.type !== 'bodyweight') return;
  this.router.navigate(['/bodyweight'], { queryParams: { id: item.id } });
}

openFood(item: HistoryItem): void {
  if (item.type !== 'food') return;
  this.router.navigate(['/food'], { queryParams: { id: item.id } });
}
```

---

## 3. History page – template

**File:** `src/app/pages/insights/insights.page.html`

The previous “Sessions” list was replaced by a single “Activity” section with day groups and a unified list:

```html
<!-- Unified History Section -->
<section class="history-section">
  <h2 class="section-title">Activity</h2>

  <!-- Empty State -->
  <div *ngIf="unifiedGroups.length === 0" class="empty-state">
    <ion-icon name="calendar-outline"></ion-icon>
    <h2>No activity yet</h2>
    <p>Sessions, bodyweight, and food logs will appear here.</p>
  </div>

  <!-- Unified list grouped by day -->
  <ng-container *ngIf="unifiedGroups.length > 0">
    <div *ngFor="let group of unifiedGroups" class="day-group">
      <h3 class="day-heading">{{ group.dateHeading }}</h3>
      <ion-list class="history-list">
        <ion-item
          *ngFor="let item of group.items"
          button
          detail="true"
          (click)="onHistoryItemClick(item)"
        >
          <ion-label>
            <div class="history-item-header">
              <span class="history-item-type">{{ getHistoryItemTypeLabel(item.type) }}</span>
              <span class="history-item-time">{{ item.timeText }}</span>
            </div>
            <p class="history-item-secondary">{{ item.secondaryText }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </div>
  </ng-container>
</section>
```

- **Day heading:** `dateHeading` (e.g. `"Sat, Jan 18"`).
- **Row:** type label (Session / Bodyweight / Food), time, secondary line; tap calls `onHistoryItemClick(item)`.

The insights block (workouts per week, top weights) is still shown when `sessionsLast4Weeks > 0 || recentPRs.length > 0`; it no longer depends on a separate “sessions” list.

---

## 4. History page – styles

**File:** `src/app/pages/insights/insights.page.scss`

New styles for the unified list and day groups:

```scss
/* Unified History Section */
.history-section {
  .day-group {
    margin-bottom: 20px;
  }

  .day-heading {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.6;
    margin: 0 0 8px 0;
    padding: 0 4px;
  }

  .history-list {
    background: transparent;

    ion-item {
      --background: var(--ion-color-step-100);
      margin-bottom: 8px;
      border-radius: 8px;

      .history-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2px;
      }

      .history-item-type {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.7;
        font-weight: 500;
      }

      .history-item-time {
        font-size: 0.8rem;
        opacity: 0.6;
      }

      .history-item-secondary {
        font-size: 0.9rem;
        opacity: 0.85;
        margin: 0;
      }
    }
  }
}
```

---

## 5. Deep-link edit – Bodyweight and Food

Bodyweight and Food pages support opening a specific entry from History via `?id=<entryId>`. On enter, the entry is loaded, the editor is opened, and the query param is cleared with `replaceUrl: true` so back/refresh do not re-open by id.

### Bodyweight

**File:** `src/app/pages/bodyweight/bodyweight.page.ts`

```typescript
/**
 * Ionic lifecycle hook: reload data when page becomes active.
 * Supports ?new=1 (create mode from FAB) and ?id=<entryId> (edit mode from History deep-link).
 */
async ionViewWillEnter(): Promise<void> {
  await this.loadEntries();

  const idParam = this.route.snapshot.queryParamMap.get('id');
  if (idParam) {
    const entry = await this.db.getBodyweightEntry(idParam);
    if (entry) {
      this.editEntry(entry);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
    }
    return;
  }

  const newParam = this.route.snapshot.queryParamMap.get('new');
  if (newParam === '1') {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
    this.startNewEntry();
  }
}
```

### Food

**File:** `src/app/pages/food/food.page.ts`

Same pattern: read `id` from query params; if present, load with `getFoodEntry(id)`, call `editEntry(entry)`, then `navigate([], { queryParams: {}, replaceUrl: true })`. Otherwise, if `?new=1`, enter create mode and clear the param.

---

## Summary of files changed

| File | Changes |
|------|--------|
| `src/app/services/db/db.service.ts` | Added `getBodyweightEntriesSince(sinceDate)`, `getFoodEntriesSince(sinceDate)`. |
| `src/app/pages/insights/insights.page.ts` | Added `HistoryItem`, `HistoryDayGroup`, `HISTORY_DAYS`; `unifiedGroups`; `loadSessions()` loads 60d data and calls `buildUnifiedHistoryGroups()`; added `openSession`, `openBodyweight`, `openFood`, `onHistoryItemClick`, `getHistoryItemTypeLabel`; removed unused `formatDate`, `getDuration`, `getQuestName`. |
| `src/app/pages/insights/insights.page.html` | Replaced “Sessions” list with “Activity” and day-grouped unified list; empty state copy updated. |
| `src/app/pages/insights/insights.page.scss` | Replaced session-list styles with `.day-group`, `.day-heading`, `.history-list`, `.history-item-*`. |
| `src/app/pages/bodyweight/bodyweight.page.ts` | In `ionViewWillEnter`, handle `?id=` by loading entry, calling `editEntry`, then clearing query param with `replaceUrl: true`. |
| `src/app/pages/food/food.page.ts` | Same `?id=` handling for food entries. |

---

## Guardrails respected

- No calendar, counts, streaks, or evaluative UI.
- Bounded queries only (60-day window for unified list).
- No DB schema or export/import changes.
- FAB and Home unchanged.
- Language kept factual and neutral.

---

## Acceptance criteria (for cross-reference)

- After logging session/bodyweight/food, History shows the new item in the correct day group.
- Tapping a session opens session detail (`/history/:id`).
- Tapping bodyweight opens the bodyweight editor for that entry; URL is cleaned after opening.
- Tapping food opens the food editor for that entry; URL is cleaned after opening.
- Build passes (subject to Node version).
