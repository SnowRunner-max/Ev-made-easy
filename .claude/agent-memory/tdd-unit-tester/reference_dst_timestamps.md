---
name: DST boundary UTC timestamps for Pacific Time tests
description: Canonical UTC Date strings for DST fall-back (Nov 1 2026) and spring-forward (Mar 8 2026) boundary tests
type: reference
---

Both DST boundary dates in 2026 fall on Sunday.

**Fall-back (Nov 1 2026):** Clocks fall back at 2 AM PDT → 1 AM PST.
- `new Date('2026-11-01T09:00:00Z')` = 1 AM PST (UTC-8) — first hour of standard time
- Nov 1 is month 11 in Pacific Time → EV-B winter (summer = May–Oct), EV2-A winter

**Spring-forward (Mar 8 2026):** Clocks spring forward at 2 AM PST → 3 AM PDT.
- `new Date('2026-03-08T10:00:00Z')` = 3 AM PDT (UTC-7) — first hour of daylight saving time
- Mar 8 is month 3 in Pacific Time → EV-B winter, EV2-A winter

**Why these timestamps matter:** Using `new Date('2026-11-01T01:00:00-08:00')` vs UTC can differ by an hour during the ambiguous clock period. UTC-anchored timestamps are unambiguous.
