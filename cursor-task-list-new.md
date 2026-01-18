## Phase 8+ – Multi-Log Expansion (Training + Bodyweight + Food) + Calendar

### Context (why this shift, and what changes)

Momentum started as a calm, local-first workout logger with “Previous You” context and quiet gamification.  
The direction is now expanding into a **multi-log personal health tracker**:

- **Workout sessions** (existing core)
- **Bodyweight logs** (simple, date/time based)
- **Food logs** (simple, free-text, date/time based)

This shift has two implications:

1. **Home can’t be “Start session” only** anymore.  
   It should support multiple quick actions without becoming a dashboard.

2. **Users need a unified “when did I engage?” surface**.  
   A **Calendar view** becomes the most natural, non-judgemental way to show activity across log types without turning the app into a streak machine.

### Principles to keep intact

- Local-first, offline-capable
- Immediate persistence (no save buttons)
- Calm, neutral language (no guilt framing)
- Reversibility over confirmations
- “Insights” are descriptive, not evaluative

### Phase structure

- **8A** = safety net (backup) before schema expansion
- **9A–10A** = add new log types (bodyweight + food) with minimal UI and clean data models
- **10B** = refactor entry points (FAB) once multiple log flows exist
- **11A** = Calendar foundation once multi-log data exists
- **11B** = Calendar refinement + filters/tabs
- **12** = Offline validation once the expanded feature set exists
- **13** = Copy/polish/performance pass at the end

---

## Phase 8A – Export / Import (Backup) ✅ do before adding more entities

### Task 8A.1 – Export JSON backup

- Generate JSON with:
  - `schemaVersion`
  - `exportedAt`
  - All entity arrays (including PR events, gamification state, bodyweight, food)
- Trigger file download (client-side)

**Guardrails**

- No cloud sync
- No accounts
- Export is explicit (user action)

### Task 8A.2 – Import JSON backup

- File upload
- Validate `schemaVersion`
- Confirm destructive action
- Replace all local data with imported data (single transaction)

**Guardrails**

- Import is all-or-nothing (avoid partial imports)
- Clear all stores (including PR events) before import
- Failure leaves existing data intact where possible

---

## Phase 9A – Bodyweight Logging (Simple + Trustworthy)

### Task 9A.1 – Bodyweight entry

- Add bodyweight log screen:
  - Date/time (defaults to now, editable)
  - Weight (kg)
  - Optional note
- Persist instantly to IndexedDB

**Guardrails**

- No goals, no target weight, no praise
- No charts yet
- Empty note is fine

### Task 9A.2 – Bodyweight history

- Simple list view (newest first)
- Tap entry → edit (optional but preferred)
- Delete supports undo (reuse existing undo primitive if available)

**Guardrails**

- No trend language (“up/down is bad/good”)
- Keep it descriptive

---

## Phase 10A – Food Logging (Basic free-text + Timestamp)

### Task 10A.1 – Food entry

- Add food log screen:
  - Date/time (defaults to now, editable)
  - Free-text meal/consumption input (multi-line)
  - Optional note/tag (optional; only if it’s trivial)

**Guardrails**

- No calorie totals
- No macro fields
- No judgement language
- No “healthy/unhealthy” labels

### Task 10A.2 – Food history

- Simple chronological list (newest first)
- Show:
  - Date/time
  - Text preview (first line or truncated)
- Tap entry → view/edit
- Delete supports undo (reuse existing undo primitive)

**Guardrails**

- No scoring
- No nudges
- No streak cues

---

## Phase 10B – Home + Global FAB Refactor (Multi-Log Creation)

### Task 10B.1 – Introduce global FAB for logging actions

- Add a single Floating Action Button (FAB) that is available across primary app screens

  - Visible on: Home, History, Exercises
  - Hidden/suppressed during modal logging flows

- FAB opens a footer drawer (or equivalent) with explicit actions:
  - Start session
  - Log bodyweight
  - Log food

**Guardrails**

- FAB is for creation only (never navigation)
- No XP or rewards are granted for opening the FAB
- FAB styling should be calm and functional (not dominant or celebratory)

---

### Task 10B.2 – Reframe Home as status / motivation surface

- Remove primary “Start session” CTA from Home
- Home focuses on:
  - Momentum status
  - XP / level (secondary emphasis)
  - Recent activity or shortcuts to log history

**Guardrails**

- Home must not pressure users to log
- No “you should log…” prompts
- No performance summaries or evaluative language
- Creation always happens via the global FAB

---

### Task 10B.3 – Navigation reliability

- Ensure each FAB action:
  - Lands on the correct logging flow
  - Defaults date/time to “now”
  - Returns users to a predictable screen on completion
- Back navigation must be consistent and unsurprising

---

## Phase 11A – History Calendar Visualisation (Unified, Non-Evaluative)

### Task 11A.1 – Add calendar visualisation to History

- Add a month-based calendar section at the top of the History screen
- Calendar is a visualisation mode within History (not a standalone tab)

- Each day may indicate presence of:
  - Workout session(s)
  - Bodyweight log(s)
  - Food log(s)

**Display approach (MVP)**

- Use small, neutral markers (dots or icons) per log type
- Do not show numbers in calendar cells

**Guardrails**

- Calendar is informational, not motivational
- No streak visuals
- No “missed day” styling
- No heatmap intensity or colour scaling
- Calendar queries must be bounded by visible date range (e.g. month start/end)

---

### Task 11A.2 – Day detail interaction

- Tapping a day focuses History on that day

  - Either via inline list filtering or a lightweight drawer/screen

- Show a simple list of entries for that day:
  - Sessions (tap to open summary)
  - Bodyweight entries (tap to open)
  - Food entries (tap to open)

**Guardrails**

- This is a timeline, not an evaluation
- Keep language factual (“Logged”, “Recorded”)
- No comparative or trend language

---

## Phase 11B – History Filtering (Unified Log Types)

### Task 11B.1 – History filter control

- Add a filter control that applies to both:
  - Calendar markers
  - Log list below

**Filter options**

- All (default)
- Sessions
- Bodyweight
- Food

**Guardrails**

- “All” must be the default to preserve a unified timeline
- Filters are convenience views, not separate modes
- Switching filters should feel fast and lightweight

---

### Task 11B.2 – Optional minimal counts (day detail only)

- In day-focused views only (not the calendar grid):
  - Show counts such as:
    - “2 sessions”
    - “1 bodyweight entry”
    - “3 food entries”

**Guardrails**

- Counts must never appear in the calendar grid
- Avoid visual emphasis that suggests scoring or achievement

---

## Phase 12 – PWA & Offline Validation (after multi-log exists)

### Task 12.1 – Offline test

- Install PWA
- Disable internet
- Verify:
  - Start session
  - Log sets
  - Finish session
  - Log food
  - Log bodyweight
  - Data persists on reload

### Task 12.2 – Storage resilience check

- Refresh app
- Restart browser/device
- Confirm IndexedDB data intact
- Confirm calendar accurately reflects stored data after reload

---

## Phase 13 – Copy, Polish & Guardrails

### Task 13.1 – Copy pass

- Replace any:
  - “Workout” → “Session”
  - “Streak” → “Momentum”
  - “Broken / Failed” → neutral language
- Ensure no guilt phrasing anywhere across:
  - Home
  - Calendar
  - Insights
  - Food/bodyweight flows

### Task 13.2 – Performance pass

- Ensure logging is fast on mobile:
  - No blocking spinners
  - Minimal reflows
  - Bounded queries for:
    - Calendar month view (range query)
    - Recent lists
- Ensure “Copy last attempt” remains instant

---

## Explicitly Out of Scope (Do NOT build yet)

- Authentication
- Cloud sync
- Notifications
- Social features
- App Store packaging
- Calories/macros tracking UI
- AI coaching as a dependency (AI must remain optional)
- Complex cardio metrics model (treadmill/pace/etc.) — foundation can come later
- Custom quest builder (templates) — later phase

---

## Updated Definition of MVP Complete (Phase 8+ scope)

- You can log a workout session offline on your phone.
- You can log bodyweight with an editable timestamp.
- You can log food as timestamped plain text.
- Calendar shows engagement across sessions/bodyweight/food without streak pressure.
- Momentum reflects your cadence (7-day window).
- XP/levels increment only for meaningful effort.
- Data can be exported and re-imported safely.
