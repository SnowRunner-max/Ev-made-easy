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

**Known issues introduced or exposed:**
- No committed tariff PDFs for Liberty or TDPUD — `_metadata.sources` has URLs only. CLAUDE.md Action Boundary requires committed source documents. Flag in next PR.
- `.gitignore` changes commit ~76MB of GeoJSON territory files (`data-sources/territory/raw/`) plus source document directories (`pge_source/`, `sce_source/`, `cca_source/`). Repo size concern.
- `TDPUD-FIXED` plans have `_metadata.effectiveDate: "2026"` — imprecise, should be a full date.
- `supportsProviderToggle` condition uses `|| serviceArea.ccas.length > 0` which is redundant with `providerOptions.length > 1`. Pre-existing single-option toggle bug not introduced here.
- `DonutChart.jsx` fallback `|| 'PG&E'` should be `|| 'Utility'` (inconsistent with App.jsx CostFacts which uses 'Utility').

**Why:** First expansion to non-IOU (investor-owned utility) territories. TDPUD is a public utility district; Liberty is a small IOU not covered by PG&E/SCE territory.
**How to apply:** When reviewing future territory expansions, check for committed source PDFs, precise effectiveDate, and the bundled-rate modeling pattern.
