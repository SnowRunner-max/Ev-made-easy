# CLAUDE.md — Buellton EV Charging Cost Calculator

## Project Overview

A lightweight, mobile-first React SPA that shows Buellton, CA residents the real-time cost of charging an electric vehicle at home. Supports three PG&E rate plans with Central Coast Community Energy (3CE) generation: **EV2-A** (standard EV rate), **E-ELEC** (electric home rate), and **EV-B** (separately metered EV outlet). Users select their plan via a dropdown; all rate logic is data-driven from `ratePlans.json`.

**Notion Project:** https://www.notion.so/32ae8e8770bf81b59c72e509ed5ebdfc

## Tech Stack

- **Framework:** React 18+ (functional components, hooks only — no class components)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (utility-first, no custom CSS files unless absolutely necessary)
- **Testing:** Vitest + React Testing Library
- **Linting:** ESLint with recommended React config
- **No backend.** All logic is client-side. Rate data lives in JSON config files.
- **No routing library.** Single page app — one view.
- **No state management library.** React useState/useReducer is sufficient.

## Context Loading Strategy

This file is long by design — it's the single source of truth for rate data, development practices, and design rules. **Do not load the entire file on every task.** Load sections progressively based on the work at hand:

- **Always load:** Tech Stack, File Structure, Common Pitfalls
- **Load when working on the rate engine or cost calculator:** Rate Data Reference
- **Load when writing or fixing tests:** Testing Strategy (section 2)
- **Load when touching UI components or styling:** UI/UX Design System (section 5), Tailwind CSS Best Practices (section 4)
- **Load when modifying rate data:** Rate Data Reference + Common Pitfalls (especially #1–#8)

Every token loaded into context that isn't relevant to the current task depletes attention for the tokens that matter.

## File Structure

```
src/
  data/
    ratePlans.json          # Multi-plan config registry (TOU schedules, rates, seasons, holidays)
    rates.json              # Legacy: still referenced by Footer.jsx fallback; holidays now in ratePlans.json
    vehicles.json           # EV model database (battery sizes, names)
  engine/
    rateEngine.js           # Core rate lookup logic (pure functions, all accept planConfig)
    rateEngine.test.js      # Unit tests for rate engine
    costCalculator.js       # Charging cost calculation logic (accepts planConfig)
    costCalculator.test.js  # Unit tests for cost calculator
  components/
    PlanSelector.jsx        # Plan dropdown (EV2-A / E-ELEC / EV-B)
    PlanSelector.test.jsx
    RateDisplay.jsx         # Hero rate badge + countdown
    RateDisplay.test.jsx
    Timeline.jsx            # 24-hour rate visualization (variable segment count)
    Timeline.test.jsx
    Calculator.jsx          # EV selector + charge slider + cost output
    Calculator.test.jsx
    ChargingTip.jsx         # Contextual recommendation
    ChargingTip.test.jsx
    Footer.jsx              # Rate explanation footnote
  hooks/
    useCurrentRate.js       # Hook: returns current rate + next change (accepts planConfig)
    useCountdown.js         # Hook: countdown timer to target time
  App.jsx                   # Plan state, planConfig derivation, wires PlanSelector + children
  App.test.jsx
  index.css                 # Tailwind directives only
  main.jsx                  # Entry point
public/
  index.html
```

## Rate Data Reference

All rate data lives in `src/data/ratePlans.json`. The three supported plans share the same 3CE generation provider (3Cchoice) but have different TOU windows, season definitions, and delivery rates. All combine PG&E delivery + 3CE generation charges.

### EV2-A — Standard EV Rate

**TOU windows** (every day, all year, including weekends and holidays):

|Period   |Hours                                    |
|---------|-----------------------------------------|
|Peak     |4:00 PM – 9:00 PM                        |
|Part-Peak|3:00 PM – 4:00 PM AND 9:00 PM – 12:00 AM |
|Off-Peak |12:00 AM – 3:00 PM                       |

**Critical:** Part-peak has TWO windows (3–4 PM and 9 PM–12 AM). This is easy to get wrong.

**Seasons:** Summer = June–September (months 6–9), Winter = October–May

**Combined All-In Rates (3CE gen + PG&E delivery):**

|Period   |Summer     |Winter     |
|---------|-----------|-----------|
|Peak     |$0.52620   |$0.39966   |
|Part-Peak|$0.41615   |$0.38308   |
|Off-Peak |$0.21454   |$0.21461   |

**Base Services Charge:** $0.79343/day (Income Tier 3). Show in footnote only, never in per-kWh display.

**Rate component detail (EV2-A):**

|Component ($/kWh)              |Peak    |Part-Peak|Off-Peak|
|-------------------------------|--------|---------|--------|
|Total Bundled Rate (Summer)    |$0.53809|$0.42760 |$0.22558|
|Total Bundled Rate (Winter)    |$0.41099|$0.39428 |$0.22558|
|Delivery Only (Summer)         |$0.34979|$0.28401 |$0.12313|
|Delivery Only (Winter)         |$0.27956|$0.27534 |$0.13012|
|3CE Generation (Summer)        |$0.17641|$0.13214 |$0.09141|
|3CE Generation (Winter)        |$0.12010|$0.10774 |$0.08449|

**Additional per-kWh adjustments for CCA customers:**
- PCIA (2021 vintage for Buellton): $0.05264/kWh
- Franchise Fee Surcharge: ~$0.00048/kWh

**Cross-validation against Nov 2025 bill (winter rates):**
- Bill showed: Peak $0.48575, Part-Peak $0.46905, Off-Peak $0.30036 (PG&E-side before generation credit)
- 3CE charges separately: Peak $0.14920, Part-Peak $0.13753, Off-Peak $0.11560

---

### E-ELEC — Electric Home Rate

**TOU windows:** Identical to EV2-A (Peak 4–9 PM, Part-Peak 3–4 PM & 9 PM–midnight, Off-Peak all other)

**Seasons:** Same as EV2-A (Summer = June–September, Winter = October–May)

**Combined All-In Rates:**

|Period   |Summer     |Winter     |
|---------|-----------|-----------|
|Peak     |$0.53950   |$0.30961   |
|Part-Peak|$0.37861   |$0.28772   |
|Off-Peak |$0.32238   |$0.27399   |

*(PG&E E-ELEC delivery + 3CE 3Cchoice generation)*

**Base Services Charge:** $0.79343/day. Show in footnote only.

---

### EV-B — Separately Metered EV Rate

**Requires a separately metered EV outlet** — must be noted in UI.

**TOU windows differ by day type:**

*Weekdays (Mon–Fri, non-holidays):*

|Period   |Hours                              |
|---------|-----------------------------------|
|Off-Peak |12:00 AM – 7:00 AM                 |
|Part-Peak|7:00 AM – 2:00 PM AND 9:00 PM – 11:00 PM|
|Peak     |2:00 PM – 9:00 PM                  |
|Off-Peak |11:00 PM – 12:00 AM                |

*Weekends and PG&E holidays:*

|Period  |Hours              |
|--------|-------------------|
|Off-Peak|12:00 AM – 3:00 PM |
|Peak    |3:00 PM – 7:00 PM  |
|Off-Peak|7:00 PM – 12:00 AM |

*(No part-peak on weekends/holidays)*

**Seasons:** Summer = **May–October** (months 5–10), Winter = November–April — **different from EV2-A/E-ELEC**

**Combined All-In Rates:**

|Period   |Summer     |Winter     |
|---------|-----------|-----------|
|Peak     |$0.60833   |$0.42774   |
|Part-Peak|$0.36565   |$0.29598   |
|Off-Peak |$0.25357   |$0.22425   |

**Daily Meter Charge:** $0.04928/day (not a base services charge — it is a separate meter fee). Show in footer.

---

### PG&E Holidays (2026)

Holidays affect EV-B TOU schedules (weekend/holiday schedule applies). They do **not** change EV2-A or E-ELEC periods.

```
2026-01-01  New Year's Day
2026-02-16  Presidents' Day (3rd Monday of February)
2026-05-25  Memorial Day (last Monday of May)
2026-07-03  Independence Day (observed — Jul 4 is Saturday)
2026-09-07  Labor Day (1st Monday of September)
2026-11-11  Veterans Day
2026-11-26  Thanksgiving (4th Thursday of November)
2026-12-25  Christmas Day
```

### EV Model Database

|Model                     |Usable Battery (kWh)|Approx Range (mi)|
|--------------------------|--------------------|-----------------|
|Tesla Model 3 (Standard)  |60                  |272              |
|Tesla Model Y (Long Range)|75                  |310              |
|Chevy Bolt EV/EUV         |65                  |259              |
|Chevy Equinox EV          |85                  |319              |
|Rivian R1T (Large Pack)   |135                 |352              |

Default Level 2 charging speed assumption: **7.7 kW** (240V / 32A typical home EVSE).

## Development Principles

### 1. Test-Driven Development (TDD) — Red-Green-Refactor

**Every feature starts with a failing test.** Follow this cycle strictly:

1. **Red:** Write a test that describes the expected behavior. Run it. Watch it fail.
1. **Green:** Write the minimum code to make the test pass. No more.
1. **Refactor:** Clean up the code while keeping tests green. Remove duplication, improve naming, extract helpers.

**Never write production code without a failing test first.**

### 2. Testing Strategy

#### Unit Tests (engine/ directory) — Test First, Always

The rate engine and cost calculator are **pure functions** with no UI dependencies. These are the easiest and most important code to test.

```javascript
// rateEngine.test.js — WRITE THESE FIRST
// All engine functions accept planConfig as a second argument.
// Import ratePlans.json and pass the relevant plan config to each call.

import { describe, it, expect } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import { getCurrentPeriod, getSeason, getRate } from './rateEngine';

const ev2aConfig = ratePlans.plans['ev2a'];

describe('getCurrentPeriod — EV2-A', () => {
  it('returns offPeak for 2:00 AM', () => {
    const date = new Date('2026-03-15T02:00:00-07:00'); // PDT
    expect(getCurrentPeriod(date, ev2aConfig)).toBe('offPeak');
  });

  it('returns partPeak for 3:00 PM (first window)', () => {
    const date = new Date('2026-03-15T15:00:00-07:00');
    expect(getCurrentPeriod(date, ev2aConfig)).toBe('partPeak');
  });

  it('returns peak for 4:00 PM', () => {
    const date = new Date('2026-03-15T16:00:00-07:00');
    expect(getCurrentPeriod(date, ev2aConfig)).toBe('peak');
  });

  it('returns partPeak for 9:00 PM (second window)', () => {
    const date = new Date('2026-03-15T21:00:00-07:00');
    expect(getCurrentPeriod(date, ev2aConfig)).toBe('partPeak');
  });
});

describe('getSeason', () => {
  // Season months are plan-specific: EV2-A summer = Jun–Sep, EV-B summer = May–Oct
  it('returns winter for January (EV2-A)', () => {
    expect(getSeason(new Date('2026-01-15'), ev2aConfig)).toBe('winter');
  });

  it('returns summer for June 1 (EV2-A)', () => {
    expect(getSeason(new Date('2026-06-01'), ev2aConfig)).toBe('summer');
  });
});
```

#### Component Tests (components/ directory) — Test Behavior, Not Implementation

Use React Testing Library. Test what the user sees and does, not internal state.

```javascript
// RateDisplay.test.jsx
// All components require a planConfig prop — import ratePlans.json in every test file.
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import RateDisplay from './RateDisplay';

const ev2aConfig = ratePlans.plans['ev2a'];

describe('RateDisplay', () => {
  it('displays the current rate formatted as currency', () => {
    vi.setSystemTime(new Date('2026-03-15T02:00:00-07:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByText(/\$0\.\d{2}/)).toBeInTheDocument();
    expect(screen.getByText(/off-peak/i)).toBeInTheDocument();
  });

  it('shows green styling during off-peak', () => {
    vi.setSystemTime(new Date('2026-03-15T02:00:00-07:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByTestId('rate-badge').className).toMatch(/emerald/);
  });

  it('shows red styling during peak', () => {
    vi.setSystemTime(new Date('2026-07-15T17:00:00-07:00'));
    render(<RateDisplay planConfig={ev2aConfig} />);
    expect(screen.getByTestId('rate-badge').className).toMatch(/red/);
  });
});
```

#### Testing Best Practices

- **Test file naming:** `[module].test.js` or `[Component].test.jsx` — co-located with source
- **Use `describe` blocks** to group related tests by function or behavior
- **One assertion per test** when possible. If a test fails, you should know exactly what broke.
- **Use descriptive test names** that read as specifications:
  - Good: `'returns partPeak for 9:00 PM (second window)'`
  - Bad: `'test partPeak'`
- **Test edge cases explicitly:** midnight boundaries, season transitions, DST changes, Feb 29
- **Mock time, not logic:** Use `vi.setSystemTime()` to control the clock. Never mock the rate engine functions themselves — test them directly.
- **No snapshot tests** for this project. They're brittle and don't test behavior.
- **Test the rate engine exhaustively.** This is the core of the app. Every boundary condition must have a test. If a rate is wrong, the entire app is wrong.

### 3. React Best Practices

#### Component Design

- **Functional components only.** No class components.
- **Custom hooks** for shared logic (e.g., `useCurrentRate()`, `useCountdown(targetTime)`).
- **Props down, events up.** Components receive data via props, communicate changes via callbacks.
- **Keep components small.** If a component exceeds ~100 lines, extract sub-components.
- **Use `data-testid` attributes** for elements that tests need to find but that don't have semantic selectors.

#### State Management

```javascript
// Good: derived state from a single source of truth
const [currentTime, setCurrentTime] = useState(new Date());
const rate = getRate(currentTime);        // derived
const period = getCurrentPeriod(currentTime); // derived
const season = getSeason(currentTime);       // derived

// Bad: storing derived values in separate state
const [rate, setRate] = useState(null);
const [period, setPeriod] = useState(null); // Don't do this
```

#### Time Handling

- **All time logic must use Pacific Time** (`America/Los_Angeles`)
- Use `Intl.DateTimeFormat` or a helper to extract the hour in Pacific Time from a Date object
- **Never assume the user's browser timezone is Pacific.** Always convert explicitly.
- Set up a `useEffect` with `setInterval` to update the current time every 60 seconds (or every second during the final 5 minutes before a rate change)

```javascript
// Helper to get Pacific Time hour from any Date
function getPacificHour(date) {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
    }).format(date)
  );
}
```

### 4. Tailwind CSS Best Practices

- **Use Tailwind utilities directly in JSX.** No `@apply` unless extracting a truly reusable component class.
- **Mobile-first responsive design.** Write base styles for mobile, then add `sm:`, `md:`, `lg:` prefixes for larger screens.
- **Use the brand color palette** via CSS custom properties and Tailwind's `bg-[var(--color)]` syntax, or extend `tailwind.config.js` with the brand tokens defined in section 5 below.
- **Avoid arbitrary hex values** (`bg-[#1a2b3c]`) — always reference a named CSS variable or Tailwind config token. If a color isn't in the palette, it shouldn't be in the app.
- **Use `max-w-[1120px]`** on the main layout container to match the two-panel design width.
- **Dark mode is not required for v1** but avoid hardcoding white backgrounds — use `bg-[var(--off-white)]` or the Tailwind equivalent so dark mode can be added later.

### 5. UI/UX Design System

This section defines the visual design language for the entire app. The design is modeled after NerdWallet's mortgage calculator pattern — a two-panel layout with inputs on the left and a persistent, live-updating results panel on the right.

**Visual reference:** See `/docs/ev-made-easy-redesign.html` for the interactive prototype that demonstrates every element described below.

#### 5.1 Color Palette — Brand Tokens

All colors are defined as CSS custom properties in `index.css` (or a `theme.css` file imported by `index.css`). Every color used in the app must come from this palette. No rogue hex values.

```css
:root {
  /* ── Brand palette ── */
  --color-ink:             #050517;   /* Ink Black — results panel bg, headings, nav, footer */
  --color-ink-light:       #12122a;   /* Card surfaces on dark backgrounds */
  --color-ink-surface:     #1a1a34;   /* Elevated surfaces on dark backgrounds */
  --color-paprika:         #CF5C36;   /* Spicy Paprika — primary CTA, active states, focus rings, links */
  --color-paprika-hover:   #B84E2D;   /* Paprika darkened for hover states */
  --color-paprika-glow:    rgba(207,92,54,0.15); /* Focus ring glow */
  --color-apricot:         #EFC88B;   /* Apricot Cream — secondary accent, labels on dark bg */
  --color-custard:         #F4E3B2;   /* Vanilla Custard — table hover, info callouts */
  --color-grey:            #D3D5D7;   /* Alabaster Grey — borders, disabled states, muted text on dark */
  --color-grey-light:      #EAEBED;   /* Input borders, dividers */
  --color-off-white:       #FAFAF8;   /* Page background */
  --color-white:           #FFFFFF;   /* Input panel background, card surfaces */

  /* ── Semantic text ── */
  --text-primary:          #1a1a2e;
  --text-secondary:        #6B6B7B;
  --text-muted:            #9B9BAB;

  /* ── TOU period colors (used in timeline, badges, tips) ── */
  --color-green:           #2D8F5C;   /* Off-Peak */
  --color-green-bg:        #E8F5EE;
  --color-green-border:    #B8DFC8;
  --color-amber:           #B87B2B;   /* Part-Peak */
  --color-amber-bg:        #FDF3E0;
  --color-amber-border:    #E8CFA0;
  --color-red:             #C0392B;   /* Peak */
  --color-red-bg:          #FDECEB;
  --color-red-border:      #E8B4AF;
}
```

**Tailwind config extension** — add brand colors to `tailwind.config.js` so they can be used as `bg-ink`, `text-paprika`, `border-grey-light`, etc.:

```javascript
// tailwind.config.js — colors section
colors: {
  ink:       { DEFAULT: '#050517', light: '#12122a', surface: '#1a1a34' },
  paprika:   { DEFAULT: '#CF5C36', hover: '#B84E2D' },
  apricot:   '#EFC88B',
  custard:   '#F4E3B2',
  grey:      { DEFAULT: '#D3D5D7', light: '#EAEBED' },
  'off-white': '#FAFAF8',
}
```

#### 5.2 Typography

- **Body font:** `'DM Sans'` — clean, modern sans-serif. Used for all UI text, labels, form elements, and body copy.
- **Display font:** `'DM Serif Display'` — warm serif with character. Used **only** for hero numbers (the rate `$0.23/kWh`, the cost estimate `$8.12`) and the app title in the top bar.
- **Never mix serif into body text, labels, or buttons.** Serif is reserved for big, glanceable numbers.

Load both fonts via Google Fonts in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap" rel="stylesheet">
```

Tailwind config:
```javascript
fontFamily: {
  sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
  serif: ['"DM Serif Display"', 'Georgia', 'serif'],
}
```

Usage pattern:
```jsx
{/* Hero number — serif */}
<span className="font-serif text-5xl tracking-tight">$0.23</span>

{/* Everything else — sans (default, no class needed) */}
<label className="text-sm font-semibold">Current charge</label>
```

#### 5.3 Layout — Two-Panel (NerdWallet Pattern)

The app uses a **split-panel layout** inspired by NerdWallet's mortgage calculator:

```
┌──────────────────────────────────────────────────────────┐
│  Top Bar (sticky, dark: --color-ink)                     │
├──────────────────────────────────┬───────────────────────┤
│  LEFT PANEL (inputs)             │  RIGHT PANEL (results)│
│  Background: --color-white       │  Background: --color- │
│  Scrolls normally                │  ink                  │
│                                  │  position: sticky     │
│  • Plan selector                 │  top: topbar height   │
│  • Provider toggle               │                       │
│  • Vehicle selector              │  • Rate badge (period)│
│  • Charge slider                 │  • Hero rate number   │
│  • Season toggle                 │  • Countdown          │
│  • Timeline (24h bar)            │  • Donut chart        │
│  • Charging tip                  │  • Cost cards (80/100)│
│                                  │  • Rate breakdown     │
├──────────────────────────────────┴───────────────────────┤
│  Footer (collapsible, full-width)                        │
└──────────────────────────────────────────────────────────┘
```

**Layout rules:**
- Desktop: `grid-template-columns: 1fr 380px` with `max-width: 1120px` centered.
- The right panel is `position: sticky; top: [topbar height]; height: calc(100vh - [topbar height]); overflow-y: auto;` — it stays visible as the user scrolls the left panel.
- **Mobile (< 860px):** Stack vertically — inputs first, results below. Results panel becomes static (not sticky). The grid collapses to a single column.
- The left panel has a white background. The right panel has an Ink Black background with white/grey/apricot text.
- A `1px solid var(--color-grey-light)` border separates the two panels on desktop.

#### 5.4 Component-to-Panel Mapping

Every existing React component belongs to exactly one panel. This mapping must be preserved during the redesign:

| Component          | Panel          | Notes                                               |
|--------------------|----------------|-----------------------------------------------------|
| `PlanSelector`     | Left (inputs)  | `<select>` with optgroups. Add `.form-hint` text below explaining the selected plan. |
| `ProviderSelector` | Left (inputs)  | Render as a toggle-button group, not a `<select>`. Two buttons: "PG&E Bundled" / "3CE (CCA)". |
| Vehicle select     | Left (inputs)  | Part of `Calculator.jsx`. The vehicle `<select>` and custom kWh input. |
| Charge slider      | Left (inputs)  | Part of `Calculator.jsx`. The charge % slider with large serif display of current value. |
| Season toggle      | Left (inputs)  | **New control.** Toggle-button group for Summer/Winter preview. Default to current season. |
| `Timeline`         | Left (inputs)  | The 24-hour segmented bar with current-time marker. Include legend below. |
| `ChargingTip`      | Left (inputs)  | Color-coded tip box at bottom of left panel. |
| `RateDisplay`      | Right (results)| Rate badge (period indicator with pulse dot), hero rate number, season label, countdown. |
| Donut chart        | Right (results)| **New component.** Shows delivery/generation/CCA proportions for the current rate. |
| Cost cards         | Right (results)| From `Calculator.jsx` — the "Charge to 80%" and "Charge to 100%" output cards. |
| Rate breakdown     | Right (results)| **New component.** Collapsible table showing per-period delivery/generation/total rates. Hidden by default (progressive disclosure). |
| `Footer`           | Below both     | Full-width, collapsible. Same content as current Footer. |

#### 5.5 Four UX Principles

These are not suggestions — they are **rules** enforced during development and code review, just like "always pass planConfig" or "test edge cases explicitly."

**Principle 1: Instant feedback.** Every input change (dropdown, slider, toggle) must immediately update the results panel. No "Calculate" button. No loading spinners for local computation. `useState` + derived values, not async flows.

**Principle 2: Progressive disclosure.** The default view shows only what a first-time visitor needs: vehicle, charge level, plan, and the resulting cost. Advanced details (rate component breakdown, per-period tables, BSC amounts) live behind a clearly labeled toggle — always accessible, never shown by default. Test: a user who has never seen a PG&E bill should understand the default view.

**Principle 3: One hero number.** The current per-kWh rate (e.g., `$0.23/kWh`) is the single most visually prominent element on the page — `font-serif text-5xl` on the dark results panel. Everything else (donut chart, cost cards, timeline) exists to explain and contextualize that one number. Do not compete with it visually.

**Principle 4: Contextual education.** Every input field has a brief, plain-English `.form-hint` below it. Not a tooltip, not a modal — inline text visible at a glance. Examples:
- Plan selector: "For customers with an EV, battery storage, or heat pump. Whole-house metering."
- Provider toggle: "Most Buellton residents are served by 3CE for generation."
- Charge slider: No hint needed — the large percentage display is self-explanatory.

#### 5.6 Component Styling Patterns

**Form inputs (left panel):**
- Labels: `text-sm font-semibold text-[var(--text-primary)]`
- Selects: Full-width, `border-[1.5px] border-grey-light rounded-lg`, focus state uses `ring-2 ring-paprika/15 border-paprika`
- Hints: `text-xs text-[var(--text-muted)]` below the input

**Toggle buttons (provider, season):**
- A flex row of buttons inside a `border rounded-lg overflow-hidden` container
- Active button: `bg-paprika text-white font-semibold`
- Inactive button: `bg-white text-[var(--text-secondary)]`, hover `bg-off-white`

**Section dividers (left panel):**
- `<hr>` with `border-grey-light my-6`
- Optional section labels: `text-[11px] uppercase tracking-widest text-paprika font-semibold`

**Results panel cards (right panel):**
- Background: `bg-ink-light`
- Border: `border border-white/[0.06] rounded-xl`
- Header: `text-xs uppercase tracking-wide text-grey`
- Value: `font-serif text-2xl` (white)
- Detail: `text-xs text-[var(--text-muted)]`

**Rate badge (right panel):**
- Pill shape: `rounded-full px-3 py-1`
- Contains a small pulsing dot + period label
- Off-peak: green dot + green text on green/20 bg
- Part-peak: apricot dot + apricot text on apricot/20 bg
- Peak: red dot + red text on red/25 bg

**Donut chart (right panel):**
- CSS `conic-gradient` on a `border-radius: 50%` div — no charting library needed.
- Three segments: Paprika (delivery), Apricot (PG&E generation or 3CE generation depending on provider), Custard (CCA generation when provider=3CE).
- Inner cutout via a `::after` pseudo-element with `bg-ink`.
- Legend to the right of the donut with colored dots + labels + values.

**Charging tip (left panel):**
- `rounded-xl border px-4 py-3 text-sm`
- Off-peak: `bg-green-bg border-green-border text-[#1a5e3a]`
- Part-peak: `bg-amber-bg border-amber-border text-[#7a5614]`
- Peak: `bg-red-bg border-red-border text-[#8a2720]`

#### 5.7 Mobile Adaptations

- **Breakpoint:** `860px` (use `@media (max-width: 860px)` or Tailwind `max-md:`)
- Below breakpoint: single-column stack. Left panel content first, results panel below.
- Results panel becomes `position: static` (not sticky), full-width, same dark background.
- Hero rate font size reduces from `text-5xl` to `text-4xl`.
- Donut chart + legend stack vertically (centered).
- Future enhancement: mobile sticky footer bar showing just the hero rate, expandable to full results. Not required for v1.

### 6. Code Quality Rules

- **No `any` types** if using TypeScript (currently JS, but keep code type-safe in spirit)
- **No `console.log`** in production code. Use it only for debugging, then remove.
- **No commented-out code.** Git tracks history.
- **Prefer `const` over `let`.** Never use `var`.
- **Use early returns** to reduce nesting:

```javascript
// Good
function getRate(date) {
  const hour = getPacificHour(date);
  const season = getSeason(date);

  if (hour >= 16 && hour < 21) return rates[season].peak;
  if (hour === 15 || (hour >= 21 && hour < 24)) return rates[season].partPeak;
  return rates[season].offPeak;
}

// Bad
function getRate(date) {
  const hour = getPacificHour(date);
  const season = getSeason(date);
  let rate;
  if (hour >= 16 && hour < 21) {
    rate = rates[season].peak;
  } else if (hour === 15 || (hour >= 21 && hour < 24)) {
    rate = rates[season].partPeak;
  } else {
    rate = rates[season].offPeak;
  }
  return rate;
}
```

- **TOU boundaries come from `planConfig.touSchedules`, not hardcoded constants.** The engine is data-driven: `getScheduleForDay(date, planConfig)` returns the correct block array for the plan and day type. Don't reintroduce hardcoded hour constants — read from the schedule blocks instead.

### 7. Git Practices

- **Commit after each green test.** Small, frequent commits.
- **Commit message format:** `feat: add rate engine getCurrentPeriod function`
  - Prefixes: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`
- **One feature per branch** if working on multiple stories
- **Never commit failing tests** to main

### 8. Claude Code Guidance

#### Prefer General Tools

Claude Code works best with bash and file editing — general tools it already knows well. Do not add custom tool wrappers, orchestration scripts, or scaffolding that pre-decides what Claude should do. Trust Claude to compose `read file → run tests → edit → run tests` into the right sequence for each task. This project's stack (Vite, Vitest, React, Tailwind) is deliberately mainstream — no exotic tooling.

#### Filter Output, Don't Flood Context

When running tests or builds, pipe output through filters so only relevant information enters the context window:

```bash
# Good: show only failures and summary
npm test -- --run 2>&1 | tail -30

# Good: show only failing test names
npm test -- --run 2>&1 | grep -E "FAIL|✗|Error"

# Bad: dump entire verbose test output into context
npm test -- --run --reporter=verbose
```

The same applies to build output, linting, and any command that produces large output. Filter to what matters for the current task.

#### Action Boundaries

**Always pause and confirm before:**
- Modifying `ratePlans.json` — rate data changes must be validated against tariff PDFs before committing. A wrong rate silently breaks every cost calculation.
- Changing season month ranges — these are plan-specific and easy to cross-contaminate (EV-B uses May–Oct, others use Jun–Sep).
- Touching the `pgeDelivery` / `pgeGeneration` / `cce` schema structure — the v2.0 three-field separation was a deliberate bug-prevention decision. Collapsing or renaming these fields reintroduces the class of bugs v2.0 was designed to eliminate.
- Deleting or renaming test files — tests are the project's safety net.

**Proceed without asking:**
- Adding or editing test files (more tests = better)
- Refactoring component internals without changing props or external behavior
- Updating README, comments, or CLAUDE.md documentation
- Adding new CSS custom properties to the palette (as long as they follow the naming convention in section 5.1)
- Creating new components in `src/components/` that follow existing patterns

#### Maintenance: Prune This File Over Time

CLAUDE.md should **shrink** as Claude gets smarter, not grow. After completing a batch of stories, revisit and ask: *what can I stop telling Claude?* If Claude consistently follows a rule without being reminded, that rule is dead weight consuming context tokens. Remove it. The guidance that remains should be the stuff that's genuinely non-obvious — rate data quirks, plan-specific gotchas, and project-specific design decisions that can't be inferred from the code alone.

## Build Order (Recommended)

Follow this sequence. Each step builds on the previous.

1. **Project scaffolding** — Vite + React + Tailwind + Vitest setup
1. **Rate JSON config** — `ratePlans.json` (multi-plan registry with TOU schedules, rates, seasons, holidays) and `vehicles.json`
1. **Rate engine** — TDD the core functions (`getCurrentPeriod`, `getSeason`, `getRate`, `getNextRateChange`, `getDaySchedule`)
1. **Bill validation** — Write tests that reproduce the Nov 2025 bill charges to validate rates
1. **Live rate display** — `RateDisplay` component with color-coded badge
1. **Countdown timer** — `useCountdown` hook + display
1. **24-hour timeline** — `Timeline` component with current time marker
1. **Calculator: EV selector** — Vehicle picker component
1. **Calculator: Cost output** — Charge slider + multi-period cost calculation
1. **Charging tips** — Contextual recommendations
1. **Footer & explanation** — Rate footnote with sources
1. **SEO metadata** — Title, description, OG tags
1. **Two-panel layout** — Implement the NerdWallet split-panel layout (section 5.3), moving existing components into left/right panels
1. **Donut chart** — Rate component breakdown visualization (section 5.6)
1. **Rate breakdown table** — Collapsible per-period detail (section 5.6)
1. **Brand theming** — Apply full color palette, typography, and styling patterns (sections 5.1–5.2, 5.6)
1. **Final polish** — Responsive tweaks, mobile stacking, accessibility audit, performance check

## Running the Project

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests (watch mode)
npm test

# Run tests once (CI)
npm run test:ci

# Build for production
npm run build

# Preview production build
npm run preview
```

## Common Pitfalls

1. **Always pass `planConfig` to engine functions.** `getCurrentPeriod`, `getSeason`, `getRate`, `getNextRateChange`, `getDaySchedule`, `calcChargeSummary` — all require `planConfig` as a parameter. Calling them without it will throw.
1. **Part-peak has TWO windows on EV2-A and E-ELEC.** 3–4 PM and 9 PM–midnight. EV-B weekday also has two part-peak windows (7 AM–2 PM and 9–11 PM). EV-B weekend has **no** part-peak at all — guard against `planConfig.rates[season].partPeak` being absent.
1. **EV-B has weekday/weekend TOU distinction.** EV2-A and E-ELEC rates are the same every day; EV-B is not. `getScheduleForDay` handles this via `planConfig.weekdayVariant`. Holidays use the weekend schedule for EV-B.
1. **EV-B summer season starts in May, not June.** EV-B summer = months 5–10 (May–October). EV2-A/E-ELEC summer = months 6–9 (June–September). Season logic is data-driven — read from `planConfig.seasons.summer.months`, never hardcode.
1. **Browser timezone ≠ Pacific Time.** Always convert. A user visiting from the East Coast should still see Pacific Time rates.
1. **Multi-hour charging spans rate periods.** A charge starting at 2 PM (EV2-A) spans off-peak (2–3 PM), part-peak (3–4 PM), peak (4–9 PM), and potentially part-peak again. The cost calculator walks through each period.
1. **Rates are for CCA (3CE) customers, not PG&E bundled customers.** We use PG&E delivery + 3CE generation. The bundled totals on the tariff sheet are for non-CCA customers.
1. **The PCIA vintage matters.** Buellton's 3CE enrollment vintage is 2021, so the PCIA is $0.05264/kWh. Different vintages have different PCIA rates.
1. **Charging to 80% vs 100%.** Show both options. Many EV owners charge to 80% for battery longevity.
1. **Colors must come from the palette.** Never introduce a hex value that isn't defined in the CSS custom properties (section 5.1). If you need a new shade, add it to the palette first with a semantic name.
1. **Serif font is only for hero numbers.** `DM Serif Display` is used exclusively for large, glanceable numeric values (rate per kWh, cost estimates). All other text — labels, hints, buttons, body copy — uses `DM Sans`. Mixing serif into body text breaks the visual hierarchy.
1. **Results panel is always dark.** The right panel always uses `--color-ink` background with light text. Never render white-background cards or light-themed components inside it. Use `--color-ink-light` for elevated card surfaces within the dark panel.