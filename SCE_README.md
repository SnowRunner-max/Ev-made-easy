# SCE Rate Data — Structure Reference

**Canonical rate data:** `src/data/sceRatePlans.json` (schema v3.0)
**Research workbook:** `sce_source/SCE_Combined_Rates.xlsx` (source of truth for raw tariff values)
**Territory:** Southern California Edison (SCE)
**Current tariffs:** Advice 5725-E (eff. 2026-01-01) for Schedule D and TOU-D rates; base tariffs Advice 5654-E (D) and 5338-E (TOU-D)

This document describes the structure of `SCE_Combined_Rates.xlsx` and the shape of `sceRatePlans.json`. The workbook is the authoritative intermediate artifact for researching and validating rates; `sceRatePlans.json` is the derived runtime file consumed by the app. All rates in `$/kWh` unless noted.

> ⚠ **Important:** `sce_source/` is gitignored. The workbook lives on disk but is not committed. Do not delete the directory.

---

## Workbook layout — 7 sheets

| # | Sheet | Purpose |
|---|---|---|
| 1 | `Overview` | Sources/effective dates, plan descriptions, column-schema legend |
| 2 | `D (Domestic)` | Schedule D — flat tiered, no TOU |
| 3 | `TOU-D-4` | Option 4-9 PM (peak 4–9pm weekdays) |
| 4 | `TOU-D-5` | Option 5-8 PM (peak 5–8pm weekdays) |
| 5 | `TOU-D-PRIME` | EV plan (peak 4–9pm weekdays, deep off-peak discount) |
| 6 | `Fixed_Charges` | Per-kWh adders, daily/monthly charges, baseline credit, EV credits, non-bypassable charges, PCIA by vintage |
| 7 | `CCA_Summary` | CCA provider metadata: plans covered, tiers, effective date, service area, source file, extraction status |

---

## Plans covered

| Plan | Category | Periods | Notes |
|---|---|---|---|
| **D (Domestic)** | Tiered, non-TOU | Baseline / Over-Baseline | Same rate 24/7 within a tier. |
| **TOU-D-4** (Option 4-9 PM) | Residential TOU | On-Peak / Mid-Peak / Off-Peak / Super-Off-Peak | Peak 4–9pm M–F (excl. holidays). Baseline credit applies. |
| **TOU-D-5** (Option 5-8 PM) | Residential TOU | On-Peak / Mid-Peak / Off-Peak / Super-Off-Peak | Peak 5–8pm M–F (excl. holidays). Baseline credit applies. |
| **TOU-D-PRIME** | EV TOU | On-Peak / Mid-Peak / Off-Peak / Super-Off-Peak | EV plan; deep off-peak discount. Supports separately-metered EV option with daily meter credit. **No baseline credit.** |

**Season convention (all TOU plans):** Summer = June–September, Winter = October–May. (Schedule D is year-round.)

---

## Sheet: `Overview`

Top sections in column A:

1. **`SOURCES & EFFECTIVE DATES`** (rows 4–13) — Provider / Effective Date / Advice Letter / Source File for SCE and every CCA.
2. **`RATE PLANS COVERED`** (rows 16–21) — Plan ID, TOU definition, and a `Sheet:` pointer in column L.
3. **`COLUMN SCHEMA — Aligns with sceRatePlans.json v3.0`** (rows 23–35) — Field glossary documenting the rate columns used across the TOU sheets (`sceDelivery`, `sceGeneration`, `sceTotalBundled`, per-CCA columns, `FRC/MCAM`, formula rows).

Use this sheet to find which tariff PDF backed a given number and when it was last effective.

---

## Sheet: `D (Domestic)`

Flat tiered plan, no TOU.

- **Row 3** — high-level column groups (SCE Delivery / SCE Generation / SCE Bundled / per-CCA generation / Notes).
- **Row 4** — tier-specific sub-headers (e.g. `3Cchoice`, `3Cprime`, `Desert Saver`, `Carbon Free`, `Standard`, `Basic Choice`, `Smart Choice`, `100% Renew.`, `PRIME Power`, `PRIME Future`, `Lean Power`, `Clean Power`, `100% Green Pwr`).
- **Row 5** — `Baseline` tier (0–100% of monthly baseline allocation).
- **Row 6** — `Over-Baseline` tier (>100% of baseline allocation).
- **Row 8** — footnote explaining the flat per-kWh adders (FRC + MCAM) apply to ALL customers on top of the listed rates.

**Column layout (typical):**

| Col | Content |
|---|---|
| A | Tier label |
| C | SCE Delivery (all customers) |
| D | SCE Generation (bundled only) |
| E | SCE Total Bundled (= C + D) |
| F | 3Cchoice |
| G | 3Cprime |
| H | DCE Desert Saver |
| I | DCE Carbon Free |
| J | AVCE Standard |
| K | OCPA Basic Choice |
| L | OCPA Smart Choice |
| M | OCPA 100% Renewable |
| N | PRIME Power ⚠ (blended avg) |
| O | PRIME Future ⚠ (blended avg) |
| P | CPA Lean Power |
| Q | CPA Clean Power |
| R | CPA 100% Green Power |
| S | Notes |

Note that on Schedule D, SCE's generation charge is the same for baseline and over-baseline (the tier split applies to delivery only).

---

## Sheets: `TOU-D-4`, `TOU-D-5`, `TOU-D-PRIME`

Identical column shape; only the time windows and rates differ.

- **Row 3** — high-level column groups.
- **Row 4** — sub-headers (same CCA tier order as Schedule D).
- **Row 5** — Section divider: `— Summer Season —`.
- **Rows 6–8** — Summer: On-Peak, Mid-Peak, Off-Peak.
- **Row 9** — Section divider: `— Winter Season —`.
- **Rows 10–12** — Winter: Mid-Peak, Off-Peak, Super-Off-Peak. (Winter has no On-Peak.)
- **Row 14** — Baseline Credit footnote (`-$0.10108/kWh` up to 100% of baseline). **TOU-D-4 and TOU-D-5 only.** TOU-D-PRIME does not have this line.
- **Rows 16–17** — Reminder that FRC + MCAM apply to all customers, and that CCA customers pay `SCE Delivery + CCA Generation + FRC + MCAM + PCIA + GMS` (+ non-bypassable charges).
- **Rows 19–23** — Color key: blue = hardcoded from source; black = formula; orange italic = blended average (use with caution); grey `N/A` = rate not available.

**Column layout:**

| Col | Content |
|---|---|
| A | Season |
| B | Period |
| C | Time window |
| D | SCE Delivery |
| E | SCE Generation (bundled only) |
| F | SCE Total Bundled |
| G | 3Cchoice |
| H | 3Cprime |
| I | DCE Desert Saver |
| J | DCE Carbon Free |
| K | AVCE Standard |
| L | OCPA Basic Choice |
| M | OCPA Smart Choice |
| N | OCPA 100% Renewable |
| O | PRIME Power ⚠ (blended avg) |
| P | PRIME Future ⚠ (blended avg) |
| Q | CPA Lean Power |
| R | CPA Clean Power |
| S | CPA 100% Green Power |
| T | Notes |

**`N/A` in PRIME columns is expected** — SCE publishes only blended annual averages for Pico Rivera's PRIME plans via HTML, not per-period rates.

### TOU window quick reference

| Plan | Summer On-Peak | Summer Mid-Peak | Summer Off-Peak | Winter Mid-Peak | Winter Off-Peak | Winter Super-Off-Peak |
|---|---|---|---|---|---|---|
| TOU-D-4 | 4–9pm M–F | 4–9pm Sat/Sun/hol | All other hours | 4–9pm every day | 9pm–8am every day | 8am–4pm every day |
| TOU-D-5 | 5–8pm M–F | 5–8pm Sat/Sun/hol | All other hours | 5–8pm every day | 8pm–8am every day | 8am–5pm every day |
| TOU-D-PRIME | 4–9pm M–F | 4–9pm Sat/Sun/hol | Other (incl. midnight–6am) | 4–9pm every day | 9pm–8am every day | 8am–4pm every day |

---

## Sheet: `Fixed_Charges`

Non-energy charges and per-kWh adders. Row ranges below reflect the current canonical structure (Issues #3–#7 resolved; California Climate Credit removed; integrity verified).

| Row | Section / Charge | Value | Unit | Applies To |
|---|---|---|---|---|
| 3 | `Per-kWh Energy Adders (ALL Customers, All Plans)` (section header) | | | |
| 4 | Fixed Recovery Charge (FRC) | `0.00619` | $/kWh | All plans |
| 5 | MCAM (Modified Cost Allocation Mechanism) | `0.00223` | $/kWh | All plans |
| 6 | Total flat adder (FRC + MCAM) | `0.00842` | $/kWh | Formula row |
| 8 | `Daily / Monthly Fixed Charges` (section header) | | | |
| 9 | Base Services Charge (BSC) | `0.794` | $/meter/day | All plans |
| 10 | BSC Adjustment — Deed Restricted | `-0.332` | $/meter/day | Affordable housing reduction |
| 12 | `TOU-D Baseline Credit (TOU-D-4 and TOU-D-5 ONLY)` (section header) | | | |
| 13 | Baseline Credit | `-0.10108` | $/kWh | TOU-D-4, TOU-D-5 only |
| 15 | `TOU-D-PRIME EV Credits (separately metered EV only)` (section header) | | | |
| 16 | EV Meter Credit | `-0.451` | $/meter/day | TOU-D-PRIME only |
| 17 | EV Submeter Credit | `-0.152` | $/meter/day | TOU-D-PRIME only |
| 19 | `Non-Bypassable Charges for CCA Customers` (section header) | | | |
| 20 | Wildfire Fund Charge (WFC) | `0.00595` | $/kWh | CCA Domestic |
| 21 | Competition Transition Charge (CTC) | `-0.00058` | $/kWh | CCA Domestic (credit) |
| 22 | Fixed Recovery Charge (FRC) — CCA version | `0.00198` | $/kWh | CCA Domestic |
| 23 | Generation Municipal Surcharge (GMS) | `0.009261` | factor × SCE generation rate | CCA customers |
| 25 | `PCIA — by enrollment vintage — All CCA customers in SCE territory` (section header) | | | |
| 26 | 2018 vintage | `-0.01227` | $/kWh | CCA Domestic |
| 27 | 2019 vintage | `-0.01562` | $/kWh | CCA Domestic |
| 28 | 2020 vintage | `-0.01343` | $/kWh | CCA Domestic |
| 29 | 2021 vintage | `-0.01267` | $/kWh | CCA Domestic |
| 30 | 2022 vintage | `-0.03047` | $/kWh | CCA Domestic |
| 31 | 2023 vintage | `-0.03047` | $/kWh | CCA Domestic |
| 32 | 2024 vintage | `-0.02789` | $/kWh | CCA Domestic |
| 33 | 2025 vintage | `-0.02789` | $/kWh | CCA Domestic |

**Notes that matter:**

- **Row 11 is intentionally blank** — acts as a visual separator. (The California Climate Credit row formerly lived here; see "Scope" below.)
- **PCIA is a CREDIT in SCE territory** (negative values), the opposite of PG&E territory where PCIA is a positive charge. Do not copy PG&E logic directly.
- **GMS** is computed as `0.009261 × SCE generation rate component`, sourced from 3CE SCE Territory Rate Sheet, Apr 1 2025, p4.
- **EV Meter Credit (-0.451 $/meter/day)** is sourced from `ELECTRIC_SCHEDULES_TOU-D.pdf` p7.
- **California Climate Credit is deliberately excluded** from this workbook. It is a bill credit applied regardless of EV usage; the cost to charge an EV is unaffected by it, so it is out of scope for this source of truth.

---

## Sheet: `CCA_Summary`

Per-CCA metadata. Columns:

| Col | Field |
|---|---|
| A | CCA Name |
| B | Plans Covered |
| C | Default Tier |
| D | Premium Tier(s) |
| E | Effective Date |
| F | Service Area |
| G | PCIA Vintage |
| H | Source File |
| I | Notes |
| J | Status |

**CCA roster (rows 4–15):**

| CCA | Status | Plans Covered | Default → Premium | Effective |
|---|---|---|---|---|
| **3CE** | ✓ Rates extracted | D, TOU-D-4, TOU-D-5, TOU-D-PRIME | 3Cchoice → 3Cprime | Apr 1, 2025 |
| **DCE** | ✓ Rates extracted | D, TOU-D-4, TOU-D-5, TOU-D-PRIME | Desert Saver → Carbon Free | Jan 1, 2026 |
| **AVCE** | ✓ Rates extracted | D, TOU-D-4, TOU-D-5, TOU-D-PRIME | Standard → MORE Choice 50% | Apr 1, 2025 |
| **OCPA** | ✓ Rates extracted | D, TOU-D-4, TOU-D-5, TOU-D-PRIME, TOU-D-A, TOU-D-B | Basic → Smart → 100% Renewable | Oct 20, 2025 |
| **PRIME** | ⚠ Blended avg only | D, TOU-D-4, TOU-D-5, TOU-D-PRIME | PRIME Power → PRIME Future | Per SCE joint HTML |
| **RMEA** | ⚠ Not extracted | — | — | — |
| **SJP** | ⚠ Not extracted | — | — | — |
| **SBCE (100% Green)** | ⚠ Not extracted | — | 100% Green | — |
| **LE** (Lancaster) | ⚠ Not extracted | — | — | Aug 21, 2024 |
| **JRC Pomona** | ⚠ Not extracted | — | — | Dec 1, 2025 |
| **Energy for Palmdale** | ⚠ Not extracted | — | — | Feb 1, 2024 |
| **CPA** (Clean Power Alliance) | ✓ Rates extracted | D, TOU-D-4, TOU-D-5, TOU-D-PRIME | Lean Power → Clean Power → 100% Green Power | Mar 1, 2025 |

`⚠ Not extracted` rows exist as placeholders — the source HTML/PDF is on disk in `sce_source/` but the per-period rates have not been pulled into the workbook yet.

---

## Total rate math

**Bundled SCE customer:**
```
rate = sceDelivery[plan][season][period]
     + sceGeneration[plan][season][period]
     + FRC (0.00619)
     + MCAM (0.00223)
     (- Baseline Credit if TOU-D-4/5 and within baseline allocation)
```

**CCA customer (e.g. 3CE 3Cchoice on TOU-D-PRIME):**
```
rate = sceDelivery[TOU-D-PRIME][season][period]
     + ccaGeneration["3ce"]["3cchoice"][season][period]
     + FRC (CCA version: 0.00198)
     + MCAM (0.00223)
     + WFC (0.00595)
     + CTC (-0.00058)
     + GMS (0.009261 × sceGeneration component)
     + PCIA[vintage]       // negative → credit in SCE territory
     (no Baseline Credit on TOU-D-PRIME)
```

Daily-charge adjustments (BSC, BSC deed-restricted adjustment, EV Meter/Submeter Credit) are applied per meter per day, **outside** the per-kWh math. Surface them in UI footers, not in hero $/kWh numbers.

---

## Known `openpyxl` gotcha when editing this workbook

`ws.delete_rows(N, 1)` silently drops cell data in columns B–F on downstream rows if those rows had merged ranges pre-delete. Column A shifts correctly; B–F do not. Before any row deletion:

1. Snapshot merged ranges that overlap the delete range or the rows below it.
2. `ws.unmerge_cells(...)` for all of them.
3. `ws.delete_rows(N, 1)`.
4. Restore cell values into the now-shifted positions (keep a PDF-backed source to recover from).
5. Re-create merges at the post-shift positions.
6. Integrity-check: scan `max_row`, verify no NaN/None in expected rate cells.

This was the root cause of the Issue #6 corruption that lost WFC, Baseline Credit, EV Meter Credit, and the 2018-vintage PCIA rows.

---

## Updating SCE rates

`sce_source/` holds the authoritative PDFs/XLSX/HTML inputs. When SCE or a CCA publishes a new tariff:

1. Drop the new source file into `sce_source/`.
2. Verify the advice letter and effective date on page 1 of the PDF.
3. Update the corresponding row in `Overview` (rows 6–15) with the new effective date and advice letter.
4. Patch the affected rate cells in `D (Domestic)`, `TOU-D-4`, `TOU-D-5`, `TOU-D-PRIME`, or `Fixed_Charges`.
5. Keep the invariant: `sceDelivery + sceGeneration ≈ sceTotalBundled` on bundled rows.
6. Re-run any downstream export that feeds `src/data/ratePlans.json`.

The `sceRatePlans.json` file uses the same three-field shape as `ratePlans.json` (`delivery / generation / totalBundled` + `ccaGeneration`). When updating SCE rates, patch the workbook first, verify the invariants, then propagate the values to `sceRatePlans.json`.
