# SCE Residential Rate Data — Research Summary

**Researched:** 2026-04-10  
**Sources:** SCE website (sce.com), SCE/CPA joint rate comparison page, solar.com 2026 TOU guide

---

## ⚠️ Important Notes Before Using This Data

1. **Delivery/generation split is ESTIMATED** — the per-period delivery/generation split below was computed by applying the weighted-average delivery fraction from the SCE/CPA joint rate comparison page to each period's total bundled rate. The authoritative split is in SCE tariff PDFs (not publicly parseable). Validate every split against the actual tariff before merging.

2. **EV-2 plan status unknown** — Multiple sources confirm TOU-D-PRIME is SCE's current EV rate for residential customers. No current residential "EV-2" separate-meter rate schedule was found on SCE's public web pages. SCE does offer a submeter billing option under TOU-D-PRIME (with an EV Meter Credit). **Do not implement EV-2 until its existence as a current tariff is confirmed against a tariff PDF.**

3. **TOU-D-4-9PM has 3 periods in winter** — contrary to the implementation plan's description of "peak/off-peak only," SCE's website shows TOU-D-4-9PM has a Super Off-Peak period in winter (midnight–8 AM). Summer remains 2-period (peak + off-peak). The `superOffPeak` period engine extension is therefore needed for BOTH plans, not just TOU-D-PRIME.

4. **CPA rates are blended averages** — the CPA generation rates below are plan-level weighted averages from the SCE/CPA joint rate comparison. They are NOT per-period TOU rates. CPA may charge flat generation rates (same $/kWh regardless of peak period). Verify against CPA's TOU rate sheet before use.

5. **Baseline credit not embedded** — TOU-D-4-9PM includes a ~$0.10/kWh baseline credit on off-peak usage up to the monthly baseline allowance. Rates below are PRE-credit (gross). TOU-D-PRIME has NO baseline credit.

---

## TOU-D-4-9PM — Total Bundled Rates (SCE, 2026)

Source: https://www.sce.com/save-money/rates-financing/residential-rate-plans/time-of-use-plans  
Source: https://www.solar.com/learn/sce-time-of-use-tou-rates-a-beginners-guide/

**Season:** Summer = June–September, Winter = October–May  
**Peak window:** 4:00 PM – 9:00 PM  
**Super off-peak (winter only):** midnight – 8:00 AM (estimated from site description)

| Season | Period | Total Bundled | Est. Delivery | Est. Generation | Notes |
|--------|--------|--------------|---------------|-----------------|-------|
| Summer | Peak (4–9 PM) | $0.5800 | $0.3991 | $0.1809 | Est. split: 68.8%/31.2% |
| Summer | Off-Peak | $0.3400 | $0.2339 | $0.1061 | Pre-baseline-credit |
| Winter | Mid-Peak (4–9 PM) | $0.5100 | $0.3509 | $0.1591 | Est. split |
| Winter | Off-Peak (8 AM–4 PM, 9 PM–midnight) | $0.3700 | $0.2546 | $0.1154 | Pre-baseline-credit |
| Winter | Super Off-Peak (midnight–8 AM) | $0.3300 | $0.2270 | $0.1030 | Pre-baseline-credit |

**Weighted avg (from SCE/CPA comparison, Jan 2026):**  
- SCE delivery: $0.25761/kWh · SCE generation: $0.11654/kWh · Total: $0.37415/kWh  
Source: https://www.sce.com/customer-service-center/community-choice-aggregation/sce-cpa-joint-rate-comparisons

---

## TOU-D-PRIME — Total Bundled Rates (SCE, 2026)

Source: https://www.sce.com/save-money/rates-financing/electric-vehicle-plan  
Source: https://www.solar.com/learn/sce-time-of-use-tou-rates-a-beginners-guide/

**Peak window:** 4:00 PM – 9:00 PM, all days both seasons  
**Super off-peak:** Summer midnight–6 AM (all days), Winter midnight–9 AM (weekdays) — from plan spec, UNVERIFIED against tariff PDF  
**Daily base charge:** $0.79/day (no baseline credit)

| Season | Period | Total Bundled | Est. Delivery | Est. Generation | Notes |
|--------|--------|--------------|---------------|-----------------|-------|
| Summer | Peak (4–9 PM, weekdays) | $0.5900 | $0.4143 | $0.1757 | Est. split: 70.2%/29.8% |
| Summer | Mid-Peak (4–9 PM, weekends) | $0.4000 | $0.2808 | $0.1192 | Weekday/weekend rate differs |
| Summer | Off-Peak | $0.2600 | $0.1825 | $0.0775 | |
| Winter | Mid-Peak (4–9 PM) | $0.5600 | $0.3931 | $0.1669 | |
| Winter | Super Off-Peak (midnight–9 AM weekdays) | $0.2400 | $0.1685 | $0.0715 | |
| Winter | Off-Peak | $0.2400 | $0.1685 | $0.0715 | Same as super off-peak |

**Weighted avg (from SCE/CPA comparison, Jan 2026):**  
- SCE delivery: $0.27348/kWh · SCE generation: $0.11586/kWh · Total: $0.38934/kWh  
Source: https://www.sce.com/customer-service-center/community-choice-aggregation/sce-cpa-joint-rate-comparisons

---

## EV-2 — Status: UNCONFIRMED / LIKELY DEPRECATED

No current residential EV-2 tariff schedule was found on SCE's public website. SCE's residential EV rate offering is TOU-D-PRIME. A submeter billing option exists under TOU-D-PRIME with an EV Meter Credit. **Do not build EV-2 data without tariff PDF confirmation.**

---

## Clean Power Alliance (CPA) Generation Rates

Source: https://www.sce.com/customer-service-center/community-choice-aggregation/sce-cpa-joint-rate-comparisons  
**Effective:** January 1, 2026 (SCE rates); February 1, 2026 (CPA rates)

**⚠️ These are BLENDED AVERAGES across a typical usage profile, not per-period TOU rates.**  
Surcharges (PCIA equivalent): $0.02433/kWh applied to CPA customers on top of delivery + generation.

### TOU-D-4-9PM (monthly usage 522 kWh profile)
| Tier | Generation Rate | Surcharges | Notes |
|------|----------------|------------|-------|
| Lean Power | $0.08958 | $0.02433 | ~38.4% renewable |
| Clean Power | $0.09709 | $0.02433 | ~50%+ renewable |
| 100% Green | $0.11961 | $0.02433 | 100% renewable |

### TOU-D-PRIME (monthly usage 522 kWh profile)
| Tier | Generation Rate | Surcharges | Notes |
|------|----------------|------------|-------|
| Lean Power | $0.08882 | $0.02433 | |
| Clean Power | $0.09658 | $0.02433 | |
| 100% Green | $0.11985 | $0.02433 | |

---

## 3CE Rates for SCE Territory

Source URL found: https://3cenergy.org/wp-content/uploads/2025/04/Residential-SCE-Website-Rate-Sheet-v2-2025.04.01.pdf  
**Effective:** April 1, 2025  
**Status:** PDF not parseable — rates not extracted. Must be read manually.  
3CE serves SCE territory in Santa Barbara County (Carpinteria, Goleta, Montecito, Summerland).

---

## What Still Needs Verification Against Tariff PDFs

- [ ] Per-period delivery/generation split for all plans
- [ ] Super off-peak window exact hours for TOU-D-4-9PM winter (confirmed ≈ midnight–8 AM but not from tariff)
- [ ] TOU-D-PRIME super off-peak hours (midnight–6 AM summer, midnight–9 AM winter — from plan spec only)
- [ ] EV-2 existence as a current tariff
- [ ] CPA TOU-differentiated generation rates (vs flat/blended)
- [ ] 3CE rates for SCE territory (PDF needed)
- [ ] SCE advice letter number and exact effective date for current rates
