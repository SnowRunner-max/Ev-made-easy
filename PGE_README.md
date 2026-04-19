# PG&E Rate Data — Structure Reference

**Source of truth:** `src/data/ratePlans.json` (schema v3.0)
**Territory:** Pacific Gas & Electric (PG&E), Buellton CA, baseline territory **P**
**Current tariffs:** PG&E Advice Letter 7846-E (eff. 2026-03-01) · 3CE Rate Sheet v29 (eff. 2026-02-15)

This document describes the live shape of `ratePlans.json`. If you only need to know what a field means or where a value lives, this is the right file.

> **Multi-utility note:** This file covers PG&E delivery territory only. SCE rates live in a parallel file — `src/data/sceRatePlans.json` — with the same schema. See `SCE_README.md` for that file's structure, and `src/data/README.md` for how the two files are wired together via `serviceAreas.json` and `RATE_PLAN_REGISTRY` in `App.jsx`.

---

## Top-level shape

```jsonc
{
  "_metadata": { /* territory-wide constants and notes */ },
  "ratePlans":  { /* six plan objects keyed by plan ID */ }
}
```

### `_metadata`

| Field | Example | Meaning |
|---|---|---|
| `version` | `"3.0.0"` | Schema version. v3.0 renamed `pge*` rate fields to utility-agnostic `delivery/generation/totalBundled`. |
| `territory` | `"PG&E"` | Delivery utility. |
| `baselineTerritory` | `"P"` | PG&E baseline zone (affects E-1 / E-TOU-C tier break). |
| `pgeAdviceLetter` | `"7846-E"` | Most recent PG&E tariff filing feeding these rates. |
| `pgeEffectiveDate` | `"2026-03-01"` | Effective date of PG&E rate values. |
| `cceRateSheetDate` | `"2026-02-15"` | Effective date of the 3CE rate sheet used. |
| `pciaVintage` | `"2021"` | Vintage used for Buellton's PCIA exit fee. |
| `pciaRate` | `0.05264` | $/kWh PCIA added to CCA generation customers. |
| `franchiseFeeRate` | `0.00048` | $/kWh franchise fee added to CCA generation customers. |
| `holidays` | 8 entries | Names of PG&E-observed holidays. **Only EV-B uses holidays** (weekend schedule applies). |
| `notes` | array | Invariants, CCA-specific caveats, and schema notes. |

---

## `ratePlans` — six plans

| Plan ID | Name | Category | Metering | TOU? |
|---|---|---|---|---|
| `EV2-A` | Home Charging EV2-A | EV Rate | Whole-house | Yes (3 periods) |
| `E-ELEC` | Electric Home Rate Plan | EV Rate | Whole-house | Yes (3 periods) |
| `EV-B` | EV Rate B (Separately Metered) | EV Rate | 2nd meter | Yes (3 periods, weekday/weekend split) |
| `E-TOU-C` | TOU Peak 4–9pm Every Day | Residential TOU | Whole-house | Yes (2 periods) |
| `E-TOU-D` | TOU Peak 5–8pm Weekdays | Residential TOU | Whole-house | Yes (2 periods) |
| `E-1` | Residential Tiered Rate | Tiered (Non-TOU) | Whole-house | **No** — tiered |

### Shared per-plan keys

```jsonc
{
  "name":            "Home Charging EV2-A",
  "selectorLabel":   "EV2-A — Home Charging (Standard EV)",
  "scheduleCode":    "EV2",
  "rateDesignation": "EV2-A",
  "category":        "EV Rate",
  "status":          "active",
  "description":     "…",
  "eligibility":     "…",
  "meteringScope":   "wholeHouse" | "separatelyMeteredEV",
  "seasons":         { /* see below, null for E-1 */ },
  "touPeriods":      { /* see below, null for E-1 */ },
  "rates":           { /* see below */ }
}
```

### `seasons`

Month ranges are **plan-specific**. Always read these values; never hardcode.

```jsonc
"seasons": {
  "summer": { "startMonth": 6, "endMonth": 9,  "label": "June – September" },
  "winter": { "startMonth": 10,"endMonth": 5,  "label": "October – May"    }
}
```

- **EV2-A, E-ELEC, E-TOU-C, E-TOU-D** → summer = June–September
- **EV-B** → summer = **May–October** (wider window; easy to get wrong)
- **E-1** → `seasons: null` (no seasonal split)

### `touPeriods`

Per-season map of period → window(s). A period's value can be a single object or an **array** when the period has multiple windows (e.g. EV2-A part-peak, EV-B weekday/weekend peak).

```jsonc
"touPeriods": {
  "summer": {
    "peak":     { "start": "16:00", "end": "21:00", "days": "all",                  "label": "4pm–9pm every day" },
    "partPeak": [
      { "start": "15:00", "end": "16:00", "days": "all", "label": "3pm–4pm every day" },
      { "start": "21:00", "end": "00:00", "days": "all", "label": "9pm–midnight every day" }
    ],
    "offPeak":  { "label": "All other hours (midnight–3pm)" }
  },
  "winter": { /* same shape */ }
}
```

`days` values seen in the data: `"all"`, `"weekdays"`, `"weekdaysExceptHolidays"`, `"weekendsAndHolidays"`. **Holidays affect EV-B only.** `E-1.touPeriods = null`.

**Per-plan period count:**

| Plan | Periods | Notes |
|---|---|---|
| EV2-A, E-ELEC | peak / partPeak / offPeak | Part-peak has **two** windows: 3–4pm and 9pm–midnight. |
| EV-B | peak / partPeak / offPeak | Peak and part-peak differ weekday vs weekend/holidays. |
| E-TOU-C | peak / offPeak | Peak 4–9pm every day. Baseline credit applies (not in rate cells). |
| E-TOU-D | peak / offPeak | Peak 5–8pm Mon–Fri (excl. holidays). |
| E-1 | — | Tiered, 24/7 same rate within tier. |

---

## `rates` — the money

All values are `$/kWh` unless noted. Four sub-objects per plan:

```jsonc
"rates": {
  "delivery":       { /* PG&E wires charge */ },
  "generation":     { /* PG&E's own generation (for bundled customers) */ },
  "totalBundled":   { /* delivery + generation (for bundled customers) */ },
  "ccaGeneration":  { /* CCA generation rates, keyed by CCA slug */ }
}
```

**Invariant:** `delivery + generation = totalBundled` (±0.00001). This separation prevents double-counting CCA rates — the v1 bug.

### Shape for TOU plans (EV2-A, E-ELEC, EV-B, E-TOU-C, E-TOU-D)

Each of `delivery`, `generation`, `totalBundled` is:

```jsonc
"delivery": {
  "summer": { "peak": 0.34979, "partPeak": 0.28401, "offPeak": 0.12313 },
  "winter": { "peak": 0.27956, "partPeak": 0.27534, "offPeak": 0.13012 }
}
```

Keys inside each season match the plan's period list (`peak`/`offPeak` for 2-period plans, plus `partPeak` for 3-period plans).

### Shape for E-1 (tiered, no TOU)

```jsonc
"delivery": {
  "tier1": 0.19706,
  "tier2": 0.27847,
  "note":  "Tier 1 = 0–100% of baseline. Tier 2 = 101–400%+ of baseline."
},
"generation": {
  "allUsage": 0.12855
},
"totalBundled": {
  "tier1": 0.32561,
  "tier2": 0.40702,
  "note":  "Tier 2 applies to usage from 101% to over 400% of baseline."
}
```

### `ccaGeneration` — CCA provider rates

Each plan has a `ccaGeneration` map keyed by CCA slug. Each CCA has a `name`, a `defaultTier`, and a `tiers` map. A tier holds the generation rates in the same shape as `generation` above (TOU seasons+periods, or `allUsage` for E-1). Non-TOU CCAs (Pioneer, KCCP) use a flat number — see notes.

```jsonc
"ccaGeneration": {
  "3ce": {
    "name": "Central Coast Community Energy",
    "defaultTier": "3cchoice",
    "tiers": {
      "3cchoice": { /* TOU rates same shape as generation */ },
      "3cprime":  { /* 100% renewable premium tier */  }
    }
  }
}
```

**CCA roster (slug → name, default tier, premium tier):**

| Slug | Name | Default | Premium (100% renew.) |
|---|---|---|---|
| `3ce` | Central Coast Community Energy | 3Cchoice | 3Cprime |
| `sjce` | San José Clean Energy | GreenSource | TotalGreen |
| `pce` | Peninsula Clean Energy | ECOplus | ECO100 |
| `scp` | Sonoma Clean Power | CleanStart | EverGreen |
| `ava` | Ava Community Energy (EBCE) | Bright Choice | Renewable 100 |
| `svce` | Silicon Valley Clean Energy | GreenStart | GreenPrime |
| `mce` | MCE Clean Energy | Light Green | Deep Green |
| `rcea` | Redwood Coast Energy Authority | REpower | REpower+ |
| `vce` | Valley Clean Energy | StandardGreen | UltraGreen |
| `pioneer` | Pioneer Community Energy | Placer | General |
| `cpsf` | CleanPowerSF | Green | SuperGreen |
| `kccp` | King City Community Power | — | — |

**CCA caveats (read these before using CCA rates):**

- **Ava**: rates embed System Fees ($0.05115/kWh). **Do not add PCIA/FF on top.**
- **Pioneer**: blended flat rates — same value for every period/season.
- **KCCP**: blended flat rates; only appears on `E-1` and `E-TOU-C`.
- **SVCE**: uses TOU-specific April 2025 table (not the 2026 blended table).
- **RCEA EV-B**: sourced from now-eliminated EV-A schedule; EV-B is the successor.
- **EV-B CCAs**: `pioneer` and `kccp` are not listed on EV-B.
- **Applying PCIA + FF**: PG&E bills `pciaRate` + `franchiseFeeRate` on top of CCA generation as separate per-kWh charges (except for Ava — see above).

---

## Plan quirks (common gotchas)

- **EV2-A / E-ELEC** — Part-peak is **two disjoint windows**: 3–4pm AND 9pm–midnight. Walk each period when calculating cost across a charging session.
- **EV-B** — Summer = **May–October** (wider than other plans). Weekday and weekend/holiday schedules differ. Holidays use the weekend schedule. Adds a `fixedCharges.meterCharge` of $0.04928/meter/day (show in UI footer, not in per-kWh display). BSC does not apply.
- **E-TOU-C, E-TOU-D** — Two periods only, no part-peak. E-TOU-C has a baseline credit applied externally (not embedded in rate cells).
- **E-1** — Tiered, 24/7. Tier 2 in `totalBundled` collapses the old 101–400% and over-400% tiers.
- **Base Services Charge** ($0.79/day, income tier 3 Buellton) — footnote only, not in per-kWh math.
- **PCIA vintage** — Buellton = 2021 → `pciaRate: 0.05264`.
- **EV-A** — eliminated 2025-11-30. EV-B is the correct separately-metered plan.

---

## Total rate math

**Bundled customer (PG&E generation):**
```
rate = rates.delivery[season][period] + rates.generation[season][period]
     = rates.totalBundled[season][period]
```

**CCA customer (e.g. 3CE 3Cchoice):**
```
rate = rates.delivery[season][period]
     + rates.ccaGeneration["3ce"].tiers["3cchoice"][season][period]
     + _metadata.pciaRate
     + _metadata.franchiseFeeRate
```
*(Skip PCIA + FF for Ava — already embedded.)*

Multi-hour charging spans multiple periods. Walk each period individually; do not average.

---

## Updating PG&E rates

When PG&E or 3CE publish new tariffs, **`pge_source/` is the source of truth** and `ratePlans.json` is the derived artifact. Validate every changed cell against the PDFs in `pge_source/` before committing, then bump `_metadata.pgeAdviceLetter`, `pgeEffectiveDate`, and/or `cceRateSheetDate` to match. The `delivery + generation = totalBundled` invariant must hold.
