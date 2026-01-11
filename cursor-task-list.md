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

- Allow reordering of `SessionExercise` items
- Update `orderIndex` immediately
- Persist instantly to IndexedDB

---

#### Guardrails

- No edit mode
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

#### Explicitly out of scope

- Validation warnings
- Required fields
- “Incomplete set” language
- Auto-corrections that interrupt typing

Empty is valid. Silence is preferred.

---

### Task 4B.4 – Post-session review surface (descriptive only)

**Why now**
Before XP exists, users need confidence in _what was logged_, not evaluation of _how well they did_.

---

#### Scope

- After finishing a session:

  - Show all exercises and sets logged
  - Allow immediate edits (optional but preferred)

---

#### Guardrails

- No praise
- No success framing
- No performance interpretation

This screen is about correctness, not reflection or motivation.

---

### Task 4B.5 – Session history (read-only foundation)

**Why now**
Momentum and future insights rely on history being real, inspectable, and trusted.

---

#### Scope

- Simple list of past sessions:

  - Date
  - Duration (optional)

- Tap → view session
- Read-only is acceptable for MVP

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

### Task 5.1 – Momentum calculation

- Implement rolling 7-day momentum logic:
  - Active if latest session date >= (now - 7 days)
- Calculate:
  - Momentum status (Active / Paused)
  - Days remaining in window
- Display on Home.

### Task 5.2 – XP engine

- On session completion:
  - +100 XP
  - +5 XP per set logged in that session
- Store totalXp in GamificationState.

### Task 5.3 – Level calculation

- Level = floor(totalXp / 1000) + 1
- Display XP + Level on Home (small, not dominant).

---

## Phase 6 – PR Detection & Highlights

### Task 6.1 – PR detection logic

- For each exercise in completed session:
  - Compare max weight vs historical max weight.
- Detect “Top Weight PR”.

### Task 6.2 – Session Highlights

- At Session Summary:
  - List PRs detected
  - Award +50 XP per PR (cap at 3 per session)
- Update totalXp accordingly.

---

## Phase 7 – Bodyweight Logging

### Task 7.1 – Bodyweight entry

- Add bodyweight log screen:
  - Date
  - Weight (kg)
  - Optional note
- Persist to IndexedDB.

### Task 7.2 – Bodyweight history view

- Simple list view (newest first).
- Graphing is out of scope for MVP.

---

## Phase 8 – Insights (MVP Only)

### Task 8.1 – Workouts per week (rolling 4 weeks)

- Compute sessions per week for last 4 weeks.
- Display simple numeric summary (no heavy charts).

### Task 8.2 – Recent sessions list

- Show last 5 sessions with:
  - Date
  - Quest name (if any)
  - Basic volume summary (optional).

### Task 8.3 – PR highlights log

- Show recent PR events (derived from sessions).

---

## Phase 9 – Export / Import (Backup)

### Task 9.1 – Export

- Generate JSON with:
  - schemaVersion
  - exportedAt
  - All entity arrays
- Trigger file download.

### Task 9.2 – Import

- File upload
- Validate schemaVersion
- Confirm destructive action
- Replace all local data with imported data.

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
