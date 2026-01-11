# Momentum — UX Principles & Acceptance Criteria

This document defines the core UX principles that guide Momentum’s design and interaction model.
It exists to ensure consistency, restraint, and long-term usability as features are added.

Momentum is a **personal, offline-first fitness log** designed to support habit formation and real progress — not performance theatre.

---

## 1. Core UX Philosophy

### 1.1 Instrument Panel, Not a Game

Momentum should feel like a calm instrument panel:

- informative
- reliable
- non-judgemental

Gamification exists to **support consistency**, not to create pressure, competition, or spectacle.

---

### 1.2 Silence Is Confidence

- Data is saved automatically.
- The UI does not ask for confirmation unless strictly necessary.
- No “Saved” toasts or celebratory noise for routine actions.

If something persists and remains visible after refresh, that _is_ the feedback.

---

### 1.3 No Guilt, No Failure States

Momentum avoids language that implies failure or shame.

Avoid:

- “Failed”
- “Broken”
- “Missed”
- “You should…”

Prefer:

- “Paused”
- “Last active”
- “Previous”
- Neutral, factual phrasing

---

## 2. Interaction Contracts

These are non-negotiable interaction rules unless explicitly revisited.

### 2.1 Immediate Persistence

- All logging (sets, reps, weight, bodyweight) is persisted automatically.
- No Save buttons for logging flows.
- Users should never wonder whether something is saved.

This mirrors apps like Notes or Google Docs.

---

### 2.2 Low Cognitive Load During Workouts

While a session is in progress:

- One-handed use should be possible.
- No blocking modals.
- No required confirmations.
- No forced decisions beyond the next obvious action.

Logging should never interrupt the workout.

---

### 2.3 Reversibility Over Confirmation

Mistakes are expected.

Prefer:

- Undo
- Editing
- Deleting

Avoid:

- “Are you sure?” dialogs
- irreversible actions without clear intent

---

## 3. Ghost Mode (“Previous You”) Principles

Ghost Mode exists to provide **context**, not instruction.

### 3.1 Passive by Default

- Previous attempts are shown as reference, not prompts.
- They should never block or interrupt logging.
- Display should be visually secondary.

Ghost Mode says:

> “Here’s what you did last time.”
> Not:
> “Do better.”

---

### 3.2 Copying Is a Starting Point

When copying a previous attempt:

- Sets are immediately editable.
- The user does not commit to matching past performance.
- Copying should feel safe and reversible.

---

## 4. Gamification Principles

### 4.1 Earned, Not Farmed

Rewards (XP, levels) are:

- earned through meaningful actions
- awarded on session completion, not taps
- capped where appropriate to avoid abuse

Opening the app or tapping UI should never grant rewards.

---

### 4.2 Secondary, Not Dominant

Gamification elements:

- are visually understated
- never dominate the screen
- never interrupt logging flows

They are reinforcement, not the main attraction.

---

## 5. Insights & Feedback

### 5.1 Reflective, Not Prescriptive

Insights should:

- reflect patterns
- surface trends
- avoid telling the user what they “should” do

Momentum shows what _is_, not what _must be_.

---

### 5.2 Small Wins Over Grand Claims

Prefer:

- “You trained 3 times in the last 4 weeks”
- “New best for Chest Press”

Avoid:

- exaggerated language
- inflated milestones
- comparative statements

---

## 6. Tone & Copy Guardrails

- Neutral
- Calm
- Encouraging without hype
- No exclamation marks by default
- No “you failed” framing

Momentum should feel like a steady companion, not a coach yelling from the sidelines.

---

## 7. MVP Restraint

If a feature:

- adds friction during logging
- increases cognitive load
- introduces judgement or pressure

…it should be deferred, simplified, or cut from MVP.

Momentum favours **consistency over intensity**.

---
