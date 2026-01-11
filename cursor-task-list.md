# Momentum Gym – Cursor Task List (MVP)

This task list breaks the MVP into small, sequential implementation steps.
Do tasks in order. Do not skip ahead. Avoid adding features not explicitly listed.

---

## Phase 0 – Project Setup & Guardrails

### Task 0.1 – Initialise project

- Create a new Ionic + Angular project.
- Enable PWA support.
- Confirm app runs locally and can be installed as a PWA.
- Commit baseline project state.

### Task 0.2 – Define core models (TypeScript only)

Create interfaces/types for:

- Exercise
- Session
- SessionExercise
- Set
- BodyweightEntry
- GamificationState
- ExportPayload (includes schemaVersion, exportedAt)

Do NOT implement persistence yet.

---

## Phase 1 – IndexedDB & Persistence Layer

### Task 1.1 – IndexedDB service

- Choose a clean IndexedDB wrapper (or write a minimal abstraction).
- Create a single DB service responsible for:
  - Opening the DB
  - Versioning
  - CRUD per store

### Task 1.2 – Define stores & schema

Implement IndexedDB stores for:

- exercises
- sessions
- sessionExercises
- sets
- bodyweightEntries
- gamificationState

Include:

- schemaVersion
- basic migration handling (even if only v1 exists).

### Task 1.3 – Seed minimal data

- Seed a few common exercises (Chest Press, Bicep Curl, Treadmill).
- Ensure seeds run only on first install.

---

## Phase 2 – Home & Navigation Shell

### Task 2.1 – App shell & routing

- Set up routes:
  - Home
  - Start Session
  - Session In Progress
  - Exercise Library
  - Insights
  - Bodyweight Log
  - Settings
- Add basic navigation (tabs or menu).

### Task 2.2 – Home dashboard (static first)

- Layout:
  - Start Session CTA
  - Momentum status placeholder
  - XP/Level placeholder
  - Last sessions list placeholder
- No real logic yet—just structure.

### Task 2.3 - Apply global theme tokens (minimal)

- Implement `variables.scss` based on `DESIGN.md`:
  - background
  - text colors
  - primary accent
- Add only a couple of global overrides:
  - `ion-content` background
  - card/list surface background
- No component redesign; just make the app “dark instrument panel” globally.

---

## Phase 3 – Sessions & Logging (Core Loop)

### Task 3.1 – Exercise Library (read-only)

- Read exercises from IndexedDB.
- Display in Exercises tab as a list (name + category).
- Handle loading + empty state.
- No create/edit/delete yet.

### Task 3.2 – Start Session flow

- “Start Session” creates a Session record with startedAt.
- Allow optional Quest selection (preset list only).
- Navigate to Session In Progress.

### Task 3.3 – Exercise selection

- In-session:
  - Add exercise from library
  - Create new exercise inline if not found
- Create SessionExercise records with orderIndex.

### Task 3.4 – Set logging UI

- For each SessionExercise:
  - Display list of sets
  - Add/remove set
  - Inputs: weight, reps
  - Optional RPE toggle (hidden by default)
- Persist sets to IndexedDB as user logs.

### Task 3.5 – Finish Session

- Mark endedAt
- Navigate to Session Summary screen
- No gamification yet—just confirm session persistence.

---

## Phase 4 – Ghost Mode (“Previous You”)

> **Intent:** Provide quiet, optional context from past sessions.
> Ghost Mode should support decision-making without pressure, judgement, or interruption.

---

### Task 4.1 – Last attempt query

- For a given `exerciseId`:

  - Fetch the most recent **completed** `SessionExercise` and its Sets.
  - Order by `session.endedAt DESC`.

- Exclude:

  - The current session.
  - Any sessions without `endedAt`.

- Return `null` cleanly if no previous attempt exists (this is a normal state).

**UX acceptance criteria**

- Query must be fast and non-blocking.
- “No previous attempt” is not an error and should not surface warnings or empty placeholders.
- Ghost data must always represent a finished effort (never partial data).

---

### Task 4.2 – Display last attempt

- In-session, for each exercise, optionally show:

  - Last attempt date (neutral format, e.g. “Jan 3” or “Previous session”).
  - List of sets (weight × reps).

- Display should be visually secondary to current-session logging.

**UX acceptance criteria**

- Ghost data is **passive by default** (no banners, no callouts).
- Visual weight is reduced (muted text, smaller size, secondary hierarchy).
- Language is neutral and factual (no “beat”, “improve”, or comparative copy).
- If no previous attempt exists:

  - Show nothing, or
  - Show a subtle “No previous session” line.

- Ghost display must never block or interrupt logging.

---

### Task 4.3 – Copy last attempt

- Provide an explicit action to copy previous sets into the current session.
- Copying creates **new Set records** linked to the current session.
- Copied sets must be immediately editable.

**UX acceptance criteria**

- Copy action is **explicit and optional** (never automatic).
- Button copy should be calm and factual (e.g. “Copy last sets”).
- Copying must feel reversible:

  - Sets can be edited or deleted immediately.
  - No confirmation dialogs required.

- Copying does not imply expectation or comparison.

---

### Phase 4 guardrails (apply to all tasks)

- Ghost Mode provides **context, not instruction**.
- No judgement, pressure, or competitive framing.
- No interruptions to the logging flow.
- Silence and subtlety are preferred over explicit feedback.

---

## Phase 4B – Logging Confidence & Control

**Purpose**
Harden the core logging loop so that:

- actions feel reversible _where mistakes are costly_
- mistakes feel cheap _where they are common_
- the user never wonders “did that save?” or “can I fix this?”

This is not polish-for-polish’s-sake.
This is paying down structural UX debt before adding rewards.

---

### Task 4B.1 – Exercise removal + undo (not confirmation)

**Why now**
Removing an exercise from a session is a **high-cost, high-risk action**:

- deletes all logged sets
- cannot be trivially recreated
- immediate persistence makes mistakes unforgiving without a safety net

Undo is required _here_ to maintain trust.

---

#### Scope

- Add an explicit **Remove exercise** action to a `SessionExercise`
- On removal:

  - Delete the `SessionExercise` and all associated `Set` records immediately
  - Show a **low-key undo affordance** (snackbar/toast style)

---

#### Undo behaviour

- Undo is offered **only** for exercise removal (not set deletion)
- Undo window is short and silent
- If Undo is tapped:

  - Exercise and all sets are fully restored
  - Original ordering (`orderIndex`, `setIndex`) is preserved

- If Undo is ignored:

  - Deletion becomes permanent
  - No follow-up messaging

---

#### Rules

- No modals
- No “Are you sure?”
- No warnings or guilt language
- Undo is optional, not instructional

> **Explicit decision:**
> Set deletion does _not_ have undo in Phase 4B. Sets are cheap to recreate; undo here would add noise without meaningful safety.

---

### Task 4B.2 – Exercise ordering control

**Why now**
Once Ghost Mode exists, users will adjust plans mid-session.
Without ordering control, mistakes feel “locked in”.

---

#### Scope

- Allow reordering of `SessionExercise` items.
  - Reordering applies only to the current session’s `SessionExercise` list.
  - Ghost / previous session data is read-only and must not be affected.
- Update and persist `orderIndex` as soon as the drag interaction completes.
- Reordering does not require undo support in Phase 4B.

---

**Implementation notes (important)**

- Empty, partially filled, or temporarily invalid inputs are valid states and must not trigger errors, warnings, or visual feedback.
- Focus flow should be predictable and linear; do not implement “smart” or conditional focus skipping.
- Set creation must remain an explicit user action and must not depend on input completion or validation.
- This task is mobile-first; optimise for one-handed phone use over desktop behaviour.

---

#### Guardrails

- No edit mode
  - Reordering is always available during an active session.
  - There is no separate “reorder” or “edit” mode.
- No save state
- Drag = truth
- No visual “reorder confirmation”

This ensures flexibility without introducing new modes.

---

### Task 4B.3 – Input speed & focus flow (minimum viable)

**Why now**
Gamification amplifies existing behaviour.
If logging is slow or awkward, rewards reinforce frustration.

---

#### Scope

- Correct mobile keyboards (`inputmode="numeric"` / `"decimal"`)
- Predictable focus order between inputs
- Adding a set should feel continuous, not like entering a new state

---

#### Implementation notes (important)

- Focus must not automatically change in response to value entry, validation, or blur events.
  - Focus changes should occur only as a result of explicit user actions (e.g. tapping another field or adding a set).
- Behaviour in this task applies only to active session logging views.
  - Read-only views (history, ghost mode) must not be affected.
- Input handling should not introduce auto-formatting, rounding, or value normalisation while typing.

---

#### Explicitly out of scope

- Validation warnings
- Required fields
- “Incomplete set” language
- Auto-corrections that interrupt typing

Empty is valid. Silence is preferred.

---

### Task 4B.4 – Post-session review (receipt + easy correction)

**Why now**
Before gamification mechanisms like XP exists, users need confidence in what was recorded and an easy way to correct mistakes while the session is still fresh — without introducing any “approval” or save-state behaviour.

This screen should function like a calm **receipt**:

- “Here’s what we logged.”
- “If something’s wrong, you can fix it.”
- “Otherwise, you’re done.”

---

#### Implementation location

- Update the existing **Session Complete / Session Summary** screen.
- Relevant file: `session-summary.page.html`
- Do **not** introduce a new “review” screen or an “approve” step.

---

#### Scope

- Keep the existing completion framing (e.g. “Session Complete”) and summary content.
- Ensure the screen clearly supports verification and correction:
  - List exercises performed (already present).
  - Provide an **explicit, secondary** action to edit the completed session (e.g. “Edit session”).
    - This should reopen the just-completed session in an editable state.
    - Prefer a calm placement (secondary button or text button), not competing with “Done”.
  - Optional (nice-to-have): make each exercise card tappable to jump into editing that exercise’s sets.

---

#### Guardrails

- No “Review → Approve → Complete” flow (completion is an acknowledgement, not a decision).
- No praise, no celebration escalation, no success framing.
- No performance interpretation or evaluative metrics on this screen (e.g. avoid volume totals, PR callouts, comparisons).
- No new confirmation dialogs.
- Edits should respect immediate persistence (no save button introduced).

This screen is about correctness and trust, not motivation.

---

### Task 4B.5 – Session history (read-only foundation)

**Why now**
Momentum and future insights rely on history being real, inspectable, and trusted.

---

#### Scope

- Show a simple list of **completed** sessions only:
  - Include sessions where `endedAt` exists
  - Sort newest first (by `endedAt` desc)
- Each list item shows:
  - Date (required)
  - Duration (optional)
- Tap → view session details in **read-only** mode:
  - Show session header (date/time, duration)
  - Show exercises and sets logged (weight/reps/RPE where present)

---

#### Guardrails

- Read-only is acceptable for MVP (no editing from history).
- Do not include insights or evaluative metrics (no totals, PRs, comparisons, charts).
- Active/in-progress sessions must not appear in History.

Editing can come later if needed.

---

### Phase 4B Guardrails (non-negotiable)

- No rewards yet
- No XP yet
- No levels yet
- No progress bars
- No “you did X more than last time”

Everything remains **descriptive**, never interpretive.

> If Ghost Mode answers _“what happened before?”_
> Phase 4B answers _“can I rely on this?”_

---

## Phase 5 – Gamification Logic (Quiet, Intentional)

### Context

Phase 5 introduces **gamification as reinforcement**, not as the core product.

The intent is to:

- Support habit formation and prioritisation (e.g. “go to the gym soon”)
- Acknowledge consistency without judgement
- Avoid letting rewards overshadow the primary value: fast, trustworthy workout logging

To achieve this, Phase 5 is deliberately split into two sub-phases:

- **Phase 5A** focuses on _logic and minimal surfacing_:
  - Build the momentum and XP engines
  - Surface only what is necessary to support behaviour
- **Phase 5B** focuses on _careful UI exposure_:
  - Gradually introduce XP/Level visibility
  - Keep all progress indicators subdued and non-dominant

This separation prevents reward mechanics from compensating for UX gaps or becoming the focal point of the app.

---

## Phase 5A – Gamification Engine + Minimal Surfacing

### Task 5A.1 – Momentum calculation

**Purpose**
Provide light, factual pressure to maintain training cadence without using streaks or guilt framing.

---

#### Scope

- Determine momentum using **completed sessions only** (`endedAt` exists).
- Momentum is **Active** if the most recent completed session date is within the last **7 local calendar days**.
  - Use local day boundaries (not rolling 168-hour windows).
- Calculate:
  - Momentum status: `Active` / `Paused`
  - Days remaining in the 7-day window (0–7)

---

#### Display (Home, minimal)

- Show:
  - Momentum status
  - Last session date
  - Days remaining in the 7-day window (e.g. “2 days remaining”)
- Allow “0 days remaining” to be shown when the window has elapsed.
- Keep language neutral and factual (no warnings, no encouragement copy).

---

### Task 5A.2 – XP engine

**Purpose**
Acknowledge meaningful effort consistently, without encouraging optimisation or grind behaviour.

---

#### Scope

- On **session completion** (when `endedAt` is set for the first time):
  - +100 XP per completed session
  - +5 XP per set logged in that session
- Persist XP in `GamificationState` (`totalXp`).
- XP must only be awarded **once per session**.
  - Edits to completed sessions must not re-award XP.

---

#### Guardrails

- No celebratory UI
- No XP popups
- No progress bars
- No “XP gained” messaging yet

---

### Task 5A.3 – Level calculation

**Purpose**
Provide a stable, predictable sense of progression tied to long-term engagement.

---

#### Scope

- Level is calculated linearly:
  - `level = floor(totalXp / 1000) + 1`
- Store level as derived state (do not persist separately unless required).
- Linear progression is intentional for now; no difficulty scaling in Phase 5A.

---

#### Guardrails

- Do not display level progression UI yet beyond what is strictly required.
- Avoid “XP to next level” concepts.

---

## Phase 5B – Careful Progress Surfacing

### Context

Phase 5B introduces **visibility** of XP and levels without letting them dominate attention or behaviour.

The goal is:

- Make progress discoverable, not attention-grabbing
- Avoid turning Home into a dashboard
- Preserve logging as the primary action

---

### Task 5B.1 – XP & Level visibility (subdued)

#### Scope

- Introduce XP and Level visibility in the app:
  - Prefer secondary surfaces (e.g. Profile / Progress / Stats area)
  - If shown on Home, keep it visually small and non-dominant
- Show:
  - Current level
  - Total XP (optional)

---

#### Guardrails

- No progress bars
- No “XP to next level”
- No level-up animations or popups
- No celebratory language

Progress should feel informational, not aspirational.

---

### Task 5B.2 – Momentum + progress alignment

#### Scope

- Ensure Momentum remains the **primary behavioural signal**.
- XP and Level must never override or visually compete with Momentum status.
- Momentum communicates _recency and consistency_.
- XP/Level communicates _long-term engagement_.

---

## Phase 5 Guardrails (apply to all tasks)

- No streaks
- No guilt framing
- No push notifications
- No competitive language
- No social comparison
- No performance interpretation

Gamification should support the habit of training — not become the reason for it.

---

## Phase 6 – PR Detection & Highlights

### Implementation Context & Guardrails (Important)

**Intent**

PRs (Personal Records) exist to acknowledge _meaningful improvement over time_, not novelty or first use.
They should feel rare, factual, and earned — not automatic or celebratory.

Phase 6 should reinforce real progression without distorting XP, encouraging exercise hopping, or undermining trust in logged data.

---

### PR definition (critical)

A **PR** is detected **only when a user exceeds their own previous best** for an exercise.

In concrete terms:

- For a given exercise:

  1. Find the **highest weight previously recorded**

     - From completed sessions only (`endedAt` exists)
     - Exclude the current session

  2. Find the **highest weight in the current session**
  3. A PR exists **only if**:

     - A previous max exists, **and**
     - `currentMax > previousMax` (strictly greater)

---

### First attempts (baseline, not PRs)

- The **first time a user logs an exercise**, there is no previous best.
- This first recorded max establishes a **baseline**, not a PR.
- First attempts must:

  - NOT generate a PR event
  - NOT award PR XP
  - NOT be shown as a “PR” in the UI

This avoids “PR spam” where every new exercise appears as a PR and keeps PRs meaningful.

---

### Data filtering rules

- Ignore sets where:

  - `weight` is `null`
  - `weight` is `0` or less

- Do not round or normalise values during detection.
- Use stored numeric values as-is.
- Treat weight consistently (e.g. kg only for MVP).

---

### Historical comparison rules

- Historical max queries must:

  - Join `SessionExercise → Session`
  - Include only sessions with `endedAt`
  - Exclude the current session

- Ghost Mode and PR detection must follow the same “completed sessions only” rule.

---

### XP & idempotency (non-negotiable)

PR detection and XP awards must be **idempotent**.

That means:

- PRs and PR XP are awarded **once per session**, at first completion.
- Editing a completed session later must **not**:

  - Re-trigger PR detection
  - Re-award PR XP
  - Duplicate PR events

Recommended approach:

- Record awards per session (e.g. `sessionAwards` or similar)
- If awards already exist for a session, skip detection and XP logic

This keeps rewards stable and prevents XP inflation or trust-breaking behaviour.

---

### Session Highlights UI constraints

- PRs should be shown factually, not celebratorily.
- Avoid language like:

  - “New PR!”
  - “Amazing!”
  - “You crushed it”

- Prefer neutral copy such as:

  - “Top weight (new)”
  - “Previous best: 100kg”

PRs should feel like **records**, not achievements.

---

### Scope discipline

Phase 6 is intentionally narrow:

- Only **Top Weight PRs**
- No volume PRs
- No rep PRs
- No comparisons between users
- No charts or trend analysis

Those can come later if needed.

---

### Summary principle

> A PR means _you beat your own previous best_.
> If nothing was beaten, nothing should be celebrated.

---

## Phase 7 – Insights + History IA (MVP Only)

### Context

Phase 7 introduces lightweight insights while keeping Home calm and utilitarian.

Key IA principle:

- **History** = inspectable record of past sessions (primary utility).
- **Insights** = small, descriptive aggregates derived from history (secondary utility).

To avoid overloading Home and to keep navigation semantically correct:

- Insights should live on the same screen as History (top section), not on Home.
- Home should show only a compact “Recent sessions” preview (max 5) with a link to the full History view.

---

### Task 7.1 – Navigation & IA alignment (History is not “Insights”)

#### Scope

- Update the bottom nav and/or screen structure so “History” is a first-class destination.
- Recommended approach:
  - Rename the current `Insights` tab to **History**
  - Keep the existing History list on that screen
  - Add an **Insights** section at the top of the History screen (cards)

(Alternative acceptable approach: keep the tab name as Insights but ensure History is reachable via a clear “History” sub-section. Avoid making History feel hidden.)

#### Guardrails

- Do not add new tabs to the footer for MVP.
- Keep Home lightweight (no insight cards on Home).

---

### Task 7.2 – Home: Recent sessions preview (max 5)

#### Scope

- Home shows a compact “Recent sessions” preview:
  - Show last 5 **completed** sessions only (`endedAt` exists)
  - Each item shows:
    - Date (scannable format)
    - Quest name if present, otherwise a neutral fallback (e.g. “Session” or “Untitled session”)
    - Duration (optional)
- Add a “See all” action that navigates to the full History screen.
- Tapping a session navigates to the existing read-only session detail view.

#### Guardrails

- No evaluative language (“good session” etc.)
- No additional insight widgets on Home

---

### Task 7.3 – Insights card: Workouts per week (rolling 4 weeks)

#### Scope

- Display on the History screen in an “Insights” section (top).
- Compute sessions per week over the last 4 weeks:
  - Completed sessions only (`endedAt` exists)
  - Use local calendar day boundaries
  - Define week start as Monday (AU-friendly)
- Display as simple numbers (no heavy charts):
  - e.g. “Last 4 weeks: 9 sessions”
  - Optional: per-week breakdown as small text

#### Guardrails

- Descriptive only (no judgement, no goals)
- Avoid pressure copy

---

### Task 7.4 – Insights card: Recent PRs (PR highlights log)

#### Scope

- Display on the History screen in the “Insights” section.
- Show recent PR events from **stored PR events** (do not recompute PR logic on load).
- List last N PR events (e.g. 10):
  - Exercise name
  - New top weight
  - Session date

#### Guardrails

- Factual language only
- No celebration / confetti / “You’re improving” copy

---

### Task 7.5 – Performance constraints (important)

#### Scope

- Do not scan the entire DB on every render.
- Use bounded queries:
  - sessions within last 28 days (for weekly counts)
  - last 5 completed sessions (Home)
  - last N PR events (PR log)

Keep History and Home fast on mobile.

---

## Phase 8 – Export / Import (Backup)

### Task 8.1 – Export

- Generate JSON with:
  - schemaVersion
  - exportedAt
  - All entity arrays
- Trigger file download.

### Task 8.2 – Import

- File upload
- Validate schemaVersion
- Confirm destructive action
- Replace all local data with imported data.

---

## Phase 9 – Bodyweight Logging

### Task 9.1 – Bodyweight entry

- Add bodyweight log screen:
  - Date
  - Weight (kg)
  - Optional note
- Persist to IndexedDB.

### Task 9.2 – Bodyweight history view

- Simple list view (newest first).
- Graphing is out of scope for MVP.

---

## Phase 10 – PWA & Offline Validation

### Task 10.1 – Offline test

- Install PWA
- Disable internet
- Verify:
  - Start session
  - Log sets
  - Finish session
  - Data persists on reload

### Task 10.2 – Storage resilience check

- Refresh app
- Restart browser
- Confirm IndexedDB data intact.

---

## Phase 11 – Copy, Polish & Guardrails

### Task 11.1 – Copy pass

- Replace any:
  - “Workout” → “Session”
  - “Streak” → “Momentum”
  - “Broken / Failed” → neutral language
- Ensure no guilt phrasing anywhere.

### Task 11.2 – Performance pass

- Ensure set logging is fast on mobile:
  - No blocking spinners
  - Minimal reflows
- Ensure “Copy last attempt” is instant.

---

## Explicitly Out of Scope (Do NOT build)

- Authentication
- Cloud sync
- Notifications
- Custom quest builder
- Goals (bodyweight/PR)
- Charts beyond basic summaries
- Social features
- App Store packaging

---

## Definition of MVP Complete

- You can log a full session offline on your phone.
- You can see last attempt per exercise.
- Momentum reflects your real cadence (7 days).
- XP/Levels increment only for meaningful effort.
- Data can be exported and re-imported safely.
