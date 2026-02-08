# Frontend Quality Audit Report

**Date:** January 28, 2025  
**Scope:** Momentum training app (Ionic Angular)  
**Reference:** `.cursor/commands/audit.md`, `.cursor/skills/frontend-design/SKILL.md`  
**Context:** Styling and UX assessed against Ionic best practices and design-system guidelines.

---

## Anti-Patterns Verdict

**Verdict: Partial pass with notable AI-slop tells.**

The app has a clear design direction (DESIGN.md: "instrument panel", dark, calm) and avoids the worst generic patterns. Some choices still align with common AI-generated aesthetics:

- **Cyan accent on dark background** — Primary accent `#41afec` on near-black is explicitly called out in the frontend-design skill as "the AI color palette: cyan-on-dark, purple-to-blue gradients, neon accents on dark backgrounds." The app uses this exact pattern.
- **Hero metric layout** — Home page uses the template: big numbers (XP, Level), small uppercase labels, in cards. Matches "big number, small label, supporting stats."
- **Identical card grid** — Insights: two same-sized insight cards (Last 4 weeks / Top weights) with label + value; History and Home repeat similar status-card patterns. Skill: "Don't use identical card grids—same-sized cards with icon + heading + text, repeated endlessly."
- **Monospace for "technical" vibe** — IBM Plex Mono is used for stats (session weight/reps, PRs, XP). Skill: "Don't use monospace typography as lazy shorthand for 'technical/developer' vibes."
- **Border accent on one side** — Home momentum card uses `border-left: 3px solid var(--ion-color-primary)`. Skill: "Don't use rounded elements with thick colored border on one side—a lazy accent."
- **Pure black/white in theme** — `variables.scss` uses `#000000` and `#ffffff` for contrast colors. Skill and DESIGN.md: avoid pure black/white; always tint.

**Not present (good):** No gradient text, no glassmorphism, no bounce easing, no sparkline decoration, no redundant copy in headers. Layout is purposeful and not over-cardified. So: not fully "AI slop," but several recognizable tells that could be refined for a more distinctive look.

---

## Executive Summary

| Metric | Count |
|--------|--------|
| **Critical** | 2 |
| **High** | 5 |
| **Medium** | 8 |
| **Low** | 6 |
| **Total** | 21 |

**Top issues:**  
1. **Focus indicators removed** on custom form inputs (Food/Bodyweight) without a sufficient replacement — fails WCAG 2.4.7 (Focus Visible).  
2. **Icon-only buttons lack accessible names** across toolbars and session UI — fails WCAG 4.1.2 (Name, Role, Value).  
3. **Theme uses pure #000 / #fff** for contrast and cyan-on-dark accent — conflicts with DESIGN.md and frontend-design skill.  
4. **Session set inputs** have no programmatic labels (only column headers and placeholders) — screen reader users may not associate labels with inputs.  
5. **Touch targets** on some controls (e.g. segment, calendar) are at or below 36px — below the common 44px recommendation for primary actions.

**Overall:** The codebase uses Ionic components and CSS variables consistently, has clear information hierarchy, and avoids many anti-patterns. The main gaps are accessibility (focus and names for icon buttons, form labels), theme alignment with DESIGN.md (pure black/white, cyan-on-dark), and a few responsive/touch and design-tell refinements.

**Recommended next steps:**  
1. Restore or replace focus indicators on custom inputs and ensure all icon-only buttons have `aria-label`.  
2. Align theme with DESIGN.md (tinted contrast colors; consider accent shift away from cyan-on-dark).  
3. Add programmatic labels for session set inputs and review touch target sizes.  
4. Optionally reduce AI-slop tells (hero metrics, monospace stats, single-side border accent).

---

## Detailed Findings by Severity

### Critical Issues

#### C1. Focus indicator removed on custom form inputs (Food & Bodyweight)

- **Location:** `src/app/pages/food/food.page.scss` (lines 43–45), `src/app/pages/bodyweight/bodyweight.page.scss` (lines 43–45).
- **Severity:** Critical  
- **Category:** Accessibility  
- **Description:** Custom `.datetime-input`, `.text-input`, and `.note-input` use `&:focus { outline: none; }` and only change `border-color`. The default focus ring is removed and no visible focus alternative (e.g. outline-offset + outline, or box-shadow) is applied.
- **Impact:** Keyboard users cannot see which form control is focused; fails WCAG 2.4.7 (Focus Visible, Level AA).
- **WCAG:** 2.4.7 Focus Visible.
- **Recommendation:** Either keep the default outline or remove it only when providing a visible replacement (e.g. `outline: 2px solid var(--ion-color-primary); outline-offset: 2px;` or equivalent box-shadow). Prefer `:focus-visible` so mouse users don’t get a persistent ring.
- **Suggested command:** `/harden` or manual a11y pass.

#### C2. Icon-only buttons missing accessible names

- **Location:** Multiple: `food.page.html` (back, add, delete), `bodyweight.page.html` (back, add, delete), `session.page.html` (Done has aria-label; close, copy, speedometer, trash, add, Finish do not), `exercise-picker` (close, add), `session-summary.page.html`, `tabs.page.html` (FAB), `settings.page.html`, `history-detail.page.html`.
- **Severity:** Critical  
- **Category:** Accessibility  
- **Description:** Many `ion-button` elements contain only an `ion-icon` (e.g. `slot="icon-only"`) with no `aria-label` or visible text. Screen readers announce them as "button" with no name.
- **Impact:** Fails WCAG 4.1.2 (Name, Role, Value). Users of assistive tech cannot identify the action (e.g. Back, Add, Delete, Close, Copy, Trash, Finish session, Quick add).
- **WCAG:** 4.1.2 Name, Role, Value.
- **Recommendation:** Add `aria-label` to every icon-only button (e.g. "Back", "Add entry", "Delete entry", "Remove set", "Finish session", "Quick add"). Ensure FAB has a descriptive label (e.g. "Quick add – session, bodyweight, food").
- **Suggested command:** `/harden` (a11y).

---

### High-Severity Issues

#### H1. Pure black and white in theme contrast colors

- **Location:** `src/theme/variables.scss` — `--ion-color-*-contrast: #000000` and `--ion-color-tertiary-contrast: #ffffff`.
- **Severity:** High  
- **Category:** Theming  
- **Description:** Ionic contrast colors for primary, secondary, success, warning, danger, dark, medium use pure `#000000`; tertiary uses `#ffffff`. DESIGN.md states "Avoid pure black" and "Avoid pure white (#FFFFFF) except in rare emphasis cases"; frontend-design skill says "Don't use pure black (#000) or pure white (#fff)—always tint."
- **Impact:** Inconsistent with design system and skill; can look harsh and reduce perceived quality. Ionic uses these for text on colored buttons/chips.
- **Recommendation:** Replace with tinted near-black and near-white (e.g. from DESIGN.md or a tint of the accent) and verify contrast ratios (4.5:1 for normal text, 3:1 for large).
- **Suggested command:** `/normalize` (theming).

#### H2. Cyan-on-dark as primary accent (AI palette tell)

- **Location:** `src/theme/variables.scss` — `$accent-primary: #41afec`, used as `--ion-color-primary` on dark background.
- **Severity:** High  
- **Category:** Theming / Anti-pattern  
- **Description:** Bright cyan-blue on near-black matches the "AI color palette" in the frontend-design skill. DESIGN.md does not mandate cyan.
- **Impact:** Interface reads as generic; reduces distinctiveness. No functional break.
- **Recommendation:** Consider a different accent (e.g. warmer or more muted) that still meets contrast and fits "instrument panel" tone. Optional for MVP.
- **Suggested command:** `/normalize` (design tokens).

#### H3. Session set inputs lack programmatic labels

- **Location:** `src/app/pages/session/session.page.html` — strength set rows (weight, reps, RPE inputs) and cardio set rows (duration, distance, incline). Column headers exist in the DOM (e.g. "Weight (kg)", "Reps", "Duration") but inputs use only `placeholder` and have no `aria-label` or `aria-labelledby`.
- **Severity:** High  
- **Category:** Accessibility  
- **Description:** Screen readers may not associate the visible column headers with each input in the row, especially when navigating by field.
- **Impact:** Form controls may be announced without context (e.g. "edit text —" instead of "Weight kg, set 1"). WCAG 1.3.1 (Info and Relationships) and 3.3.2 (Labels or Instructions).
- **Recommendation:** Add `aria-label` to each `ion-input` including set index and meaning (e.g. "Set 1 weight, kg") or use `aria-labelledby` pointing to the header cells if structure allows.
- **Suggested command:** `/harden` (forms).

#### H4. Touch targets at or below 36px for primary controls

- **Location:** `src/app/pages/insights/insights.page.scss` — `.calendar-cell` and `ion-segment-button` use `min-height: 36px`. Session page has some 44px targets (set rows, add-set button) but segment and calendar are smaller.
- **Severity:** High  
- **Category:** Responsive / Accessibility  
- **Description:** iOS HIG and many guidelines recommend at least 44×44pt for primary touch targets. Calendar cells and segment buttons are 36px.
- **Impact:** Harder to tap for users with motor or visual impairment; more mis-taps on small screens.
- **Recommendation:** Increase interactive control height to at least 44px where possible. Calendar cells are display-only (no click); segment buttons and any other tappable controls should meet 44px. Use padding rather than shrinking text.
- **Suggested command:** Manual responsive/a11y pass or `/normalize` (spacing/sizing).

#### H5. "See all" link is a raw `<button>` with no visible focus style

- **Location:** `src/app/pages/home/home.page.html` — `<button class="see-all-link">`. `home.page.scss` styles color and hover but no `:focus` or `:focus-visible`.
- **Severity:** High  
- **Category:** Accessibility  
- **Description:** Native button retains browser default focus ring, but global or Ionic overrides may remove it. No explicit focus style is defined.
- **Impact:** If focus ring is suppressed elsewhere, keyboard users lose focus visibility (WCAG 2.4.7).
- **Recommendation:** Add a visible focus style for `.see-all-link` (e.g. outline or box-shadow on `:focus-visible`). Prefer making it an `ion-button` with `fill="clear"` for consistency and built-in focus handling.
- **Suggested command:** `/harden`.

---

### Medium-Severity Issues

#### M1. Box shadow with hard-coded black in session card

- **Location:** `src/app/pages/session/session.page.scss` line 100 — `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3)`.
- **Severity:** Medium  
- **Category:** Theming  
- **Description:** Shadow uses raw black instead of a theme variable. Fine for dark theme but breaks consistency if theme or mode changes.
- **Impact:** Minor; dark theme only. Align with design tokens for future-proofing.
- **Recommendation:** Use a variable (e.g. `var(--ion-color-step-950)` or a dedicated shadow color) or keep but document as intentional.
- **Suggested command:** `/normalize` (tokens).

#### M2. Heading hierarchy inconsistent across pages

- **Location:** Multiple pages. Only `session-summary.page.html` uses an explicit `<h1>` ("Session Complete"). Other pages use `ion-title` and `<h2>` (e.g. Home "Recent activity", Insights "Insights", "Activity"). Some empty states use `<h2>` for messages.
- **Severity:** Medium  
- **Category:** Accessibility (Semantic HTML)  
- **Description:** Single logical main heading per page is best for outline and screen readers. `ion-title` may not expose a heading level. Multiple `<h2>` sections without an `<h1>` can confuse outline navigation.
- **Impact:** Users navigating by headings may not get a clear "main title" per page. WCAG 1.3.1 (structure).
- **Recommendation:** Ensure one logical `<h1>` per route (can be visually styled like a subtitle). Use `ion-title` with `role="heading"` and `aria-level="1"` if it represents the page title, or add a visually hidden `<h1>`.
- **Suggested command:** `/harden` (structure).

#### M3. Hero metric and card grid patterns (design tell)

- **Location:** `src/app/pages/home/home.page.html` + `.xp-card`, `.stat-value`, `.stat-label`; `src/app/pages/insights/insights.page.html` insight cards.
- **Severity:** Medium  
- **Category:** Anti-pattern (Design)  
- **Description:** Big number + small label in cards; two same-structure insight cards (label + value). Matches frontend-design skill "hero metric" and "identical card grids."
- **Impact:** Visual only; interface remains usable but reads as templated.
- **Recommendation:** Differentiate cards (e.g. size, layout, or hierarchy) and consider varying the stat presentation so it doesn’t match the generic pattern.
- **Suggested command:** Design pass; optional.

#### M4. Monospace used for stats (design tell)

- **Location:** `session.page.scss`, `session-summary.page.scss`, `home.page.scss`, `history-detail.page.scss`, `insights.page.scss` — `font-family: 'IBM Plex Mono', monospace` for numbers/stats.
- **Severity:** Medium  
- **Category:** Anti-pattern (Design)  
- **Description:** Skill: "Don't use monospace typography as lazy shorthand for 'technical/developer' vibes."
- **Impact:** Purely aesthetic; may reinforce generic "dashboard" feel.
- **Recommendation:** Consider a proportional numeral style or a single distinctive sans for body and stats.
- **Suggested command:** Design pass; optional.

#### M5. Border-left accent on momentum card

- **Location:** `src/app/pages/home/home.page.scss` — `.momentum-card { border-left: 3px solid var(--ion-color-primary); }`.
- **Severity:** Medium  
- **Category:** Anti-pattern (Design)  
- **Description:** Skill: "Don't use rounded elements with thick colored border on one side—a lazy accent."
- **Impact:** Visual only.
- **Recommendation:** Replace with a more intentional emphasis (e.g. background tint, icon, or different card treatment).
- **Suggested command:** Design pass; optional.

#### M6. Transition uses generic `ease`

- **Location:** `src/app/pages/food/food.page.scss` line 111, `src/app/pages/bodyweight/bodyweight.page.scss` line 116 — `transition: background-color 0.15s ease`.
- **Severity:** Medium  
- **Category:** Performance / Motion  
- **Description:** Skill prefers "exponential easing (ease-out-quart/quint/expo) for natural deceleration." Generic `ease` is acceptable but not aligned with skill.
- **Impact:** Minor; short duration. Slight motion feel difference.
- **Recommendation:** Use `ease-out` or a custom cubic-bezier for consistency with motion guidelines.
- **Suggested command:** `/normalize` (motion).

#### M7. No reduced-motion preference handling

- **Location:** Global; no `prefers-reduced-motion` in SCSS.
- **Severity:** Medium  
- **Category:** Accessibility  
- **Description:** Animations (skeleton, transitions, Ionic component motion) are not explicitly reduced when the user sets `prefers-reduced-motion: reduce`.
- **Impact:** Users sensitive to motion may be uncomfortable. WCAG 2.3.3 (Animation from Interactions) is AAA; good practice to respect.
- **Recommendation:** Add `@media (prefers-reduced-motion: reduce) { ... }` to disable or shorten non-essential animations and transitions.
- **Suggested command:** `/harden` (a11y).

#### M8. Calendar legend and markers have only `title` / no accessible description

- **Location:** `src/app/pages/insights/insights.page.html` — calendar legend uses `aria-hidden="true"` on decorative glyphs (good). Calendar markers use `title="Session"` etc. on `<span>` elements; no role or aria-label for the grid.
- **Severity:** Medium  
- **Category:** Accessibility  
- **Description:** Calendar is largely visual. Markers are decorative; `title` is not reliably exposed to screen readers. No live region or summary for "how many sessions this month."
- **Impact:** Screen reader users get limited benefit from the calendar. Acceptable if the list below is the primary way to access data.
- **Recommendation:** Ensure the calendar has an accessible name (e.g. `aria-label` on the grid or section) and consider a short screen-reader-only summary (e.g. "Calendar: 3 sessions in January") if valuable.
- **Suggested command:** `/harden` (a11y).

---

### Low-Severity Issues

#### L1. Ionic contrast tokens not used for custom form backgrounds

- **Location:** Food and Bodyweight pages use `var(--ion-color-step-100)` for input background; DESIGN.md and theme use step scales. Minor inconsistency: some places use `--ion-item-background`.
- **Severity:** Low  
- **Category:** Theming  
- **Description:** Custom inputs use step-100 directly; list items use `--ion-item-background`. Both are valid; slight token mix.
- **Impact:** Minimal; visual consistency is fine.
- **Recommendation:** Prefer a single surface token (e.g. `--ion-item-background` or a dedicated input token) for form fields.
- **Suggested command:** `/normalize` (tokens).

#### L2. Empty state icons could have `aria-hidden="true"`

- **Location:** Various empty states (e.g. food, bodyweight, exercises) use `ion-icon` for illustration. Not all are marked `aria-hidden="true"`.
- **Severity:** Low  
- **Category:** Accessibility  
- **Description:** Decorative icons may be announced by some screen readers. Marking them `aria-hidden="true"` avoids redundant announcements.
- **Impact:** Minor; screen readers often skip decorative images when alt is empty, but explicit is better.
- **Recommendation:** Add `aria-hidden="true"` to purely decorative icons in empty states.
- **Suggested command:** `/harden`.

#### L3. No explicit list semantics for PR list and day groups

- **Location:** `insights.page.html` — `.pr-list` and `.day-group` use `<div>` with `*ngFor`. Not announced as lists.
- **Severity:** Low  
- **Category:** Accessibility  
- **Description:** Using `<ul>`/`<li>` or `role="list"`/`role="listitem"` would expose list structure.
- **Impact:** Minor; content is still readable.
- **Recommendation:** Use list markup or roles where content is a list.
- **Suggested command:** `/harden`.

#### L4. Segment has no accessible name for the control

- **Location:** `src/app/pages/insights/insights.page.html` — `<ion-segment [value]="historyFilter" ...>` with segment buttons "All", "Sessions", etc. No `aria-label` on the segment.
- **Severity:** Low  
- **Category:** Accessibility  
- **Description:** A label like "Filter history by type" helps screen reader users understand the control.
- **Impact:** Minor; button labels are visible.
- **Recommendation:** Add `aria-label="Filter history by type"` (or similar) to `ion-segment`.
- **Suggested command:** `/harden`.

#### L5. FAB has no aria-label

- **Location:** `src/app/tabs/tabs.page.html` — `<ion-fab-button (click)="openQuickAdd()">` with only an icon.
- **Severity:** Low (noted in C2 as part of icon-only buttons; listed again for FAB specifically)  
- **Category:** Accessibility  
- **Description:** FAB is a primary entry point; without a name, screen reader users may not know it opens "Quick add" or similar.
- **Impact:** Same as C2 for this control.
- **Recommendation:** Add `aria-label="Quick add"` or "Open quick add menu" to `ion-fab-button`.
- **Suggested command:** `/harden`.

#### L6. Session summary "Session Complete" is the only explicit h1

- **Location:** Only `session-summary.page.html` has `<h1>`. Other pages use `ion-title` + `<h2>`.
- **Severity:** Low  
- **Category:** Accessibility  
- **Description:** Inconsistent use of h1; other pages might benefit from a single logical h1 for outline.
- **Impact:** Tied to M2; low on its own if outline is acceptable.
- **Recommendation:** Align with M2 heading strategy.
- **Suggested command:** `/harden`.

---

## Patterns & Systemic Issues

1. **Icon-only buttons without accessible names** — Widespread (toolbars, session actions, FAB, modals). Fix by adding `aria-label` to every icon-only `ion-button` and the FAB.
2. **Focus visibility** — Custom form inputs (Food, Bodyweight) remove default focus without a replacement. Establish a global or component-level focus-visible style and avoid `outline: none` without a substitute.
3. **Theme tokens** — Most colors correctly use `variables.scss` and `--ion-*`; exceptions: one `rgba(0,0,0,0.3)` shadow and use of pure #000/#fff for contrast. Align contrast colors with DESIGN.md and use variables for shadows.
4. **Touch targets** — Session page correctly uses 44px for set rows and add-set; Insights segment and calendar use 36px. Consider a shared minimum (e.g. 44px) for primary interactive elements.
5. **Design tokens in SCSS** — Components generally use `var(--ion-color-*)` and `var(--ion-color-step-*)`; a few `rgba(..., 0.x)` use `--ion-color-*-rgb` correctly. Good baseline; tighten in session shadow and contrast colors.

---

## Positive Findings

- **Ionic usage:** Consistent use of `ion-content`, `ion-toolbar`, `ion-card`, `ion-list`, `ion-item`, `ion-button`, and CSS variables. Matches Ionic’s theming model (global variables in `variables.scss`, component overrides in `global.scss`).
- **Design system:** DESIGN.md is followed for backgrounds, surfaces, and text colors (off-white, muted grey). Theme file is well-commented and structured.
- **Form structure (Food/Bodyweight):** Native `<label>` associated with inputs; good structure for create/edit forms. Exercise picker uses `label` and `labelPlacement="stacked"` on ion-input.
- **ARIA where present:** Session "Done" and Insights prev/next month buttons have `aria-label`; calendar legend decorative glyphs use `aria-hidden="true"`. History item glyphs use `aria-hidden="true"`.
- **Touch targets (session):** Set row min-heights (52px, 44px) and add-set/add-exercise buttons meet or exceed 44px. Session is the most interaction-heavy page and is largely compliant.
- **No heavy anti-patterns:** No gradient text, glassmorphism, bounce easing, or decorative sparklines. Motion is minimal (short transitions). Layout is purposeful.
- **Empty states:** Clear copy ("No exercises yet", "No completed sessions yet", etc.) and consistent use of icon + message.
- **Responsive padding:** Use of `48px` vertical padding and consistent horizontal padding (e.g. 24px) for content; avoids hard-coded narrow widths that would break layout.

---

## Recommendations by Priority

### 1. Immediate (critical)

- Restore or replace focus indicators on Food and Bodyweight custom inputs (focus-visible outline or box-shadow). Do not use `outline: none` without an alternative.
- Add `aria-label` to all icon-only buttons and the FAB so every interactive control has an accessible name.

### 2. Short-term (high)

- Replace pure #000/#fff in `variables.scss` with tinted contrast colors that meet contrast ratios and align with DESIGN.md.
- Add programmatic labels (aria-label or aria-labelledby) to session set inputs (weight, reps, RPE, duration, distance, incline) including set index.
- Increase touch target height for Insights segment (and any other sub-44px primary controls) to at least 44px.
- Add explicit focus style for Home "See all" button (or convert to ion-button).

### 3. Medium-term (quality)

- Consider accent color change away from cyan-on-dark for a more distinctive look (optional).
- Unify heading strategy: one logical h1 per page; ensure ion-title or main heading is exposed to assistive tech.
- Add `prefers-reduced-motion` handling for transitions and animations.
- Use theme variable or documented token for session card box-shadow instead of raw black.

### 4. Long-term (nice-to-have)

- Reduce AI-slop tells: vary hero stats and card layouts; reconsider monospace for stats; replace border-left accent with a more intentional treatment.
- Add accessible name/description for calendar (section or grid) and optional summary for screen reader users.
- Use list semantics (or roles) for PR list and day groups on Insights.
- Add `aria-label` to History filter segment and `aria-hidden="true"` to decorative empty-state icons.

---

## Suggested Commands for Fixes

| Command / action | Use for |
|------------------|--------|
| **/harden** | Accessibility: focus indicators, aria-labels on icon buttons and FAB, session set input labels, "See all" focus, heading hierarchy, reduced motion, segment/calendar/list semantics, decorative icons. |
| **/normalize** | Theming: contrast colors (#000/#fff → tinted), optional accent change, session card shadow variable, form input token consistency, motion easing. Touch: increase segment/control min-height to 44px where appropriate. |
| **Design pass** (manual or design-focused command) | Hero metric and card grid variation, monospace vs proportional for stats, border-left accent replacement. |
| **No single command** | Programmatic labels for session set inputs and FAB/icon buttons are best done in the same pass as /harden. |

---

*End of audit. Do not fix in this step; use the suggested commands and priorities to address issues.*
