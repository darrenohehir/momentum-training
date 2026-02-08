Below is a clean, pragmatic `UX_FUTURE_CONSIDERATIONS.md`. It documents _why_ current decisions were made, what risks there's awareness of, and what low-cost options exist later — without committing you to any of them now.

---

## Future Improvements – Session Logging UX

### Context

The app supports **copying the previous session’s sets** (“Ghost Mode”) to speed up logging and provide historical context.

Copied sets are immediately persisted and editable, following an **immediate persistence** model (similar to Apple Notes).

For MVP:

- Copying is **explicit and optional**
- Copied sets are **normal sets** (not special or locked)
- Copy action is **hidden once any sets exist** for an exercise

This document captures known UX considerations and potential refinements, without committing to implementation.

---

### Known UX Risk: Losing Track of Set Progress

When sets are pre-populated (via “Copy last sets”), users may momentarily lose track of:

- Which set they are currently performing
- Whether a row reflects a completed set or a planned one

This is a known tradeoff of pre-filled structures and is accepted for MVP.

---

### Current MVP Decision

For now:

- No additional visual indicators are shown for copied sets
- No confirmations or “undo” flows are introduced
- Copy button is hidden once any sets exist (including empty rows)

Rationale:

- Keeps the flow fast and interruption-free
- Matches the app’s calm, non-judgemental philosophy
- Avoids premature complexity before real-world usage data

---

### Potential Future Enhancements (Optional)

If this becomes a real usability issue through personal use, the following **low-scope patterns** could be explored:

#### 1. Copied State Indicator (Transient)

- Subtle “Copied” label or dot on each set row
- Automatically disappears once the user edits that row
- No persistent state or database flag required

**Benefit:** Light context without implying expectation

---

#### 2. Active Set Marker

- Allow the user to tap a set row to mark it as “current” or “completed”
- Visual cue only (e.g. checkmark or muted styling)
- Entirely optional and manual

**Benefit:** Helps orientation during longer workouts

---

#### 3. Focus Highlighting

- When a set’s input gains focus, visually highlight the row
- Helps users reorient after switching apps or screens

**Benefit:** Extremely low cost, minimal UI noise

---

### Explicitly Out of Scope (Unless Reconsidered)

- Automatic progression through sets
- “Did you beat last time?” comparisons
- Mandatory confirmations or dialogs
- Locked or read-only copied sets
- Performance pressure language or visuals

These patterns conflict with the app’s intent to be **supportive, neutral, and non-punitive**.

---

### Guiding Principle

> **Speed and clarity first. Motivation is a side-effect, not a feature.**

Any future enhancement should:

- Reduce cognitive load
- Never imply obligation or failure
- Be removable without breaking core flows

---

## Consider folding 'Top Weights' (.highlights-section) into existing 'Exercises' section

- This would call out PRs (Top Weights) in context of the summary list of exercises, rather than as a new section.

---

## PRs (Top Weights) should take reps into consideration

- Right now it's just exercise weight - i.e. if I first do 20KG x 10 reps, and then later do 20kg x 12 reps, this should be considered a PR.
- In this case the total volume has increased, not the 'weight' though.
- Not sure how best to refactor this.
- Not sure if you did 10kg x 25 reps if this would count as a PR? Perhaps it's by weight level, not calculating by 'volume' across all possibilities?

---

## Consider how to handle non-weight exercises like Treadmill.

- Treadmill is more about distance, pace, ramp, etc. It's not the typical 'set' = 'weight' x 'reps'.

---

**Calendar month switching**

- Changing the visible calendar month does not filter or affect the History list.
- The calendar is an informational overlay only.

---

## Outstanding changes (rewritten & sequenced)

### ✅ Priority 1 — Consistency & correctness (should be addressed next)

#### 1. Session edit “cancel vs finish” behaviour (data integrity bug)

**Problem**

- Opening an old session in edit mode and exiting via the footer **“Finish session”** button updates `endedAt` to the current date/time.
- Exiting via the header **Done/Cancel** button does _not_ update `endedAt`.
- This creates an inconsistency and can corrupt historical data if the user accidentally presses “Finish” on an old session.

**Intent**

- Editing an existing session should not implicitly mean “finish now”.
- `endedAt` should only change when the user explicitly intends to finish a session.

**Potential approaches**

- Disable or hide the footer “Finish session” button when editing an existing session.
- Or: only update `endedAt` if session content has actually changed.
- Or: separate “Finish session” (creation flow) from “Save changes” (edit flow).

**Related consideration**

- There is currently no way to edit session start/end date or time.
- This becomes problematic if the user forgets to log a session until later.
- A potential solution is allowing date/time edits from the session summary screen, but this needs careful UX consideration.

---

### 🟡 Priority 2 — Navigation consistency (low risk, high coherence)

#### 2. Home → Recent activity session taps should open the editor

**Problem**

- Session items under **Home → Recent activity** open a view-only screen.
- This is inconsistent with:
  - History behaviour (now opens session editor)
  - Food/bodyweight behaviour (open editor directly)

**Intent**

- Maintain a single mental model:
  - Tapping a past log always opens the editor.
  - There is no separate “view-only” experience for personal logs.

**Proposed change**

- Update Home → Recent activity session taps to navigate directly to `/session/:id` (edit view).
- Deprecate view-only session surfaces from user navigation.

---

### 🟡 Priority 3 — Import & inference robustness (edge cases, not urgent)

#### 3. Improve cardio inference to avoid false positives

**Problem**

- The current fallback inference logic treats any exercise name containing `row` as cardio.
- This incorrectly classifies user-created exercises like “Barbell Row”.

**Intent**

- Inference should be a safety net, not a source of misclassification.

**Potential refinements**

- Use stricter matching (whole words, exact known names).
- Prefer explicit `logType` over inference whenever possible.
- Limit inference to a small whitelist of known cardio machines.

---

### 🟡 Priority 4 — Data freshness & UI feedback

#### 4. Newly created exercises don’t appear immediately in the Exercises tab

**Problem**

- When a user creates a new exercise during session logging, it does not appear in the Exercises tab until a full refresh.

**Intent**

- Creating an exercise should feel immediate and reliable.
- Lists should reflect newly created data without requiring refresh.

**Likely cause**

- Missing refresh / event emission after exercise creation.

---

### 🟢 Priority 5 — Enhancements (explicitly non-blocking)

#### 5. Swipe gestures for calendar month navigation

**Intent**

- Improve ergonomics and discoverability for calendar month switching.
- This is a pure enhancement and should not introduce new states or logic.

---

#### 6. Add more seeded exercises

**Intent**

- Improve first-run experience and reduce friction for common activities.
- Not required for correctness or core flows.

---

## Suggested sequencing (explicit)

If you want this as a roadmap:

1. **Session edit lifecycle fix** (cancel vs finish, endedAt safety)
2. **Home → Recent activity navigation alignment**
3. **Exercise inference tightening**
4. **Exercises tab refresh bug**
5. **Calendar swipe gestures**
6. **Additional seeded exercises**

---
