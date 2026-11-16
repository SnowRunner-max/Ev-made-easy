# Cottonwood Design System (reconstructed)

> **Status:** Reconstructed from the shipped implementation (`src/apple.css`,
> `src/application.css`, `src/constants/periodColors.js`, `AGENTS.md` UI rules).
> The original Cottonwood document was lost; names and values below describe what the
> code does today, not a recovered original. Where this file and the CSS disagree, the
> CSS wins until this file is updated.

## 1. Principles

1. **Calm and Apple-like.** Quiet neutral surfaces, generous radius, one accent (blue). No gradients on content, no decorative emoji, no nested cards, no stat-card rows.
2. **One hero number.** The selected session's total energy cost is the largest element on screen. The smaller per-kWh figure is the *session average*, labelled as such, never the live rate.
3. **Color means price.** Green, amber, red are reserved for TOU period severity (and the "good" status). They are never decoration.
4. **Honest estimates.** Anything assumed (PCIA vintage, baseline, efficiency, reference rates) is stated near the number or in the pricing dialog. This is an incremental grid-import estimate, not a bill.
5. **Both appearances, every state.** Light and dark are first-class, including dialogs, pickers, hover, focus, pressed and disabled.

## 2. Layout

Two views, switched from the sidebar (desktop) or floating bottom nav (mobile). Session inputs persist across switches.

| View | Content |
| --- | --- |
| **Charging** | Charge estimate card + charging-window chart card. Side by side above 1100px (`1fr / 1.05fr`, 22px gap); stacked below. Max content width 1020px. |
| **Setup** | Location, Rate Plan, Generation Provider, Generation Tier, Vehicle, Charger Speed as directly editable rows (2 columns on desktop, 1 on mobile, max width 780px). Account assumptions and efficiency live in an expandable "account details" section. |

- **Header** always shows the active location, plan and provider (right-aligned on desktop; wraps beneath the brand on mobile, never hidden).
- **Shell:** 88px sidebar (translucent, blurred) on desktop; ≤650px it becomes a floating pill nav at the bottom with safe-area inset.
- **Breakpoints:** 1100px (stack cards), 900px, 650px (mobile shell), 370px (small phones).
- Provider buttons appear only when the plan supports CCA generation; the tier selector only when the selected CCA has multiple tiers.

## 3. Color tokens

Defined as CSS custom properties in `src/apple.css`; dark values are applied by the `.dark` class on the app root.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#f5f5f7` | `#18181a` | Page background |
| `--surface` | `#ffffff` | `#242426` | Cards, dialogs, active nav |
| `--text` | `#1d1d1f` | `#f5f5f7` | Primary text |
| `--secondary` | `#636368` | `#b3b3ba` | Labels, captions |
| `--line` | `#e5e5ea` | `#3b3b40` | Hairlines, card borders |
| `--control` | `#efeff3` | `#333337` | Inputs, segmented tracks, ring track |
| `--blue` | `#0071e3` | `#64acff` | Primary action, selection, window handles |
| `--green` | `#247b40` | `#79da94` | Good/off-peak text, recommendation |
| `--green-fill` | `#34c759` | `#30d158` | Charge ring |
| `--danger` | `#c9372c` | `#ff6b5e` | Errors and invalid input |
| `--sidebar` | `rgba(233,235,240,.8)` | `rgba(32,32,35,.9)` | Translucent nav |

Tailwind utilities read the same tokens through `@theme` in `src/index.css` (`bg-control`, `bg-surface`, `text-fg`, `text-muted`, `text-accent`, `text-danger`, `border-line`), so both styling paths stay in sync. Arbitrary values such as `text-[var(--secondary)]` are also fine.

Rules: use these variables; do not introduce one-off hex values. New tokens follow the same short-name pattern and must define a dark value.

### TOU period colors

Single source of truth: `src/constants/periodColors.js` (labels, colors, ordering, including utility-specific periods such as Super Off-Peak and Mid-Peak).

| Period | Meaning | Chart/legend color (`timelineColor`) |
| --- | --- | --- |
| Off-peak | Green | `#2D8F5C` |
| Part-peak / Mid-peak | Amber | `#B87B2B` |
| Peak | Red | `#C0392B` |
| Super off-peak | Blue | `#3B82F6` |

The charging-window chart and legend set these inline from `PERIOD_COLORS`. The brighter `.hour-bar` / `.bar` fills in the CSS (`#34c759`, `#ffb340`, `#ff7b52`) are only fallbacks. Bars outside the selected window render at 40% opacity.

Never encode period by color alone: pair with the label text or legend.

## 4. Typography

System font stack for everything, including hero numbers: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`. Root size 17px. Use `font-variant-numeric: tabular-nums` for all prices and times.

| Role | Size | Weight | Tracking |
| --- | --- | --- | --- |
| Hero price | 4rem (3.75 mobile, 3.4 ≤370px) | 600 | −4px |
| Page title (Setup) | 2rem (1.65 mobile) | 650 | −1.8px |
| Card title | 1.2–1.3rem | 620 | −.5px |
| Body / control | 1rem | 550 for controls | — |
| Secondary / label | .82–.88rem | 400 | — |
| Caption / axis | .76rem | 400 | — |

## 5. Shape, depth, spacing

- **Radius:** cards 24px (20px for setting lists, 21px mobile), controls 12–14px, segmented buttons 10px, pills/primary buttons 22–25px, dialogs 22–27px, icon tiles 11px.
- **Borders:** 1px `--line` hairlines between rows and on cards; no heavy outlines.
- **Shadow:** minimal. Active nav item and pressed segment get a faint shadow; dialogs use a large soft shadow with a blurred backdrop.
- **Translucency:** sidebar, mobile nav and dialog backdrop use blur; disable under `prefers-reduced-transparency`.
- **Spacing:** 4px base. Card padding 24px (14–22px mobile); gaps 18–26px between cards.

## 6. Components

- **Card:** `--surface`, 1px `--line`, 24px radius. No cards inside cards.
- **Estimate card:** status badge (green dot + current-period text, describes the *current clock*, independent of the selected window), hero price, session-average per-kWh note, charge ring/target control, charge stats row.
- **Setting row:** 38px colored icon tile (blue / green / indigo / orange) + small secondary label + borderless control. Rows separated by hairlines inside one card.
- **Segmented control:** `--control` track, selected segment = `--surface` with faint shadow; used for provider choice and target mode. `aria-pressed` drives state. Min height 44px.
- **Charging-window chart:** 96 quarter-hour bars on a 24h axis, colored by period; start/end handles in `--blue` with 44px hit area; selected window shaded with blue top/bottom rules; legend shows each period's rate. Result line is green when the window is complete, amber (`#9c5c00` / `#ffd088`) when incomplete.
- **Primary button:** `--blue`, white text, 22–25px radius, min height 44–48px. One per view.
- **Pricing dialog:** native `<dialog>`; integrated session components, pricing assumptions, exclusions and sources. Re-themes Tailwind utility classes inside (`.pricing-details`) to the shared tokens.
- **Utility picker:** shown for ZIPs spanning utilities; buttons use `--surface` on a `--control` panel, hover `--bg`.
- **Tooltip:** nav labels only, hidden on hover-less devices.

## 7. Accessibility and motion

- Minimum 44px touch targets (40px permitted only in dense mobile Setup rows).
- Focus ring: 3px `#007aff90`, 4px offset, on all interactive elements.
- Honor `prefers-reduced-motion` (no transitions), `prefers-reduced-transparency` (opaque chrome), and `forced-colors` (bars/handles/ring get system-color borders).
- Text contrast: `--secondary` on `--surface` ≥ 4.5:1 in both appearances; verify when adding tokens.
- Charts must remain readable without color: period names appear in the legend and hour detail.

## 8. Known gaps

- Dead code still on the legacy palette: `Calculator`, `RateDisplay`, `Timeline` and `ChargingTip` are not mounted anywhere, and `PERIOD_COLORS` keeps `tip`, `pillClass` and `pillDotColor` only for them. Remove them together.
- CSS `.hour-bar`, `.bar` and legend fills duplicate period colors instead of reading `periodColors.js`.
- Chart colors are the same in light and dark; verify contrast of amber and green bars against the dark surface.
- No current light/dark screenshots are committed beyond `charging-window-mobile.jpg`.
