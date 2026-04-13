⏺ Implementation Plan: Multi-Utility + Multi-CCA Rate Support

  Phase 0: Discovery Summary (already completed — see findings below)

  Key finding: the refactor is ~70% done. Schema v3.0 is already utility-agnostic, SCE data files and territory lookups exist, multi-utility
  disambiguation works end-to-end, and the RATE_PLAN_REGISTRY in App.jsx is the right abstraction. The remaining work is completing SCE data
  coverage, killing PG&E-specific leaks in generic code paths, and fixing two concrete bugs.

  Architectural decision: Keep two separate rate files. Do NOT merge into a single allRatePlans.json.

  Why:
  - v3.0 field names (delivery / generation / totalBundled / ccaGeneration) are already utility-agnostic — there is no schema-level duplication
  to unify.
  - PG&E and SCE tariffs publish on independent cadences (different advice letters, different effective dates). Separate files mean one utility's
   update never touches the other's history.
  - The RATE_PLAN_REGISTRY: serviceAreaId → ratePlansFile indirection already provides the unification layer the UI needs.
  - A single file would be 1700+ lines and force contributors touching PG&E to diff against SCE changes.
  - Adding SDG&E later = add sdgeRatePlans.json + register — zero impact on existing files.

  What is consolidated (and stays that way): serviceAreas.json (registry), territory ZIP maps, and the in-app RATE_PLAN_REGISTRY.

  Allowed APIs & canonical shapes (cite when implementing)

  ┌────────────────┬──────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┐
  │    Concept     │                 Canonical source                 │                                Shape                                │
  ├────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Service area   │ src/data/serviceAreas.json                       │ serviceAreas[id] = { name, utility, cca, shortLabel, defaultPlanId, │
  │ registry       │                                                  │  defaultProvider, providerHint, ccas: [] }                          │
  ├────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ ZIP → service  │ src/data/pgeTerritory.json,                      │ { zips: { "93427": "pge-3ce-sbco" } }                               │
  │ area           │ src/data/sceTerritory.json                       │                                                                     │
  ├────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Multi-utility  │ src/data/multiUtilityZips.json                   │ { zips: { "93101": ["pge-3ce-sbco","sce-3ce-sb"] } }                │
  │ ZIPs           │                                                  │                                                                     │
  ├────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │                │ src/data/ratePlans.json,                         │ { _metadata: {...}, ratePlans: { [planId]: { …, rates: { delivery,  │
  │ Rate plan file │ src/data/sceRatePlans.json                       │ generation, totalBundled, ccaGeneration: { [ccaId]: { name,         │
  │                │                                                  │ defaultTier, tiers: { [tier]: { summer, winter } } } } } } } }      │
  ├────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Location       │ src/hooks/useLocationLookup.js → resolve(input)  │ Returns { ok, data: { serviceAreaId, displayLabel, zip } } or {     │
  │ resolve        │                                                  │ ok:false, errorCode:'multi_utility', candidates:[] }                │
  ├────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Effective plan │ App.jsx → getEffectiveConfig(planConfig,         │ Returns cloned planConfig with pre-computed rates[season][period] = │
  │  shape         │ provider, ccaTier, serviceAreaConfig)            │  { combined, delivery, generation }                                 │
  ├────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Rate lookup    │ src/engine/rateEngine.js → getRate(date,         │ Reads pre-computed matrix; do not extend the orphaned               │
  │                │ planConfig)                                      │ provider==='cca' branch                                             │
  ├────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │                │ src/engine/costCalculator.js →                   │                                                                     │
  │ Cost math      │ calcChargeSummary(startTime, batteryKwh,         │ Already utility-agnostic                                            │
  │                │ currentPct, chargingKw, planConfig)              │                                                                     │
  └────────────────┴──────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────┘

  Anti-patterns to avoid

  - ❌ Do not reintroduce pgeDelivery / pgeGeneration / pgeTotalBundled — grep confirms zero occurrences, keep it that way.
  - ❌ Do not read .cce anywhere — the v2.1 field was renamed to ccaGeneration. The orphaned provider==='cca' branch in rateEngine.js:205-213
  still references .cce; delete it rather than fix it.
  - ❌ Do not hardcode { value: 'pge', label: 'PG&E Bundled' } — must be derived from serviceArea.utility.
  - ❌ Do not default label fallbacks to 'PG&E' (Footer, App, LocationInput).
  - ❌ Do not merge ratePlans.json and sceRatePlans.json.
  - ❌ Do not delete rates.json yet — it's a test fixture for rateEngine.test.js. Move it to a fixtures folder instead.
  - ❌ Do not invent a utility parameter for getRate() — plan data already carries everything the engine needs.

  ---
  Phase 1: Bug fixes + dead code removal (foundation, no new features)

  Goal: Make the existing multi-utility plumbing actually correct for SCE-only areas. This is a prerequisite for any Santa Barbara / Lancaster /
  Sonoma flow because the provider toggle currently mislabels SCE as PG&E.

  Tasks

  1. Fix hardcoded bundled-provider option in src/App.jsx (~L136–147).
    - Replace the literal { value: 'pge', label: 'PG&E Bundled' } with a derivation:
    const bundledKey = serviceArea.utility === 'SCE' ? 'sce' : 'pge';
  const bundledLabel = `${serviceArea.utility} Bundled`;
  const providerOptions = [
    { value: bundledKey, label: bundledLabel },
    ...serviceArea.ccas
      .filter(id => planConfig.rates.ccaGeneration?.[id])
      .map(id => ({
        value: id,
        label: `${planConfig.rates.ccaGeneration[id].name} (CCA)`,
      })),
  ];
    - Update handleLocationResolved so it resets provider to serviceArea.defaultProvider (already does this — verify it stores 'sce' for SCE
  areas, not 'pge').
    - Update buildRateMatrix / getEffectiveConfig so the "bundled" branch check is !v2Rates.ccaGeneration?.[provider] (already is — but confirm
  'sce' also routes to bundled).
  2. Delete the orphaned CCA branch in src/engine/rateEngine.js (~L205–213).
    - The else if (provider === 'cca') block reads planConfig.rates.cce which no longer exists. App.jsx never calls getRate with that argument.
  Remove the branch and the provider parameter entirely if unused; grep confirms call sites.
    - Verification: grep -rn "provider === 'cca'\|\.cce\[" src/ → zero hits after change.
  3. Rename PG&E-specific helpers in src/engine/rateEngine.js.
    - getPGEHolidayDates(year) → getFercHolidayDates(year) (or getObservedHolidayDates). The logic is the FERC standard that both PG&E and SCE
  observe, so implementation stays the same — only the name changes so future readers don't assume PG&E.
    - isHoliday(date) stays public with the same signature.
    - Verification: grep -rn "getPGEHolidayDates\|pgeHoliday" src/ → zero hits.
  4. Fix 'PG&E' fallbacks in src/components/Footer.jsx and src/components/LocationInput.jsx.
    - Current: {serviceArea?.utility ?? 'PG&E'}. Change to surface "Unknown" or, better, rely on upstream never passing a null serviceArea (add a
   guard in App.jsx). Pick whichever matches existing error UX.
    - Update related snapshot/text assertions in Footer.test.jsx if they pin the literal string.
  5. Move src/data/rates.json → src/engine/__fixtures__/rates.json and update the single importer in src/engine/rateEngine.test.js.
    - Reason: it is a bill-validation fixture for one Buellton November 2025 bill; it does not belong in src/data alongside live rate sources and
   pollutes discovery tools (including this plan's Phase 0).
    - Verification: grep -rn "data/rates.json" src/ → only the test file.

  Verification checklist for Phase 1

  - npm run test:ci passes (tests in Footer.test.jsx, rateEngine.test.js, useLocationLookup.test.js may need updates)
  - grep -rn "PG&E\|'pge'" src/ --include="*.jsx" --include="*.js" — every remaining match is either in SCE-conditioned branches, plan data, or
  user-facing copy for PG&E-only areas
  - grep -rn "\.cce\b" src/engine src/components → zero hits
  - Manual smoke: enter ZIP 90265 (Malibu, SCE+CPA). Provider toggle should show "SCE Bundled" and "Clean Power Alliance (CCA)", not "PG&E
  Bundled"
  - Manual smoke: enter ZIP 93101 (Santa Barbara). UtilityPicker should appear with both PG&E and SCE options, and picking either should produce
  a correct provider toggle

  ---
  Phase 2: Complete the SCE rate dataset

  Goal: Make sceRatePlans.json a real source of truth, not a placeholder flagged "ESTIMATED". This is what unblocks Lancaster/Malibu/Santa
  Barbara SCE users.

  Tasks

  1. Extract and validate Schedule D (tiered domestic) plan from sce_source/SCE_Combined_Rates.xlsx → new entry in
  sceRatePlans.json.ratePlans["D"].
    - Follow the shape of ratePlans.json.ratePlans["E-1"] as a model (it is the analogous PG&E tiered plan).
    - Category: "Tiered (Non-TOU)" to match existing PlanSelector grouping order.
    - Include _flatRate structure that App.jsx:getEffectiveConfig already handles.
    - Verification: cross-check every rate cell against sce_source/ELECTRIC_SCHEDULES_D.pdf (per CLAUDE.md action-boundary rule — pause and
  confirm with user before committing changes).
  2. Replace ESTIMATED TOU-D-4-9PM and TOU-D-PRIME rates with authoritative values from the SCE tariff PDFs.
    - Re-derive the delivery/generation split from the actual tariff breakdown rather than the blended average currently in place.
    - Remove the three ⚠️  ESTIMATED warnings from sceRatePlans.json._metadata.notes only after validation.
    - Fix the stale sceAdviceLetter: "UNKNOWN — validate against tariff PDF" with the real advice letter from the PDF.
  3. Add TOU-D-5-8PM as the fourth SCE plan (optional — confirm with user whether this plan should be user-selectable before doing the work).
  4. Expand ccaGeneration in each SCE plan to cover all active LA/Ventura/SB CCAs:
    - Already present: cpa, sce-3ce-sb
    - Backlog (per SCE_README.md): rmea (Rancho Mirage), sjp (San Jacinto Power), sbce (Santa Barbara Clean Energy), lancaster-choice,
  jrc-pomona, energy-palmdale
    - Source: sce_source/CCA_Summary sheet in the workbook; if rates aren't extracted there, cite sce_source/ PDFs and extract.
    - Each CCA block must follow the shape from ratePlans.json.ratePlans["EV2-A"].rates.ccaGeneration["3ce"] exactly (name, defaultTier,
  tiers[tierId] = { label, summer: {peak, offPeak, ...}, winter: {...} }).
    - Critical gotcha per memory S4/128/129: Some workbook cells contain stale PG&E PCIA values. Before copying any rate, verify the source is an
   SCE tariff PDF, not leaked PG&E data.
  5. Handle the PCIA sign inversion.
    - SCE PCIA is a credit (negative value) per 3CE Rate Sheet; PG&E PCIA is a charge (positive). Observation 132 confirmed SCE PCIA values are
  correct in the xlsx.
    - Decide where this lives: in the per-plan rate totals (bake PCIA into generation), or as a separate adjustments block. Recommendation: bake
  it in so delivery + generation = totalBundled invariant keeps holding.
    - Document the decision in sceRatePlans.json._metadata.notes and in SCE_README.md.
  6. Expand src/data/serviceAreas.json for new SCE CCAs.
    - For each new CCA added to sceRatePlans.json, add or update the corresponding sce-<cca>-<region> entry with utility: "SCE", defaultPlanId:
  "TOU-D-PRIME" (or whichever is appropriate), defaultProvider: "<ccaId>", ccas: ["<ccaId>"].
    - For areas where users might reasonably want either SCE bundled or a CCA, ensure the CCA appears in the ccas array so the provider toggle in
   App.jsx surfaces it.
  7. Expand src/data/sceTerritory.json to cover the new CCA ZIP codes.
    - Lancaster (93534, 93535, 93536, 93539, 93543, 93550) → sce-lancaster-av
    - Palmdale, Rancho Mirage, San Jacinto, etc. as applicable
    - Source: each CCA's published service territory; cite in the PR description.

  Verification checklist for Phase 2

  - For every changed cell in sceRatePlans.json, the source document name + page is in the PR description (per CLAUDE.md)
  - delivery + generation ≈ totalBundled holds within ±0.00001 for every rate cell in the file — add a unit test that walks the whole JSON tree
  if one doesn't exist
  - sceRatePlans.json._metadata.sceAdviceLetter is a real advice letter, not "UNKNOWN"
  - _metadata.notes no longer contains any ⚠️  ESTIMATED warnings for finalized plans
  - Enter Lancaster ZIP (e.g., 93534) → service area resolves to sce-lancaster-av (or whichever is correct), plan selector shows SCE plans,
  provider selector shows "SCE Bundled" + "Lancaster Choice (CCA)"
  - Enter Sonoma ZIP (95476) → resolves to pge-scp-son, provider selector shows "PG&E Bundled" + "Sonoma Clean Power (CCA)"
  - Enter Santa Barbara ZIP (93101) → UtilityPicker appears, picking either path produces a fully working cost calculation

  ---
  Phase 3: Multi-CCA per service area (enables "choose which CCA" UX)

  STATUS: COMPLETED (2026-04-13) — Audit result: NO multi-CCA overlap exists.

  Goal: Today each service area has one CCA. Santa Barbara's sce-3ce-sb implicitly assumes 3CE, but real Santa Barbara SCE customers may also be
  on SBCE. This phase makes the ccas array genuinely multi-valued.

  Audit findings (2026-04-13):

  California CCAs do NOT overlap geographically. Each address is served by exactly one CCA (or none).
  The plan's hypothesis — "if SBCE serves the same ZIPs" — is false:
    - SBCE serves ONLY the City of Santa Barbara (source: sustainability.santabarbaraca.gov)
    - 3CE serves Goleta, Carpinteria, and unincorporated Santa Barbara County in SCE territory (source: sce.com CCA list)
    - PG&E East Bay: Ava and MCE serve adjacent but non-overlapping jurisdictions
    - Confirmed via SCE's active CCA list: 12 CCAs in SCE territory, all non-overlapping

  Task disposition:
  1. Audit ccas arrays — DONE. No expansion needed. All ccas arrays correctly have 0 or 1 entry.
  2. ProviderSelector scales — CONFIRMED. App.jsx:137-149 already builds options dynamically from ccas array.
  3. defaultProvider for multi-CCA — N/A. No multi-CCA case exists.
  4. Tests — Existing coverage in App.test.jsx:111-198 already covers provider switching, CCA tiers, service area changes.

  Action item surfaced: SBCE is missing from serviceAreas.json entirely. Added as part of this phase:
    - New service area: sce-sbce-sb (City of Santa Barbara)
    - New city entry: santa-barbara → sce-sbce-sb
    - SBCE generation rates added to sceRatePlans.json for all three SCE plans

  Verification checklist for Phase 3

  - [x] Every serviceAreas.json entry's ccas array matches reality (confirmed via SCE CCA page + individual CCA sites)
  - [x] No multi-CCA overlap found — verification checklist item about "both 3CE and SBCE options" is N/A
  - [x] npm run test:ci green (212 tests, 12 files — 4 new SBCE tests added)
  - [x] npm run build succeeds

  ---
  Phase 4: Documentation sync

  Tasks

  1. Update CLAUDE.md top-matter — current version says "Real-time home EV charging cost calculator for Buellton, CA. PG&E delivery + 3CE
  generation." Expand to reflect PG&E and SCE service territories and the CCA model.
  2. Update PGE_README.md — note the split-file architecture and cross-reference SCE_README.md and serviceAreas.json.
  3. Fix SCE_README.md — currently says "Aligns with ratePlans.json v2.0"; bump to v3.0 and remove the "not yet merged into ratePlans.json" note
  (since the canonical decision is separate files).
  4. Add a short src/data/README.md documenting the registry pattern so new contributors know where to add a new utility.

  Verification checklist for Phase 4

  - grep -rn "v2.0\|Buellton, CA" CLAUDE.md *README.md — only intentional mentions remain
  - New contributor can read src/data/README.md and understand how to add SDG&E without reading code

  ---
  Final Phase: End-to-end verification

  1. Run npm run test:ci — all green.
  2. grep -rn "pgeDelivery\|pgeGeneration\|pgeTotalBundled\|\.cce\[" src/ → zero hits.
  3. Manual acceptance matrix — for each row, confirm the user flow produces correct labels, correct CCA options, and a correct $/kWh
  current-rate display:

  ┌──────────────────────┬────────────────────────────────────────┬───────────────────────────────┬───────────────────────┐
  │      City / ZIP      │            Expected utility            │     Expected CCA options      │ Expected default plan │
  ├──────────────────────┼────────────────────────────────────────┼───────────────────────────────┼───────────────────────┤
  │ Buellton, 93427      │ PG&E                                   │ 3CE                           │ EV2-A                 │
  ├──────────────────────┼────────────────────────────────────────┼───────────────────────────────┼───────────────────────┤
  │ Sonoma, 95476        │ PG&E                                   │ SCP                           │ EV2-A                 │
  ├──────────────────────┼────────────────────────────────────────┼───────────────────────────────┼───────────────────────┤
  │ San Francisco, 94102 │ PG&E                                   │ CleanPowerSF                  │ EV2-A                 │
  ├──────────────────────┼────────────────────────────────────────┼───────────────────────────────┼───────────────────────┤
  │ Lancaster, 93534     │ SCE                                    │ Lancaster Choice (+ CPA?)     │ TOU-D-PRIME           │
  ├──────────────────────┼────────────────────────────────────────┼───────────────────────────────┼───────────────────────┤
  │ Malibu, 90265        │ SCE                                    │ CPA                           │ TOU-D-PRIME           │
  ├──────────────────────┼────────────────────────────────────────┼───────────────────────────────┼───────────────────────┤
  │ Santa Barbara, 93101 │ UtilityPicker → user picks PG&E or SCE │ PG&E: 3CE · SCE: 3CE-SB, SBCE │ Respective defaults   │
  ├──────────────────────┼────────────────────────────────────────┼───────────────────────────────┼───────────────────────┤
  │ Rural CA, 95945      │ PG&E                                   │ (none — pge-only)             │ EV2-A                 │
  └──────────────────────┴────────────────────────────────────────┴───────────────────────────────┴───────────────────────┘

  4. Build: npm run build — no warnings.

  ---
  What was evaluated and deliberately left alone

  - ratePlans.json + sceRatePlans.json split — intentional, see Phase 0 decision.
  - useLocationLookup.js — already multi-utility aware; no changes.
  - UtilityPicker.jsx — already generic; no changes.
  - ProviderSelector.jsx — already prop-driven; no changes.
  - costCalculator.js — already utility-agnostic; no changes.
  - Holiday calendar — FERC standard applies to both utilities; only renaming the helper.

  ---
  Summary of the minimum-viable path

  If you want the shortest path to "Lancaster user gets correct SCE rates and Santa Barbara user gets a working choice":

  1. Phase 1 in full (bug fixes, ~1 session). Unblocks the SCE UI labels.
  2. Phase 2 tasks 1, 2, 6, 7 (validate SCE rates, add Lancaster territory). Skip the CCA expansion backlog.
  3. Phase 4 task 3 (fix SCE_README stale reference).

  Phases 2 full, 3, and 4 are polish / completeness passes that can ship incrementally per CCA.

  ---
  Ready to execute. Which phase would you like to start with — Phase 1 cleanup, or do you want me to spin off Phase 2 SCE data validation first
  so the cleanup lands on a complete dataset?