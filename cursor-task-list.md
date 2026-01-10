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

### Task 4.1 – Last attempt query

- For a given exerciseId:
  - Fetch most recent previous SessionExercise + its Sets.
- Ensure current session is excluded.

### Task 4.2 – Display last attempt

- In-session, show:
  - Last attempt date
  - List of sets (weight × reps)

### Task 4.3 – Copy last attempt

- Button copies previous sets into current session (new Set records).
- Allow editing after copy.

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

## Phase 7 – Insights (MVP Only)

### Task 7.1 – Workouts per week (rolling 4 weeks)

- Compute sessions per week for last 4 weeks.
- Display simple numeric summary (no heavy charts).

### Task 7.2 – Recent sessions list

- Show last 5 sessions with:
  - Date
  - Quest name (if any)
  - Basic volume summary (optional).

### Task 7.3 – PR highlights log

- Show recent PR events (derived from sessions).

---

## Phase 8 – Bodyweight Logging

### Task 8.1 – Bodyweight entry

- Add bodyweight log screen:
  - Date
  - Weight (kg)
  - Optional note
- Persist to IndexedDB.

### Task 8.2 – Bodyweight history view

- Simple list view (newest first).
- Graphing is out of scope for MVP.

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
