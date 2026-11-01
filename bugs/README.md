# Accuracy bug backlog

Audit date: 2026-10-31. Implementation validation: 2026-11-01. Scope: Buellton, PG&E delivery plus 3CE generation, with related shared-engine and verification defects. Original reproduction values below describe pre-fix behavior; each individual report now records verified implementation scope and remaining gaps.

## Implementation outcome

- Standard PG&E/3CE pricing, state surcharge, Pacific/DST termination, provider context, E-1 controls/assumptions, live refresh, integrated breakdowns, efficiency, actual-price countdowns, future starts and LFS source validation are implemented and regression-tested.
- **Not fully closed:** ACC-001 exempt groups/other-provider fee verification; ACC-003 independent CCA shoulder-period alignment; ACC-010 proportional household billing-period allocation; ACC-012 full NEM2 settlement; ACC-016 authoritative residential holiday observation. The UI explicitly warns about these limits.
- Raw rate JSON, season month ranges, stored schema and private statement artifacts were not changed. No commits or pushes were made.
- Final validation: **713 tests across 40 files passed**; lint, production build, territory validation/generated-output check, source validation (41 rate + 3 territory inputs), and `git diff --check` passed. Pacific/date/session regressions passed **155 tests per host timezone** under UTC, Asia/Tokyo and America/New_York. The production build retains its large-bundle warning; territory validation retains the two three-ZIP service-area warnings.

## Priorities and evidence

- **P1:** incorrect money, incorrect tariff periods, or a normal-input calculation hang.
- **P2:** misleading context, incomplete estimation assumptions, latent calculation defects, or verification reliability.
- **Confirmed defect** means observed runtime behavior or data contradicts a documented requirement.
- **Modeling gap** means the app lacks inputs or rules needed for the claimed estimate. Do not invent missing household data.
- **Needs authoritative verification** is not a confirmed tariff overcharge.

The reports use the audited rate snapshot. Reproduction amounts that exercise the existing code intentionally retain its current errors. After a rate correction, update affected regression amounts from an independent oracle, not from the implementation under test.

## Individual reports

- [ACC-001 — CCA rate composition omits charges and retains bundled PCIA credit](001-cca-rate-composition.md) — P1, confirmed.
- [ACC-002 — Spring-DST date construction can freeze charging calculations](002-spring-dst-calculation-hang.md) — P1, confirmed.
- [ACC-003 — EV-B omits tariff-specific DST shoulder schedules](003-evb-dst-shoulder-schedule.md) — P1, confirmed.
- [ACC-004 — Buellton defaults to an unverified generation provider](004-unverified-generation-provider-default.md) — P1, confirmed selection risk.
- [ACC-005 — Header identifies territory CCA instead of selected provider](005-provider-header-mismatch.md) — P2, confirmed.
- [ACC-006 — E-1 hides active provider and product controls](006-e1-hidden-provider-state.md) — P2, confirmed.
- [ACC-007 — Charge-now estimates become stale within a rate period](007-stale-charge-estimates.md) — P1, confirmed.
- [ACC-008 — Session component breakdown does not reconcile to total](008-session-breakdown-reconciliation.md) — P1, confirmed.
- [ACC-009 — E-1 always assumes Tier 1](009-e1-tier1-only.md) — P1, confirmed.
- [ACC-010 — E-TOU-C ignores baseline credit and usage allocation](010-etouc-baseline-credit.md) — P1, confirmed.
- [ACC-011 — State energy surcharge is omitted](011-state-energy-surcharge.md) — P2, bill-confirmed.
- [ACC-012 — NEM2 billing and estimate scope are not modeled](012-nem2-billing-scope.md) — P1, modeling gap confirmed by bill.
- [ACC-013 — Battery energy is treated as metered charging energy](013-charging-losses.md) — P2, modeling gap.
- [ACC-014 — Countdown promises a price drop at an unchanged boundary](014-false-next-rate-change.md) — P2, confirmed.
- [ACC-015 — Cheapest-window search includes past start times](015-cheapest-window-in-the-past.md) — P2, latent confirmed defect.
- [ACC-016 — Holiday observation policy and year rollover need verification](016-holiday-policy-verification.md) — P2, internal inconsistency; tariff behavior unresolved.
- [ACC-017 — Source catalog fingerprints LFS pointers instead of documents](017-lfs-source-provenance.md) — P2, confirmed verification defect.

## Coordination and dependencies

ACC-002 blocks safe boundary/session regression work. ACC-001 and ACC-011 establish the standard bill-component oracle. ACC-004 through ACC-006 establish that the chosen account configuration matches the displayed calculation. ACC-008 must include any components introduced by ACC-001/ACC-011. ACC-009/ACC-010 need household usage context, not guessed allowances. ACC-012/ACC-013 require explicit modeling assumptions. ACC-014 must not remove day boundaries needed for cost integration. ACC-017 is necessary for dependable source verification.

Keep unrelated fixes independently reviewable. Passing tests against the checked-in JSON alone does not prove that JSON matches a tariff.

## Sanitized statement reference

The owner supplied an October 14, 2026 statement covering September 8–October 6, 2026. The private PDF is **not** part of the repository. Do not add the original statement, account/service/meter identifiers, address, QR codes, or screenshots of personal details to commits or fixtures.

Confirmed configuration:

- EV2-A, PG&E delivery, 3CE generation prices matching all six 3Cchoice rate cells.
- Explicit 2021 PCIA vintage; PCIA $0.05264/kWh and franchise surcharge $0.00048/kWh.
- NEM2; PG&E true-up January 2027; 3CE generation relevant period ends December 2026.
- Base services charge $0.79343/day; 29 billing days, billed as $23.01.
- Page 6: monthly fixed charge, imports 916.9128 kWh, exports 26.8027 kWh, net 890.1101 kWh.
- Page 7: summer/winter usage, generation credits, PCIA, franchise fee, and NBC reconciliation.
- Page 9: six 3CE generation rates and $0.27 energy commission surcharge.

Bill-derived reconciliation inputs:

- Summer, September 8–30: peak 43.0846 kWh; part-peak 84.0688 kWh; off-peak 549.9537 kWh.
- Winter, October 1–6: peak 16.5228 kWh; part-peak 24.2946 kWh; off-peak 172.1856 kWh.
- PG&E generation credits: summer $69.68; winter $19.34.
- PCIA: summer $35.64; winter $11.21. Franchise: summer $0.33; winter $0.10.
- NBC adjustments: summer -$8.33 + $8.54; winter -$2.63 + $2.65; net +$0.23. This is a statement-specific reconciliation, **not** a reusable flat surcharge.
- PG&E accrued NEM charges $196.89; 3CE generation plus state surcharge $88.40; variable charges/accruals $285.29.
- Fixed charge $23.01; amount due now $111.41; combined current-period charges/accruals $308.30. Do not add the deferred $196.89 twice.
- Applying the old app's 3CE formula to the six net-usage rows gives $228.51. Correct component math including state surcharge gives $285.06; the bill adds net NBC reconciliation and line rounding to reach $285.29.

Standard component rates, before NEM reconciliation and fixed charges:

- Summer: off-peak $0.27777; part-peak $0.47938; peak $0.58943 per kWh.
- Winter: off-peak $0.27784; part-peak $0.44631; peak $0.46289 per kWh.
- Add $0.00030/kWh state energy surcharge for this account: summer $0.27807/$0.47968/$0.58973 and winter $0.27814/$0.44661/$0.46319, in off/part/peak order.
- EV2-A hours every day: off-peak midnight–3 PM; part-peak 3–4 PM and 9 PM–midnight; peak 4–9 PM. Summer June–September; winter October–May.

Preserve tariff precision during calculations and reproduce statement line-rounding separately. A five-decimal rate is not a promise of a five-decimal final NEM marginal cost.

## Official sources

- [PG&E EV2 tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_EV2%20(Sch).pdf): component/billing rules, sheets 3–5.
- [PG&E EV-B tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_EV%20(Sch).pdf): DST schedule, sheet 3.
- [PG&E E-1 tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_E-1.pdf).
- [PG&E E-TOU-C tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_E-TOU-C.pdf).
- [PG&E E-TOU-D tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_E-TOU-D.pdf).
- [PG&E CCA-CRS](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_CCA-CRS.pdf): vintage assignment and exemptions, sheets 1–2.
- [PG&E E-FFS](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_E-FFS.pdf): vintage franchise surcharge.
- [3CE residential rates, effective February 15, 2026](https://3cenergy.org/wp-content/uploads/2026/04/PGE-Residential-Website-Rate-Sheet-2026.02.15_with3Cflex.pdf).
- [CDTFA 2026 state energy surcharge notice](https://cdtfa.ca.gov/formspubs/l1020.pdf).
- [PG&E current residential workbook](https://www.pge.com/assets/rates/tariffs/res-inclu-tou-current.xlsx).

The audit found all 28 stored PG&E bundled energy cells and 54 stored 3Cchoice/3Cprime generation cells matched the retrieved official publications. Do not label them stale solely because metadata says March/February; later tariff-sheet revisions did not necessarily change energy prices. Eligibility for the published 3Cflex pilot remains a separate verification question, not permission to apply its rates to this account.

## Closure requirements

Each report requires independent expected-value regression tests and explicit treatment of unknown inputs. Use `npm run test:ci`, `npm run lint`, and `npm run build` for implementation validation; run relevant territory/source checks when changing those inputs. Track pre-existing failures separately rather than weakening checks.

Follow `AGENTS.md`: obtain confirmation before changing `src/data/ratePlans.json`, season ranges, or the rate schema. Update inaccurate guidance alongside the relevant fix, including blanket ZIP-to-vintage assumptions and the CCA formula. No commits are authorized by this backlog request.
