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

## Swipe gestures for calendar month switching

---

## BUGFIX: Opening a session (Edit view) there's no way to cancel

- If you dismiss a session edit page via header checkmark button, it won't update ended at time if inputs are unchanged.
- However, if you dismiss a session edit page via footer `Finish session` button, this displays the summary screen and updates the `Ended` time to current date/time.
- This means if you click into a session log from a long time ago, and accidentally dismiss via the footer button, it updates to the current date/time incorrectly.
- Potentially solved by disabling the footer button until inputs are changed. Or by not updating the ended at time if inputs are unchanged.

- There's no way for the user to edit start or end dates/times for sessions. I appreciate the UX in terms of assuming the current date and time, but I anticipate forgetting to log a session until the next day in which case for accurate logging being able to change the date/time is ideal. I wonder if using the session summary as a way to provide editable date/time inputs is a solution here.

---

## Add more seeded exercises beyond the 3 already added

---

## Refactor `Recent activity` on the home page

- The session items on the home page under `Recent activity` display a view-only page which should be deprecated.
- This could be replaced with something else - 'stats'?

---

## If the user adds their own exercise like `Barbell Row` the keyword `row` incorrectly identifies it as a cardio exercise.

---

## When adding a new exercise via session logging flow, the `Exercises` tab does not reflect the newly added exercise until refresh

---
