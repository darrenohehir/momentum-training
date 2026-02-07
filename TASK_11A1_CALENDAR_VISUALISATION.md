# Task 11A.1 – Calendar visualisation inside History

This document describes the implementation of the month-based calendar at the top of the History (Insights) page: a visualisation of session, bodyweight, and food log presence per day, with bounded data loading and no streaks, heatmap, or evaluative styling.

**Task reference:** `cursor-task-list-new.md` – Task 11A.1 (Add calendar visualisation to History)

**Scope:** History/Insights page only, plus minimal DbService range-query helpers. No day-detail interaction (Task 11A.2), no counts in cells, no third-party calendar libraries.

---

## Goal

- Add a month-based calendar section at the top of History.
- Show presence of sessions, bodyweight logs, and food logs per day via small neutral markers (dots).
- Use the same data sources as the unified History list, with queries bounded to the visible month.
- Refresh calendar when the user changes month (prev/next) and when `ActivityEventsService` emits (same signal as the unified list).

---

## 1. DbService – bounded range queries

Three new methods return only entries whose timestamp falls in a half-open range `[start, end)` using Dexie’s index-based `between()`.

**File:** `src/app/services/db/db.service.ts`

### Sessions in range (completed sessions by `endedAt`)

```typescript
/**
 * Get completed sessions in a date range [start, end) for calendar (bounded query).
 * Uses endedAt; start/end are converted to ISO for index query.
 */
async getSessionsInRange(startDate: Date, endDate: Date): Promise<Session[]> {
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  return this.sessions
    .where('endedAt')
    .between(startIso, endIso, true, false)
    .toArray();
}
```

### Bodyweight entries in range

```typescript
/**
 * Get bodyweight entries in a date range [start, end) for calendar (bounded query).
 */
async getBodyweightEntriesInRange(startDate: Date, endDate: Date): Promise<BodyweightEntry[]> {
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  return this.bodyweightEntries
    .where('loggedAt')
    .between(startIso, endIso, true, false)
    .toArray();
}
```

### Food entries in range

```typescript
/**
 * Get food entries in a date range [start, end) for calendar (bounded query).
 */
async getFoodEntriesInRange(startDate: Date, endDate: Date): Promise<FoodEntry[]> {
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  return this.foodEntries
    .where('loggedAt')
    .between(startIso, endIso, true, false)
    .toArray();
}
```

`between(lower, upper, true, false)` gives `[start, end)` (inclusive start, exclusive end), so the visible month is covered without including the first day of the next month.

---

## 2. Insights page – types and state

**File:** `src/app/pages/insights/insights.page.ts`

### Calendar types

```typescript
/** Presence of log types for a calendar day (dayKey). */
export interface CalendarDayPresence {
  hasSession: boolean;
  hasBodyweight: boolean;
  hasFood: boolean;
}

/** Cell in the calendar grid: either a placeholder (blank) or a day with optional markers. */
export type CalendarCell =
  | { isPlaceholder: true }
  | { isPlaceholder: false; day: number; dayKey: string; hasSession: boolean; hasBodyweight: boolean; hasFood: boolean };
```

### Calendar state and weekdays

```typescript
/** Calendar: first day of the currently displayed month. */
displayedCalendarMonth: Date = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
})();

/** Calendar: flat grid of cells (placeholders + days) for the displayed month. */
calendarGrid: CalendarCell[] = [];

/** Weekday labels (Monday first). */
readonly calendarWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
```

---

## 3. Month boundaries and loading calendar data

### Month start/end (for range queries)

```typescript
private getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

private getMonthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}
```

### Load calendar (bounded queries + lookup + grid)

```typescript
private async loadCalendarData(): Promise<void> {
  const start = this.getMonthStart(this.displayedCalendarMonth);
  const end = this.getMonthEnd(this.displayedCalendarMonth);

  const [sessions, bodyweightEntries, foodEntries] = await Promise.all([
    this.db.getSessionsInRange(start, end),
    this.db.getBodyweightEntriesInRange(start, end),
    this.db.getFoodEntriesInRange(start, end)
  ]);

  const lookup: Record<string, CalendarDayPresence> = {};

  for (const s of sessions) {
    const at = s.endedAt || s.startedAt;
    if (!at) continue;
    const key = deriveLocalDate(at);
    if (!lookup[key]) lookup[key] = { hasSession: false, hasBodyweight: false, hasFood: false };
    lookup[key].hasSession = true;
  }
  for (const b of bodyweightEntries) {
    const key = b.date;
    if (!lookup[key]) lookup[key] = { hasSession: false, hasBodyweight: false, hasFood: false };
    lookup[key].hasBodyweight = true;
  }
  for (const f of foodEntries) {
    const key = f.date;
    if (!lookup[key]) lookup[key] = { hasSession: false, hasBodyweight: false, hasFood: false };
    lookup[key].hasFood = true;
  }

  this.calendarGrid = this.buildCalendarGrid(this.displayedCalendarMonth, lookup);
}
```

Sessions use `deriveLocalDate(endedAt || startedAt)`; bodyweight and food use their existing `date` (YYYY-MM-DD). No full-table scans; only the visible month is queried.

---

## 4. Grid building (Monday-first, placeholders)

```typescript
private buildCalendarGrid(monthStart: Date, lookup: Record<string, CalendarDayPresence>): CalendarCell[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const mondayFirstOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const leadingBlanks = mondayFirstOffset;

  const cells: CalendarCell[] = [];

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ isPlaceholder: true });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const p = lookup[dayKey] || { hasSession: false, hasBodyweight: false, hasFood: false };
    cells.push({
      isPlaceholder: false,
      day,
      dayKey,
      hasSession: p.hasSession,
      hasBodyweight: p.hasBodyweight,
      hasFood: p.hasFood
    });
  }

  const total = cells.length;
  const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 0; i < trailing; i++) {
    cells.push({ isPlaceholder: true });
  }

  return cells;
}
```

Week starts on Monday; leading and trailing placeholders keep a 7-column grid with no counts in cells.

---

## 5. Prev/next month and month label

```typescript
prevCalendarMonth(): void {
  this.displayedCalendarMonth = new Date(
    this.displayedCalendarMonth.getFullYear(),
    this.displayedCalendarMonth.getMonth() - 1,
    1
  );
  this.loadCalendarData();
}

nextCalendarMonth(): void {
  this.displayedCalendarMonth = new Date(
    this.displayedCalendarMonth.getFullYear(),
    this.displayedCalendarMonth.getMonth() + 1,
    1
  );
  this.loadCalendarData();
}

getCalendarMonthLabel(): string {
  return this.displayedCalendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' });
}
```

---

## 6. When the calendar refreshes

- **On full History load:** At the end of `loadSessions()` (after building `unifiedGroups`), `await this.loadCalendarData()` runs so the calendar reflects the same activity signal and view-enter load.
- **On month change:** `prevCalendarMonth()` and `nextCalendarMonth()` update `displayedCalendarMonth` and call `loadCalendarData()` (no separate guard; calendar load is lightweight and bounded).

On error in `loadSessions()`, `calendarGrid` is set to `[]` so the calendar does not show stale data.

---

## 7. Template – calendar section (top of content)

**File:** `src/app/pages/insights/insights.page.html`

The calendar is the first section when `!isLoading`:

```html
<!-- Calendar Section (top) -->
<section class="calendar-section">
  <div class="calendar-header">
    <ion-button fill="clear" size="small" (click)="prevCalendarMonth()" aria-label="Previous month">
      <ion-icon name="chevron-back"></ion-icon>
    </ion-button>
    <h2 class="calendar-month-title">{{ getCalendarMonthLabel() }}</h2>
    <ion-button fill="clear" size="small" (click)="nextCalendarMonth()" aria-label="Next month">
      <ion-icon name="chevron-forward"></ion-icon>
    </ion-button>
  </div>
  <div class="calendar-weekdays">
    <span *ngFor="let w of calendarWeekdays" class="calendar-weekday">{{ w }}</span>
  </div>
  <div class="calendar-grid">
    <ng-container *ngFor="let cell of calendarGrid">
      <div *ngIf="cell.isPlaceholder" class="calendar-cell calendar-cell--placeholder"></div>
      <div *ngIf="!cell.isPlaceholder" class="calendar-cell calendar-cell--day">
        <span class="calendar-cell-day">{{ cell.day }}</span>
        <div class="calendar-markers" *ngIf="cell.hasSession || cell.hasBodyweight || cell.hasFood">
          <span *ngIf="cell.hasSession" class="calendar-marker calendar-marker--session" title="Session"></span>
          <span *ngIf="cell.hasBodyweight" class="calendar-marker calendar-marker--bodyweight" title="Bodyweight"></span>
          <span *ngIf="cell.hasFood" class="calendar-marker calendar-marker--food" title="Food"></span>
        </div>
      </div>
    </ng-container>
  </div>
</section>
```

- Month header: prev | **Month Year** | next.
- Weekday row: Mon–Sun.
- Grid: placeholders are empty; day cells show the day number and up to three small dot markers (session, bodyweight, food). No counts, no intensity.

---

## 8. Styles – calendar (neutral, no heatmap)

**File:** `src/app/pages/insights/insights.page.scss`

Relevant parts:

- **Section:** `calendar-section` – margin and padding.
- **Header:** Flex, small icon buttons, month title.
- **Weekdays:** 7-column grid, small uppercase labels, reduced opacity.
- **Grid:** 7-column grid, gap; cells use aspect-ratio and min-height.
- **Cells:** Placeholder cells transparent/low opacity; day cells use `--ion-color-step-100`.
- **Markers:** 4px circles, `--ion-color-medium`, same neutral style for all three types (no intensity or colour scaling).

```scss
.calendar-marker {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ion-color-medium);
  opacity: 0.8;

  &--session, &--bodyweight, &--food {
    background: var(--ion-color-medium);
  }
}
```

---

## Summary of files changed

| File | Change |
|------|--------|
| `src/app/services/db/db.service.ts` | Added `getSessionsInRange`, `getBodyweightEntriesInRange`, `getFoodEntriesInRange` using `.between(..., true, false)`. |
| `src/app/pages/insights/insights.page.ts` | Added `CalendarDayPresence`, `CalendarCell`; `displayedCalendarMonth`, `calendarGrid`, `calendarWeekdays`; `getMonthStart`, `getMonthEnd`, `loadCalendarData`, `buildCalendarGrid`, `prevCalendarMonth`, `nextCalendarMonth`, `getCalendarMonthLabel`; call `loadCalendarData()` at end of `loadSessions()` and on error clear `calendarGrid`. |
| `src/app/pages/insights/insights.page.html` | New calendar section at top: header (prev / month label / next), weekday row, grid of placeholders and day cells with markers. |
| `src/app/pages/insights/insights.page.scss` | New styles for `.calendar-section`, `.calendar-header`, `.calendar-month-title`, `.calendar-weekdays`, `.calendar-grid`, `.calendar-cell`, `.calendar-markers`, `.calendar-marker`. |

---

## Guardrails (as per task)

- Calendar is informational only (no motivational or evaluative language).
- No streak visuals, no “missed day” styling, no heatmap or colour scaling.
- No numbers in calendar cells except the day number; no counts.
- Queries are bounded to the visible month (no scanning all logs).
- No day-detail interaction (Task 11A.2); no third-party calendar library.

---

## Acceptance criteria (for cross-reference)

- Calendar appears at the top of History with correct month grid and leading/trailing blanks.
- Markers appear on days that have the corresponding log type in that month.
- Prev/next update the grid and markers.
- Creating/editing/deleting a log triggers list and calendar refresh via the same activity signal.
- No streaks, missed-day styling, heatmap, or counts in day cells.
- Build passes (subject to Node version).
