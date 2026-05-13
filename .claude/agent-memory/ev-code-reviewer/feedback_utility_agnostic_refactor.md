---
name: feedback_utility_agnostic_refactor
description: Recurring patterns and known issues from the utility-agnostic refactor (codex/plan-codebase-refactor branch)
metadata:
  type: feedback
---

## Two Divergent Utility Registries

`scripts/utility-config.js` uses `bundledProvider` (10 fields); `src/data/utilityRegistry.js` uses `bundledProviderId` (7 fields). These are intentionally separate (scripts vs runtime) but field naming diverges. Adding any future utility (SDG&E) requires editing both with different field names.

**Why:** Scripts registry needs build-time keys (`verifiedKey`, `generatedKey`, `statsKey`, `territoryPathKey`, `ratePlansPathKey`, `territoryNote`) that don't belong in the runtime registry. The split is deliberate but the naming inconsistency is a debt item.

**How to apply:** When a contributor asks about adding SDG&E, flag that both files need updating with different field name conventions. Suggest canonicalizing `bundledProviderId` vs `bundledProvider` first.

## Overlay Pipeline Still Hardcodes PGE/SCE for Candidate Objects

`overlay-territory.js:371-372` writes flat `pgeAreaPct`/`sceAreaPct` fields. `auto-review-candidates.js:20-21` reads them via `if (utilityLabel === 'PG&E')` guards. `auto-review-candidates.js:168` emits `utilityPct: { pge: ..., sce: ... }`. Any SDG&E candidate will get 0 for these fields — auto-suggest will never recommend SDG&E. Must be replaced with `utilityAreaPct: { [utilityId]: pct }` dynamic object.

**How to apply:** Flag this as blocking before any SDG&E territory data is run through the pipeline.

## RATE_PLAN_REGISTRY is Now Derived, Not Hardcoded

`src/data/ratePlanRegistry.js` derives the registry from `serviceAreas.json` + `utilityRegistry` instead of a 17-entry hardcoded map. Adding a new service area to `serviceAreas.json` now automatically populates the registry. `loadRateRegistryIds()` in territory-utils adapted to read `serviceAreas.json` keys instead of regex-parsing the derived JS file.

## effectivePlanConfig Emits Duplicate Display Provider Fields

`effectivePlanConfig.js` emits both `_displayProvider` and `displayProvider` with identical values in both tiered and TOU paths. One is dead code. Check which is consumed before removing.

## CostFacts.jsx Generation Heading Asymmetry

Line 49 uses `{deliveryLabel}` (dynamic). Line 61 hardcodes `"Generation"` as the section heading. Line 66 uses `{generationLabel}` for the sub-row. Fix: change line 61 to `{generationLabel}`.

## DonutChart PGE Delivery Fallback

`DonutChart.jsx:18`: `const deliveryLabel = planConfig.deliveryLabel ?? 'PG&E Delivery'`. This fallback is dead code (buildEffectivePlanConfig always sets deliveryLabel) and utility-specific. Change to `'Utility Delivery'`.

## DonutChart Rogue Hex Values

Lines 40 and 48 use `stroke="#CF5C36"` and `stroke="#EFC88B"`. Should use CSS custom properties: `--color-paprika` and `--color-apricot`. Use inline style `style={{ stroke: 'var(--color-paprika)' }}` for SVG.

## Footer Triple-Fallback Chain

`Footer.jsx:86-87` has `globalMetadata?.[effectiveDateKey] ?? globalMetadata?.pgeEffectiveDate ?? globalMetadata?.sceEffectiveDate`. The fallback tails mask misconfigured `metadataKeys` in the utility registry. Remove fallback tails.

## Missing Component Test Files

`CostFacts.jsx` and `VehicleInputsCompact.jsx` shipped without co-located `.test.jsx` files. CLAUDE.md requires co-location for every component. Every other component (11 total) has a test file.

## locationResolver Test Gaps

`locationResolver.test.js` is missing: `not_ca` error (non-CA state ZIP), `invalid_input` error (unrecognized string), city lookup yielding multi-utility ZIP. The fixture already has ZIP `10001` (NY state) — the not_ca test case is pre-wired.

## territory-utils Fixtures Use Label Fallback, Not utilityId Primary Path

SDG&E fixture in `territory-utils.test.js` exercises label-based fallback only. No fixture tests `utilityId`-first lookup (the new primary path for all real service area objects).
