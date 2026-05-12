---
name: project-tahoe-utilities
description: Tahoe utility expansion (TDPUD + Liberty) — rate data structure decisions, modeling conventions, and known issues
metadata:
  type: project
---

Branch `tahoe-utility-coverage` adds TDPUD (Truckee) and Liberty Utilities (CalPeco / South Lake Tahoe) as the third and fourth supported utilities.

**Rate data modeling decisions:**
- TDPUD rates are bundled (no delivery/generation split). Stored as `delivery=0`, `generation=rate`, `totalBundled=rate` so Schema v3.0 `delivery+generation=totalBundled` invariant holds.
- TDPUD TOU plans have midPeak=offPeak rates (0.1567 primary, 0.1782 secondary) — this is intentional per tariff, not a bug.
- TDPUD year-round season: `seasons.summer.startMonth=1, endMonth=12` — all months resolve to 'summer'. Engine handles this correctly.
- Liberty D-1 TOU EV winter off-peak generation is 0 (not free — delivery charge still applies). Summer off-peak generation is also 0.
- Liberty D-1 (non-TOU) has a `.tiers` metadata field with baseline/excess/nonPermanent rates, but only the permanent baseline rate (0.29866) is shown in the footer — this is intentional per the description field.

**Known issues — resolved (as of 2026-05-12 re-review):**
- `liberty_source/` and `tdpud_source/` directories now committed with tariff PDFs and HTML source pages. Issue #1 FIXED.
- `DonutChart.jsx` fallback is now `|| 'Utility'`. Issue #3 FIXED.
- `supportsProviderToggle` simplified to `!!planConfig.touPeriods && providerOptions.length > 1`. Issue #4 FIXED.
- TDPUD `effectiveDate` is now `"2026-01-01"` (full ISO date). Liberty is `"2026-03-01"`. Issue #5 FIXED.
- `getNextRateChange` tests for Liberty D-1 TOU EV Sep 30/Oct 1 season transition added to `rateEngine.test.js`. Issue #6 FIXED.
- `calcChargeSummary` tests for TDPUD midPeak and Liberty midPeak period crossings added to `costCalculator.test.js`. Issue #7 FIXED.
- Liberty D-1 excess/non-permanent comment added to `TieredRateTable.jsx:40-41`. Minor issue FIXED.
- `periodColors.js` midPeak entry has explanatory comment noting it intentionally shares amber palette with partPeak. Minor issue FIXED.
- TDPUD midPeak===offPeak note is in `_metadata.notes[2]` of `tdpudRatePlans.json`. Minor issue FIXED.
- `getEffectiveConfig` fallback in `App.jsx` now derives utility name from `serviceAreaConfig.utility` — no hardcoded 'PG&E'. Minor issue FIXED.
- All 387 tests pass.

**Remaining open item:**
- `.gitignore` changes commit ~76MB of GeoJSON territory files — repo size concern. Issue #2 NOT FIXED (acknowledged, deferred).

**Why:** First expansion to non-IOU (investor-owned utility) territories. TDPUD is a public utility district; Liberty is a small IOU not covered by PG&E/SCE territory.
**How to apply:** When reviewing future territory expansions, check for committed source PDFs, precise effectiveDate, and the bundled-rate modeling pattern.
