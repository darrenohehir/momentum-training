# Momentum — Design System (MVP)

This document defines the visual and interaction design principles for **Momentum**.
It is intentionally minimal and system-oriented, prioritising clarity, consistency, and long-term usability over decorative or novelty-driven UI.

The goal is to support habit formation and sustained progress, not short-term motivation spikes.

---

## 1. Design Philosophy

Momentum is a **tool**, not a game interface.

The design should:

- Feel calm, focused, and serious
- Reduce cognitive load during workouts
- Reinforce long-term progress and consistency
- Avoid guilt, noise, or overstimulation

The UI should feel like:

> “A quiet instrument panel for tracking effort over time.”

Avoid:

- Bright or neon colours
- Visual noise
- Gamified effects (confetti, fireworks, badges)
- Fitness clichés or hype aesthetics

---

## 2. Visual Direction

### Overall Style

- Dark system UI
- Flat, minimal surfaces
- Clear hierarchy
- Restraint in colour and motion

### Mood Keywords

- Instrumental
- Calm
- Grounded
- Analytical
- Trustworthy

---

## 3. Colour System

### Backgrounds

- **Primary background:** Near-black / charcoal
  - Example: `#0E0F12`
- **Surface / card background:** Slightly lighter than background
  - Example: `#15171C`
- **Elevated surface:** Subtle contrast only
  - Example: `#1B1E24`

Avoid pure black; use soft dark neutrals to reduce eye strain.

---

### Text Colours

- **Primary text:** Soft off-white
  - Example: `#E6E7EB`
- **Secondary text:** Muted grey
  - Example: `#9BA1AC`
- **Tertiary / hint text:** Low-contrast grey
  - Example: `#6F7682`

Avoid pure white (`#FFFFFF`) except in rare emphasis cases.

---

### Accent Colour (Primary Action / State)

Use **one restrained blue that leans slightly cyan**, but remains calm and professional.

- **Primary accent:**
  - Example: `#4FA3D1` (blue with a subtle cyan lean)
- **Accent muted / hover:**
  - Example: `#3D8DB8`
- **Accent subtle (borders, indicators):**
  - Example: `rgba(79, 163, 209, 0.25)`

Usage rules:

- Accent is for **primary actions**, key indicators, and focus states.
- Do **not** use accent for decorative elements.
- Do **not** use multiple accent colours in MVP.

---

### Semantic Colours

Use sparingly and quietly.

- **Success / positive:** Muted green
  - Example: `#5FAF7A`
- **Warning / attention:** Muted amber
  - Example: `#C9A24D`
- **Error:** Muted red
  - Example: `#C56B6B`

No bright reds, no aggressive greens.

---

## 4. Typography

### Primary Typeface

- **Inter**
  - Clean, neutral, excellent legibility
  - Use for all UI text by default

### Monospace (Optional, for stats/numbers)

- **IBM Plex Mono**
  - Use sparingly for:
    - Sets (weight × reps)
    - XP values
    - Numeric summaries

### Typographic Hierarchy

- Headings: Medium to semibold
- Body text: Regular
- Labels / metadata: Regular, smaller size, muted colour

Avoid heavy font weights and excessive contrast.

---

## 5. Layout & Spacing

### Layout Principles

- Content should breathe
- Avoid dense or cramped layouts
- Prefer vertical flow over complex grids

### Spacing

- Use a consistent spacing scale (e.g. 4 / 8 / 12 / 16 / 24 / 32)
- Larger spacing between sections than within sections
- Group related information visually

---

## 6. Components

### Buttons

- **Primary button:**
  - Filled with accent colour
  - Soft radius
  - Clear label (no icons-only primary actions)
- **Secondary button:**
  - Outline or low-contrast surface
- **Destructive actions:**
  - Muted red
  - Require confirmation

No gradient buttons.

---

### Cards / Surfaces

- Flat cards with subtle background contrast
- Soft corners
- No heavy shadows
- Elevation implied by contrast, not blur

---

### Inputs

- Dark background
- Clear focus state using accent colour
- Avoid heavy borders; use subtle lines or fills

---

### Tables / Lists (e.g. Sets)

- Row-based
- Clear alignment for numbers
- Use monospace for numeric columns where helpful
- Avoid gridlines unless necessary

---

## 7. Motion & Interaction

### Motion Principles

- Motion communicates **state**, not excitement.
- Use motion sparingly and consistently.

### Acceptable Motion

- Expand/collapse
- State transitions (e.g. saving a set)
- Subtle feedback on completion

### Avoid

- Celebratory animations
- Bouncing effects
- Excessive easing

If motion draws attention to itself, it’s too much.

---

## 8. Gamification Visual Treatment

Gamification elements should feel **earned and understated**.

- XP updates shown only at session end
- PR highlights are factual, not celebratory
- Levels are informational, not flashy

No:

- Badges
- Confetti
- Pop-up celebrations

---

## 9. Accessibility & Comfort

- Maintain sufficient contrast for text
- Avoid tiny touch targets
- Ensure forms are usable one-handed on mobile
- Dark UI should prioritise eye comfort during long sessions

---

## 10. Non-Goals (Explicit)

Momentum is **not**:

- A social app
- A motivational quote app
- A competitive leaderboard app
- A fitness influencer brand

The design should always favour clarity and longevity over novelty.

---

## 11. Future Considerations (Not MVP)

- Light mode (only if genuinely needed)
- Themes / accent colour customisation
- Visual distinction between training “chapters” or “seasons”

Do not design for these now, but do not block them either.
