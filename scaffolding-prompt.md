# Project: Momentum Gym

(Offline-first personal fitness logger: sessions, bodyweight, food)

Build an offline-first personal fitness logging app for a single user (MVP) using Ionic + Angular, PWA support, IndexedDB persistence, and JSON export/import backup.

The app supports **multiple log types** (Workout Sessions, Bodyweight, Food) and is lightly gamified via:

- Momentum (rolling window, session-based)
- XP / Levels (evidence of effort)
- PR highlights
- “Previous You” comparisons

No social features. No coaching. No judgement.

---

## Product framing (critical)

This is **not** a coaching app, calorie police, or streak machine.

- Logging is neutral and voluntary
- Gamification is informational, not motivational pressure
- History is a timeline, not a scoreboard
- Home is status-oriented, not action-pushy

Avoid assumptions that:

- workouts are the only meaningful activity
- logging food/bodyweight should earn XP
- calendars imply streaks or missed days

---

## Non-negotiable product goals

1. Fast logging on phone (low friction, minimal taps).
2. Offline-first: fully usable without internet.
3. Local persistence via IndexedDB.
4. Backup in MVP: Export / Import JSON in Settings.
5. Gamification is low-noise and intentional (session-end feedback only).
6. Responsive: works well on iPhone and desktop PWA.

---

## Core information architecture (lock this in)

### Primary navigation (bottom tab bar)

- Home
- History
- FAB (Create / Log actions – not navigation)
- Exercises
- Settings

### Screen responsibilities

**Home**

- Status and motivation surface
- Shows momentum, XP/level (secondary), recent activity
- Does NOT initiate logging directly

**History**

- Unified timeline for all log types
- Contains calendar visualisation + log list
- Supports filtering (All / Sessions / Bodyweight / Food)

**FAB**

- Global create control (available across main tabs)
- Opens explicit actions:
  - Start session
  - Log bodyweight
  - Log food

**Exercises**

- Exercise library (seeded + user-created)
- May later support saved sessions / quests (future)

**Settings**

- Import / export
- App configuration (minimal in MVP)

---

## MVP scope (must build)

### Logging flows

#### Workout session

- Start session:

  - Optional Quest label (template-style, non-binding):
    - Quick Session (default)
    - Full Body
    - Upper
    - Lower

- Session in progress:

  - Add exercises (library or create new)
  - Reorder exercises
  - For each exercise:
    - Show “Last attempt” summary (date + sets)
    - Optional “Copy last attempt” action
    - Set table:
      - weight, reps
      - optional RPE toggle (hidden by default)
      - add/remove sets

- Finish session:
  - Summary screen
  - XP earned
  - PR highlights (if any)

#### Bodyweight log

- Add entry:

  - date (defaults to today)
  - weightKg
  - optional note

- Visible in:
  - History timeline
  - History calendar markers

(No graphs in MVP.)

#### Food log

- Add entry:

  - date/time (defaults to now)
  - calories (number)
  - optional note

- Treated as a factual log only
- No macro breakdown in MVP
- No XP by default

---

### Home (status surface)

Home may show:

- Momentum status (Active / Paused)
- XP + Level (secondary emphasis)
- Recent activity (last few logs)
- Optional shortcuts to History views

Home must NOT:

- Contain “Start session” or “Log now” CTAs
- Show missed days
- Show trends or evaluations

All creation happens via the global FAB.

---

### History (timeline + calendar)

- Default view: All log types
- Filter options:
  - All
  - Sessions
  - Bodyweight
  - Food

#### Calendar visualisation (inside History)

- Month grid at top of History
- Each day may show neutral markers for:
  - Session(s)
  - Bodyweight entry
  - Food entry

Calendar rules:

- Informational only
- No streaks
- No heatmaps
- No “missed” styling
- No counts in grid cells

#### Day focus

- Tap a day to focus History on that date
- Show list of logs for that day
- Logs are factual (“Logged”, “Recorded”)

---

## Gamification rules (MVP)

### Momentum

- Defined by workout sessions only
- Active if a Session exists within the last 7 days
- Paused otherwise
- Show “Days remaining” (0–7)
- No streak shields in MVP

### XP

- +100 XP on session completion
- +5 XP per set logged
- +50 XP per PR detected
- Cap PR bonus at 3 per session
- XP is shown only at session end

No XP for:

- Bodyweight logs
- Food logs
- Opening the FAB

### Levels

- Level = floor(totalXp / 1000) + 1

### PR detection

- Per exercise:
  - “Top Weight PR” if any set exceeds historical max
- Keep language factual and restrained

### Previous You (Ghost)

- Always show “Last attempt” for an exercise
- Copying last attempt creates new editable sets

---

## Copy + tone requirements

- Neutral, factual language only:

  - “Session” (not “Workout”)
  - “Momentum” (not “Streak”)
  - “Paused” (not “Broken”)
  - “Last attempt” (not “Last workout”)

- No guilt or failure framing
- No celebratory excess
- Feedback happens at natural boundaries (e.g. session end)

---

## Out of scope (explicitly not MVP)

- Authentication
- Cross-device sync
- Social features
- Push notifications
- Coaching, targets, or recommendations
- Streak shields
- Advanced charts or analytics
- App Store packaging

---

## Technical requirements

### Stack

- Ionic + Angular
- PWA enabled
- IndexedDB via Dexie
- Strong typing (TypeScript interfaces)
- Simple Angular services for state

---

## Data model (IndexedDB)

Stores:

- Exercise { id, name, category, equipmentType, notes?, createdAt, updatedAt }
- Session { id, startedAt, endedAt, questId?, notes?, createdAt, updatedAt }
- SessionExercise { id, sessionId, exerciseId, orderIndex, notes? }
- Set { id, sessionExerciseId, setIndex, weight?, reps?, rpe?, isWarmup?, createdAt }
- BodyweightEntry { id, date, weightKg, note?, createdAt }
- FoodEntry { id, loggedAt, calories, note?, createdAt }
- GamificationState { totalXp }

All exports include:

- schemaVersion
- exportedAt

---

## Conventions

- IDs: UUID v4 (client-side)
- Dates:
  - Timestamps as ISO 8601 strings
  - BodyweightEntry.date stored as `YYYY-MM-DD`
- Units:
  - All weights in kilograms

---

## Export / Import

- Export:

  - Single JSON file containing all stores

- Import:
  - Validate schemaVersion
  - Replace all local data after confirmation
  - Provide defaults for missing optional fields

---

## UI direction

- Dark “instrument panel” aesthetic
- Near-black background
- Soft off-white text
- Single restrained accent colour
- Minimal motion, no celebratory animations
- Typography:
  - Inter (UI)
  - Optional mono for numbers

---

## UI implementation rules (Ionic)

- Use Ionic components as primary building blocks
- Do NOT add Bootstrap or Tailwind
- Theme via CSS variables in `variables.scss`
- Minimal global utilities only
- Prefer Ionic CSS variables and `::part`
- Keep custom components limited and purposeful

---

## Implementation guidance

Suggested order:

1. Models + DB service + seed data
2. Home + History scaffold (empty states)
3. Session flow (start → log → finish)
4. Exercise library + last attempt + copy
5. XP / PR / Momentum logic
6. Bodyweight + Food logging
7. History calendar visualisation
8. Export / Import

Ask the user only when a decision blocks implementation.  
Prefer reasonable defaults over speculation.
