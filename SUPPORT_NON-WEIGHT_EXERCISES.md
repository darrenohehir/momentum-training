# Plan: Support non-weight exercises (Treadmill / Cardio)

## Guiding decisions (lock these in first)

- A “set” is **not always weight × reps**
- We will **not rename `Set` yet** (too much churn)
- We introduce a **discriminator** and optional metrics
- Treadmill = **cardio**
- Intervals = **notes-only for MVP**
- History remains a **timeline**, not analytics

---

## Phase A — Model updates (foundational, low risk)

### Task A1 — Extend `Set` with a discriminator

**File:** `set.model.ts`

Add a `kind` field:

```ts
export type SetKind = "strength" | "cardio" | "timed";

export interface Set {
  id: string;
  kind?: SetKind; // optional for backward compatibility

  // existing strength fields
  reps?: number;
  weight?: number;
  weightUnit?: "kg" | "lb" | "bw";
  rpe?: number;

  // cardio / timed
  durationSec?: number;
  distance?: number;
  distanceUnit?: "km" | "mi";
  incline?: number;

  createdAt: number;
}
```

**Rules**

- If `kind` is missing → treat as `'strength'`
- Do **not** remove or rename existing fields

---

### Task A2 — Confirm Exercise typing is the source of truth

**File:** `exercise.model.ts`

Add (or confirm) a log type field:

```ts
export type ExerciseLogType = "strength" | "cardio" | "timed";

export interface Exercise {
  id: string;
  name: string;
  logType: ExerciseLogType;
}
```

If `logType` already exists but is named differently, **do not add a second field** — reuse it.

---

### Task A3 — Mark Treadmill as cardio

**Wherever default exercises are defined**

- Set:

  ```ts
  logType: "cardio";
  ```

Optional (but sensible):

- Row / Bike → cardio
- Plank → timed

---

## Phase B — Dexie schema + migration (minimal)

### Task B1 — Bump DB version

**Dexie schema file**

- Add new optional fields to `sets` table
- No new indexes needed for MVP

### Task B2 — Backward compatibility handling

In app code (not DB):

- When reading a set:

  ```ts
  const kind = set.kind ?? "strength";
  ```

You **do not need** to eagerly migrate existing records unless you want to.

---

## Phase C — Session logging UI (where this matters)

### Task C1 — Choose editor by exercise logType

**Session exercise detail screen**

- `strength` → existing set editor
- `cardio` → new cardio editor
- `timed` → duration-only editor (can reuse cardio UI)

No branching anywhere else.

---

### Task C2 — Cardio editor (MVP spec)

**Required**

- Duration (minutes + seconds)

**Optional**

- Distance
- Incline

**Explicitly out of scope**

- Pace/speed fields (derive later if needed)
- Interval tables
- Per-set notes

Keep this _fast to log on a phone_.

---

### Task C3 — Cardio set row display

In-session display examples:

- `25:00 · 4.2 km · 1%`
- `15:00 · 2.0 km`

No totals, no comparisons.

---

## Phase D — History compatibility

### Task D1 — History summary formatting

Where History builds display text for a session:

- If exercise contains **cardio sets**, include:
  - duration (+ distance if present)

- Strength formatting remains unchanged

Example History row:

> Treadmill · 25 min · 4.2 km

---

### Task D2 — Filtering sanity check

Your existing History filter (Sessions | Bodyweight | Food):

- **No changes required**
- Cardio is still part of a Session

---

## Phase E — Export compatibility

### Task E1 — Update export payload

**File:** `export-payload.model.ts`

- Ensure `Set.kind` and new optional fields are included
- Preserve backward compatibility for existing exports

No transformation needed — just inclusion.

---

## Phase F — Validation & guardrails

### Task F1 — Validation rules

- Strength:
  - `reps` required

- Cardio / timed:
  - `durationSec` required

- Do **not** block saving if distance/incline are missing

### Task F2 — Editing old sessions

- Existing strength sessions must load and edit unchanged
- No UI regressions allowed here

---

## What we are explicitly NOT doing (important)

- Renaming `Set` to `Entry`
- Interval modelling
- Charts, trends, summaries
- Cardio-only sessions outside Session model
- Per-day totals
