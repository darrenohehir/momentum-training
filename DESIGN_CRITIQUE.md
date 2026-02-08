# Design Critique Report — Momentum

**Date:** January 28, 2025  
**Command:** `/critique`  
**Reference:** `.cursor/commands/critique.md`, `.cursor/skills/frontend-design/SKILL.md`  
**Scope:** Holistic design evaluation of the Momentum training app (Ionic Angular).

---

## Anti-Patterns Verdict

**Verdict: Partial pass — recognizable AI-era tells.**

If you showed this to someone and said "AI made this," they might believe you. The app has a clear design doc (DESIGN.md) and a stated direction ("instrument panel," calm, serious), but several choices match the frontend-design skill’s DON’Ts and common 2024–2025 AI output:

| Tell | Where it appears |
|------|-------------------|
| **Cyan-on-dark** | Primary accent `#41afec` on near-black. Skill: "DON'T: Use the AI color palette: cyan-on-dark, neon accents on dark backgrounds." DESIGN.md specifies a *restrained* blue `#4FA3D1`; implementation is brighter and more cyan. |
| **Hero metric layout** | Home: big number + small uppercase label (e.g. "7 days remaining", "110" / "XP", "1" / "LEVEL") in cards. Skill: "DON'T: Use the hero metric layout template—big number, small label, supporting stats." |
| **Identical card grid** | Insights: two same-sized cards (Last 4 weeks / Top weights) with label + value. Home: three status cards (momentum, empty momentum, XP) in the same structural pattern. Skill: "DON'T: Use identical card grids—same-sized cards with icon + heading + text, repeated endlessly." |
| **Thick colored border on one side** | Momentum card: `border-left: 3px solid var(--ion-color-primary)`. Skill: "DON'T: Use rounded elements with thick colored border on one side—a lazy accent." |
| **Monospace for "technical" vibe** | IBM Plex Mono for stats (XP, Level, set numbers, PRs). Skill: "DON'T: Use monospace typography as lazy shorthand for 'technical/developer' vibes." (DESIGN.md permits it for stats—so it’s intentional but still a tell.) |
| **Pure black/white** | Theme uses `#000000` and `#ffffff` for contrast colors. Skill and DESIGN.md: avoid pure black/white; always tint. |

**Not present (good):** No gradient text, no glassmorphism, no bounce easing, no decorative sparklines, no redundant header copy. Layout is purposeful; cards aren’t overused. So: not full "AI slop," but enough tells that the interface doesn’t yet feel distinctly *designed*.

---

## Overall Impression

**What works:** The app feels calm and focused. Information is grouped logically (Home → status + recent activity; History → filter + calendar + list). Primary actions (FAB, "Start Session," "See all") are easy to find. The tool is clearly a *tool*, not a game—aligned with DESIGN.md.

**What doesn’t:** The palette and card patterns feel generic. The accent reads as "default dark-mode app" rather than "instrument panel." Home and Insights lean on the same big-number + card recipe. Typography doesn’t match the design system (Inter is specified but not loaded). Some empty and error states are minimal and don’t guide next steps.

**Single biggest opportunity:** Align implementation with DESIGN.md and reduce AI tells in one pass: adopt the specified restrained accent (`#4FA3D1`), tint contrast colors, drop the momentum card’s left border, and differentiate the Home/Insights cards (hierarchy, layout, or content structure) so they don’t read as a template.

---

## What's Working

1. **Clear design philosophy and restraint** — DESIGN.md ("quiet instrument panel," no confetti, no guilt) is reflected in the UI: dark, flat, minimal. No celebratory motion or gamification clutter. That consistency makes the product feel intentional.

2. **Information architecture** — Tabs (Home, Exercises, History, Settings), FAB for quick add, and History’s segment (All / Sessions / Bodyweight / Food) + calendar + list make the structure easy to grasp. A new user can infer: "I log sessions and other things; I see them on History."

3. **Semantic color and hierarchy** — Accent is used for primary actions and key UI (tabs, links). Success/warning/danger are used sparingly (e.g. Momentum "Active," delete). Calendar markers (blue / brown / green) distinguish session vs bodyweight vs food without extra copy. Color supports meaning.

---

## Priority Issues

### 1. Accent and contrast don’t match DESIGN.md (and read as generic)

- **What:** Theme uses bright cyan-blue `#41afec` and pure `#000`/`#fff` for contrast. DESIGN.md specifies a restrained blue `#4FA3D1` and says to avoid pure black/white.
- **Why it matters:** The current accent is the classic "AI color palette" and weakens the intended "instrument panel" tone. Pure black/white contrast feels harsh and contradicts the doc.
- **Fix:** In `src/theme/variables.scss`, set primary to DESIGN.md’s `#4FA3D1` (and derived shade/tint). Replace contrast `#000`/`#fff` with tinted near-black/near-white that meet contrast ratios. Optionally reference the frontend-design color reference (e.g. OKLCH, light-dark) for future-proofing.
- **Command:** `/normalize` (theming / design tokens).

### 2. Hero metric + identical card pattern on Home and Insights

- **What:** Home leads with "X days remaining" and XP/Level in a big-number–small-label pattern inside cards. Insights uses two same-structure cards (label + value). Momentum card adds a thick left border.
- **Why it matters:** The layout reads as a standard dashboard template rather than a distinct "instrument panel." Visual hierarchy is flat; nothing feels intentionally composed.
- **Fix:** Differentiate cards by role: e.g. give the momentum block more weight (size or position) and make XP/Level clearly secondary (smaller, or different layout). Vary the Insights cards (one could be more narrative or visually different). Remove the momentum card’s `border-left` and use background or typography for emphasis instead.
- **Command:** `/normalize` (layout/patterns) then `/polish` (refinement). Optionally `/bolder` if you want a more distinctive composition.

### 3. Empty and error states don’t guide action

- **What:** Many empty states are just "No X yet" or "No exercises added yet" with an icon. Error states are "Unable to load this session" / "Unable to load session summary" with a single "Return" or "Go Back" button. No next step or recovery hint.
- **Why it matters:** New users and edge cases (e.g. load failure) get no direction. Skill: "DO: Design empty states that teach the interface, not just say 'nothing here'."
- **Fix:** Empty: add a short line and primary action where it fits (e.g. "Log your first session from Home" + link or "Add your first exercise" with a clear button). Error: add one line of cause or recovery (e.g. "Check your connection" or "Try again") and keep a single primary action.
- **Command:** `/polish` (states and copy). Optionally `/simplify` if any flows are confusing.

### 4. Typography: DESIGN.md says Inter, app doesn’t use it

- **What:** DESIGN.md specifies Inter as primary typeface; there is no font load in `index.html` and no global `font-family` for Inter. Body text uses system/default. IBM Plex Mono is used for stats as specified.
- **Why it matters:** Design system and implementation drift. If the intent is Inter for clarity and neutrality, the app doesn’t deliver it. If the intent is system font, the doc should be updated.
- **Fix:** Either (a) add Inter (e.g. Google Fonts or self-host) and set it globally per DESIGN.md, or (b) update DESIGN.md to "system UI" and keep current behavior. Align doc and code.
- **Command:** `/normalize` (typography tokens and implementation).

### 5. "See all" and a few controls lack explicit focus treatment

- **What:** Home’s "See all" is a raw `<button>` with no `:focus`/`:focus-visible` style. Some custom form inputs had focus restored in a prior fix; any remaining custom controls should be checked.
- **Why it matters:** Keyboard users need a visible focus indicator (WCAG 2.4.7). If global or Ionic styles suppress the default ring, these controls can have no visible focus.
- **Fix:** Add a visible focus style for `.see-all-link` (e.g. outline or box-shadow on `:focus-visible`). Prefer converting to `ion-button` with `fill="clear"` for consistency and built-in focus. Audit any other custom buttons/links.
- **Command:** `/harden` or `/polish` (accessibility and states).

---

## Minor Observations

- **Section titles:** "RECENT ACTIVITY," "Insights," "ACTIVITY" use different casing (sentence vs all-caps). Consider one convention (e.g. sentence case everywhere) for voice.
- **Loading copy:** "Loading..." and "Loading summary..." are fine; could be shortened to "Loading" for consistency.
- **Start Session:** Single primary CTA is clear. Quest list is optional and doesn’t compete. Radio list is a bit long; consider compact layout or grouping if more quests are added.
- **Calendar:** Non-interactive; markers are clear. Segment + calendar + list is a good progressive disclosure of filters.
- **Redundancy:** Momentum card shows "Momentum" label and status; toolbar already says "Momentum." Minor; acceptable for context.

---

## Questions to Consider

1. **What if the primary accent were the DESIGN.md blue (#4FA3D1) and all contrast colors were tinted?** Would that alone make the UI feel more "instrument panel" and less generic?
2. **Does Home need three separate cards?** Could momentum status and XP/Level live in one block with clear hierarchy so it doesn’t feel like a dashboard template?
3. **What would a confident, unmistakably human version of this look like?** e.g. One strong visual motif (e.g. a single recurring shape or treatment), clearer typographic rhythm, or one unexpected but purposeful break in the grid.
4. **Should empty states always point to the next action?** e.g. "No sessions yet. Start one from Home." to reduce ambiguity for new users.

---

## Summary Table

| Dimension | Verdict | Note |
|-----------|---------|------|
| AI Slop | Partial fail | Cyan-on-dark, hero metrics, identical cards, border accent, pure B/W |
| Visual hierarchy | OK | Primary actions clear; cards compete a bit |
| Information architecture | Good | Tabs, History filter, calendar, list are intuitive |
| Emotional resonance | OK | Calm and tool-like; accent pushes slightly generic |
| Discoverability & affordance | Good | FAB, segments, list detail; focus fixes helped |
| Composition & balance | OK | Consistent spacing; rhythm could be stronger |
| Typography | Drift | DESIGN.md says Inter; app uses system |
| Color with purpose | OK | Semantic use is good; palette and contrast need alignment |
| States & edge cases | Weak | Empty/error states rarely guide action |
| Microcopy & voice | OK | Clear and concise; empty/error could be more helpful |

---

*End of critique. Use `/normalize` for design-system alignment (theme, typography, card patterns), `/polish` for states and focus, and optionally `/bolder` for a more distinctive composition.*
