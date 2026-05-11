---
name: EV2-A summer peak delivery/generation split
description: EV2-A summer peak has delivery=0.34979 (65%), generation=0.18830 (35%), totalBundled=0.53809
type: reference
---

EV2-A summer peak rates (from ratePlans.json, PG&E Advice Letter 7846-E, eff. March 1 2026):
- delivery = 0.34979
- generation = 0.18830
- totalBundled = 0.53809
- delivPct = Math.round(0.34979 / 0.53809 * 100) = 65
- genPct = 35

EV2-A winter offPeak rates:
- delivery = 0.13012
- generation = 0.09546
- totalBundled = 0.22558
- delivPct = Math.round(0.13012 / 0.22558 * 100) = 58
- genPct = 42

Note: An early draft of the DonutChart test incorrectly used delivery=0.16315 for summer peak — that was wrong. Always verify against ratePlans.json.
