---
name: project_sdge_support
description: SDG&E third-utility expansion findings, schema decisions, and known issues discovered during code review of sdge-support branch
metadata:
  type: project
---

SDG&E was added as the third full IOU (after PGE, SCE) in the `sdge-support` branch (merged ~2026-05-16). 5 plans modeled: EV-TOU-5, EV-TOU-2, TOU-ELEC, TOU-DR1, DR.

**Why:** Expand app coverage to San Diego Gas & Electric territory with SDCP and CEA CCA support.

**Key schema decisions:**
- All SDG&E TOU plans use `days: "all"` (no weekday/weekend split). Holiday logic does not apply.
- SDG&E summer = June–October (month 6–10), same as EV-B's summer range (not PGE's June–Sep).
- superOffPeak period (00:00–06:00) is a new third TOU tier (alongside peak and offPeak). Engine handles it via the gap-fill algorithm in `buildScheduleForDay`.
- SDCP and CEA generation rates are flat across all TOU periods (plan-level averages from joint rate comparison PDFs). This differs from PGE where CCA rates are also flat but the rationale is different.
- DR plan (non-TOU) uses `tiers.above130Percent` without delivery+generation breakdown for that tier — schema gap, not tested by `sdgeRatePlans.test.js`.

**Known issues introduced by this branch:**
1. `Footer.jsx` ccaRateDate chain: `sdcpRateEffectiveDate` appears before `ceaRateEffectiveDate`, so `sdge-cea-sd` service areas show SDCP date (2026-01-01) instead of CEA date (2026-02-01).
2. `src/data/README.md` line 25 still says location lookup checks "pgeTerritory.json, sceTerritory.json, and multiUtilityZips.json" — outdated since lookup is registry-driven via `getUtilityTerritories()`.
3. README schema version section (line 54) lists only `ratePlans.json` and `sceRatePlans.json` as v3.0 — doesn't mention `sdgeRatePlans.json`.
4. Missing boundary tests in `rateEngine.test.js`: no test for exactly 6 AM (superOffPeak→offPeak boundary) or 9 PM (peak→offPeak boundary) for EV-TOU-5.

**What's correct:**
- Schema v3.0 invariant passes on all TOU plans (verified programmatically).
- `utilityRegistry.js` SDG&E entry is complete and wired correctly.
- `RATE_PLAN_REGISTRY` is fully derived via registry (no hardcoded SDG&E entries in App.jsx).
- Scripts use registry-driven `UTILITY_CONFIG` with no hardcoded `if (utility === 'sdge')` branches.
- UtilityPicker is data-driven (no hardcoded utility count).
- sceTerritory 7-line removal correctly moves SCE/SDG&E boundary ZIPs to multiUtilityZips only.
- multiUtilityZips now contains intra-SDG&E CCA disambiguation ZIPs (sdge-sdcp-sd vs sdge-cea-sd) — new usage pattern, semantically valid.

**How to apply:** When reviewing SDG&E-related changes, pay special attention to the ccaRateDate chain in Footer.jsx and missing boundary tests for superOffPeak transitions.
