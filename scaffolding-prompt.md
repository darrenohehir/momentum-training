# Project: Momentum Gym (Offline-first gamified workout logger)

Build an offline-first workout logging app for a single user (MVP) using Ionic + Angular, PWA support, IndexedDB persistence, and JSON export/import backup. The app is gamified via “Momentum” (rolling window), XP/Levels (evidence of effort), PR highlights, and “Previous You” ghost comparisons. No social features.

## Non-negotiable product goals

1. Fast set logging on phone at the gym (minimal friction).
2. Offline-first: fully usable without internet, data persists locally via IndexedDB.
3. Backup in MVP: Export/Import JSON in Settings.
4. Gamification is intentional and low-noise (session-end feedback, no guilt language).
5. Responsive: works well on iPhone and MacBook.

## MVP scope (must build)

### Core flows

- Home dashboard:
  - Primary CTA: “Start session”
  - Momentum status (Active/Paused) based on rolling 7-day rule
  - “Days remaining” until momentum expires
  - Quick view: last 5 sessions
  - XP + Level summary (small, not noisy)
- Start session:
  - Choose a Quest (template label) from preset list:
    - Quick Session (blank)
    - Full Body (preset)
    - Upper
    - Lower
  - User can proceed without selecting (defaults to Quick Session)
- Session in progress:
  - Add exercises (select from library or create new)
  - Reorder exercises
  - For each exercise:
    - Show “Last attempt” summary (last date + last sets)
    - “Copy last attempt” button to prefill sets
    - Set table with quick entry:
      - weight, reps, optional RPE toggle (hidden by default)
      - add set, remove set
  - Finish session:
    - Summary screen with XP earned and Highlights (PRs detected)
- Exercise library:
  - List + search
  - Add exercise (name, category, equipmentType, optional notes)
- Insights (MVP minimal):
  - Workouts per week (rolling 4 weeks)
  - Momentum status
  - PR highlights log (can be derived per session or computed)
  - Per-exercise trend (at least show last attempts; graphs can be Phase 2)
- Bodyweight log:
  - Add entry (date, weightKg, optional note)
  - Simple history list (graph can be Phase 2)
- Settings:
  - Momentum rule is fixed at 7 days in MVP UI (configurable later)
  - Export JSON (download file)
  - Import JSON (upload file; simplest: replace all local data after confirmation)

### Gamification rules (MVP)

- Momentum (rolling window):
  - Active if a Session exists within the last 7 days
  - Paused otherwise
  - Show “Days remaining” (0–7)
  - NO streak shields in MVP (but keep logic extensible)
- XP:
  - +100 XP on session completion
  - +5 XP per set logged (count sets saved in session)
  - +50 XP per PR detected in that session (cap PR bonus to 3/session)
  - Show XP only at session end (avoid spam)
- Levels:
  - Level = floor(totalXp / 1000) + 1
- PR detection (MVP):
  - Per exercise: “Top Weight PR” if any set weight exceeds historical max
  - Keep PR announcements factual (no cringe)
- Ghost mode:
  - Always show “Last attempt” for an exercise in session
  - Provide “Copy last attempt” to prefill sets

### Copy + tone requirements

- Use neutral language:
  - “Session” not “Workout”
  - “Momentum” not “Streak”
  - “Paused” not “Broken”
  - “Last attempt” not “Last workout”
- No guilt phrasing (“failed”, “lost”, “broke your streak”).
- Feedback is session-end oriented.

## Out of scope (explicitly not MVP)

- Authentication
- Cross-device sync
- Social leaderboards
- Custom quest builder
- Streak shields
- Advanced charts, estimated 1RM, complex PR types
- Push notifications
- App Store packaging (Capacitor can be considered later)

## Technical requirements

### Stack

- Ionic + Angular
- PWA enabled (service worker) for offline use
- IndexedDB for persistence
  - Use Dexie for IndexedDB. Implement a DbService that encapsulates Dexie and exposes CRUD/query methods.
- Strong typing for models (TypeScript interfaces)
- Simple state management (Angular services; avoid overengineering)

### Data model (IndexedDB stores)

Implement the following entity stores:

- Exercise { id, name, category, equipmentType, notes?, createdAt, updatedAt }
- Session { id, startedAt, endedAt, questId?, notes?, createdAt, updatedAt }
- SessionExercise { id, sessionId, exerciseId, orderIndex, notes? }
- Set { id, sessionExerciseId, setIndex, weight?, reps?, rpe?, isWarmup?, createdAt }
- BodyweightEntry { id, date, weightKg, note?, createdAt }
- GamificationState { totalXp } (or compute XP; MVP can store totalXp for simplicity)
  All exports must include schemaVersion + exportedAt.

### Conventions

- IDs: All entities use `id: string` generated as UUID v4 on the client. Use a lightweight UUID generator (e.g. `crypto.randomUUID()` where available; provide a small fallback if needed).
- Dates: Store all timestamps as ISO 8601 strings (`new Date().toISOString()`), not `Date` objects. For `BodyweightEntry.date`, store as an ISO date string `YYYY-MM-DD` (local day), separate from `createdAt`.
- Units: Store all load values in kilograms (`weightKg: number`). Bodyweight also stored as `weightKg`. Display `kg` in the UI.

### Export/Import

- Export:
  - Create a JSON file containing all stores, plus schemaVersion and exportedAt.
- Import:
  - Validate schemaVersion
  - MVP simplest behavior: replace all local data with imported data after confirmation
  - Ensure import does not crash if optional fields missing (provide defaults)

### Computed logic

- Momentum:
  - Determine last session date and compare to now (rolling 7-day window)
- Last attempt per exercise:
  - Query most recent SessionExercise for that exerciseId and load its Sets
- PR detection:
  - For each exercise in completed session, compare max weight in session vs historical max weight

### UI direction

- Visual style: dark “instrument panel” system UI
- Background: near-black / charcoal
- Text: soft off-white, avoid pure white
- Accent: single restrained colour (blue/amber/green), used sparingly for primary actions + key state indicators
- Layout: clean hierarchy, generous spacing, minimal decoration
- Motion: subtle state transitions only; no confetti / fireworks / loud celebratory animations
- Typography: Inter (UI), optional mono for numbers (IBM Plex Mono)

### UI implementation rules (Ionic)

- Use Ionic components as the primary UI building blocks (ion-header, ion-toolbar, ion-content, ion-card, ion-list, ion-item, ion-button, ion-input, ion-modal, ion-alert).
- Do NOT add Bootstrap or Tailwind for MVP.
- Implement the design system using Ionic theming:
  - Define colours and typography via CSS variables in `src/theme/variables.scss`.
  - Add small global utility classes and overrides in `src/global.scss` (or `src/theme/global.scss` depending on project structure).
- Prefer styling via Ionic CSS variables and component parts (`::part`) where needed; avoid fragile deep selectors.
- Create only a small number of custom components for specialised UI (e.g., set logging rows); keep the rest as Ionic defaults themed to match DESIGN.md.

## Deliverables

1. Working Ionic Angular app with the above MVP flows.
2. IndexedDB persistence with stable schemas and versioning.
3. PWA offline capability.
4. Export/Import backup in Settings.
5. Clean UI tuned for fast set logging on mobile.

## Implementation guidance

- Start with models + DB service + seed data.
- Build Home -> Start Session -> Session In Progress -> Finish flow first.
- Then add Exercise library + last attempt + copy last attempt.
- Then add XP/PR/momentum computation.
- Then Settings export/import.
- Then bodyweight log + minimal insights.

Ask me (the user) only if a decision blocks implementation. Prefer reasonable defaults.
