import { describe, it, expect } from 'vitest';
import ratesData from '../data/rates.json';
import ratePlans from '../data/ratePlans.json';
import {
  getCurrentPeriod,
  getSeason,
  isHoliday,
  getRate,
  getNextRateChange,
  getDaySchedule,
} from './rateEngine';

// All times use explicit UTC offset for Pacific Time.
// PDT (UTC-7): Mar 8 – Nov 1 2026   PST (UTC-8): Nov 1 – Mar 8 2026
// Jan 15 = winter Wednesday; Jan 6 = winter Tuesday; Jan 10 = winter Saturday
// Jan 1 = New Year's Day (holiday Thursday)

const ev2aConfig  = ratePlans.ratePlans['EV2-A'];
const eelecConfig = ratePlans.ratePlans['E-ELEC'];
const evbConfig   = ratePlans.ratePlans['EV-B'];
const etoucConfig = ratePlans.ratePlans['E-TOU-C'];
const etoudConfig = ratePlans.ratePlans['E-TOU-D'];
const e1Config    = ratePlans.ratePlans['E-1'];

// Helper to get Pacific hour from a Date
function pacificHour(date) {
  const h = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false,
  }).format(date));
  return h === 24 ? 0 : h;
}

// ── getCurrentPeriod ──────────────────────────────────────────────────────────

describe('getCurrentPeriod — EV2-A (peak 4–9 PM, part-peak 3–4 PM & 9 PM–midnight)', () => {
  it('offPeak at 2 AM', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T02:00:00-08:00'), ev2aConfig)).toBe('offPeak');
  });
  it('partPeak at 3 PM (first window)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T15:00:00-08:00'), ev2aConfig)).toBe('partPeak');
  });
  it('peak at 4 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T16:00:00-08:00'), ev2aConfig)).toBe('peak');
  });
  it('partPeak at 9 PM (second window)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T21:00:00-08:00'), ev2aConfig)).toBe('partPeak');
  });
  it('same windows in summer', () => {
    expect(getCurrentPeriod(new Date('2026-07-15T18:00:00-07:00'), ev2aConfig)).toBe('peak');
  });
});

describe('getCurrentPeriod — EV-B weekday (Tuesday Jan 6)', () => {
  it('offPeak at midnight', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T00:00:00-08:00'), evbConfig)).toBe('offPeak');
  });
  it('partPeak at 7 AM', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T07:00:00-08:00'), evbConfig)).toBe('partPeak');
  });
  it('peak at 2 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T14:00:00-08:00'), evbConfig)).toBe('peak');
  });
  it('partPeak at 9 PM (evening window)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T21:00:00-08:00'), evbConfig)).toBe('partPeak');
  });
  it('offPeak at 11 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T23:00:00-08:00'), evbConfig)).toBe('offPeak');
  });
});

describe('getCurrentPeriod — EV-B weekend (Saturday Jan 10)', () => {
  it('offPeak before 3 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T14:00:00-08:00'), evbConfig)).toBe('offPeak');
  });
  it('peak at 3 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T15:00:00-08:00'), evbConfig)).toBe('peak');
  });
  it('offPeak at 7 PM (after weekend peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T19:00:00-08:00'), evbConfig)).toBe('offPeak');
  });
});

describe('getCurrentPeriod — EV-B holiday (New Year\'s Day)', () => {
  it('uses weekend/holiday schedule: peak at 3 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-01T15:00:00-08:00'), evbConfig)).toBe('peak');
  });
  it('no part-peak on holidays: offPeak at 9 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-01T21:00:00-08:00'), evbConfig)).toBe('offPeak');
  });
});

describe('getCurrentPeriod — E-TOU-C (peak 4–9 PM every day)', () => {
  it('offPeak at 2 AM', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T02:00:00-08:00'), etoucConfig)).toBe('offPeak');
  });
  it('peak at 4 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T16:00:00-08:00'), etoucConfig)).toBe('peak');
  });
  it('offPeak at 9 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T21:00:00-08:00'), etoucConfig)).toBe('offPeak');
  });
  it('peak on Saturday (no weekend relief)', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T17:00:00-08:00'), etoucConfig)).toBe('peak');
  });
});

describe('getCurrentPeriod — E-TOU-D (peak 5–8 PM weekdays only)', () => {
  it('peak at 5 PM weekday', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T17:00:00-08:00'), etoudConfig)).toBe('peak');
  });
  it('offPeak at 8 PM weekday (after peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T20:00:00-08:00'), etoudConfig)).toBe('offPeak');
  });
  it('offPeak at 6 PM Saturday (no weekend peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T18:00:00-08:00'), etoudConfig)).toBe('offPeak');
  });
});

// ── getSeason ────────────────────────────────────────────────────────────────

describe('getSeason — EV2-A (summer = June–Sep)', () => {
  it('winter for May 31', () => {
    expect(getSeason(new Date('2026-05-31T12:00:00-07:00'), ev2aConfig)).toBe('winter');
  });
  it('summer for June 1', () => {
    expect(getSeason(new Date('2026-06-01T12:00:00-07:00'), ev2aConfig)).toBe('summer');
  });
  it('winter for October 1', () => {
    expect(getSeason(new Date('2026-10-01T12:00:00-07:00'), ev2aConfig)).toBe('winter');
  });
});

describe('getSeason — EV-B (summer = May–Oct)', () => {
  it('summer for May 1 (EV2-A is still winter)', () => {
    const may1 = new Date('2026-05-01T12:00:00-07:00');
    expect(getSeason(may1, evbConfig)).toBe('summer');
    expect(getSeason(may1, ev2aConfig)).toBe('winter');
  });
  it('winter for November 1', () => {
    expect(getSeason(new Date('2026-11-01T12:00:00-08:00'), evbConfig)).toBe('winter');
  });
});

describe('getSeason — E-1 tiered', () => {
  it('returns null (no seasons)', () => {
    expect(getSeason(new Date('2026-01-15T12:00:00-08:00'), e1Config)).toBeNull();
  });
});

// ── isHoliday ────────────────────────────────────────────────────────────────

describe('isHoliday', () => {
  it('true for New Year\'s Day 2026', () => {
    expect(isHoliday(new Date('2026-01-01T12:00:00-08:00'))).toBe(true);
  });
  it('true for observed Independence Day (Jul 3)', () => {
    expect(isHoliday(new Date('2026-07-03T12:00:00-07:00'))).toBe(true);
  });
  it('false for Jul 4 (actual Saturday — not observed)', () => {
    expect(isHoliday(new Date('2026-07-04T12:00:00-07:00'))).toBe(false);
  });
  it('false for a regular weekday', () => {
    expect(isHoliday(new Date('2026-03-22T12:00:00-07:00'))).toBe(false);
  });
});

// ── getRate ──────────────────────────────────────────────────────────────────

describe('getRate — EV2-A (provider=bundled)', () => {
  it('winter off-peak rate and season', () => {
    const r = getRate(new Date('2026-01-15T02:00:00-08:00'), ev2aConfig, 'bundled');
    expect(r.rate).toBeCloseTo(0.22558, 4);
    expect(r.period).toBe('offPeak');
    expect(r.season).toBe('winter');
  });
  it('winter peak rate', () => {
    const r = getRate(new Date('2026-01-15T17:00:00-08:00'), ev2aConfig, 'bundled');
    expect(r.rate).toBeCloseTo(0.41099, 4);
    expect(r.period).toBe('peak');
  });
  it('summer peak rate', () => {
    const r = getRate(new Date('2026-07-15T17:00:00-07:00'), ev2aConfig, 'bundled');
    expect(r.rate).toBeCloseTo(0.53809, 4);
    expect(r.season).toBe('summer');
  });
  it('returns pgeDelivery and pgeGeneration components', () => {
    const r = getRate(new Date('2026-01-15T02:00:00-08:00'), ev2aConfig, 'bundled');
    expect(r.delivery).toBeCloseTo(0.13012, 4);
    expect(r.generation).toBeCloseTo(0.09546, 4);
  });
  it('returns periodLabel and colorScheme', () => {
    const peak = getRate(new Date('2026-01-15T17:00:00-08:00'), ev2aConfig, 'bundled');
    expect(peak.periodLabel).toBe('Peak');
    expect(peak.colorScheme).toBe('red');
    const offPeak = getRate(new Date('2026-01-15T02:00:00-08:00'), ev2aConfig, 'bundled');
    expect(offPeak.colorScheme).toBe('emerald');
  });
});

describe('getRate — E-ELEC (provider=bundled)', () => {
  it('winter off-peak rate', () => {
    const r = getRate(new Date('2026-01-15T02:00:00-08:00'), eelecConfig, 'bundled');
    expect(r.rate).toBeCloseTo(0.28468, 4);
  });
  it('summer peak rate', () => {
    const r = getRate(new Date('2026-07-15T17:00:00-07:00'), eelecConfig, 'bundled');
    expect(r.rate).toBeCloseTo(0.55214, 4);
  });
});

describe('getRate — EV-B (provider=bundled)', () => {
  it('winter weekday peak (Tuesday 2 PM)', () => {
    const r = getRate(new Date('2026-01-06T14:00:00-08:00'), evbConfig, 'bundled');
    expect(r.rate).toBeCloseTo(0.43878, 4);
    expect(r.period).toBe('peak');
  });
  it('winter weekday off-peak (3 AM)', () => {
    const r = getRate(new Date('2026-01-06T03:00:00-08:00'), evbConfig, 'bundled');
    expect(r.rate).toBeCloseTo(0.23504, 4);
  });
  it('summer weekday peak (May 5 Tuesday 3 PM)', () => {
    const r = getRate(new Date('2026-05-05T15:00:00-07:00'), evbConfig, 'bundled');
    expect(r.rate).toBeCloseTo(0.62131, 4);
    expect(r.season).toBe('summer');
  });
});

describe('getRate — E-TOU-C (provider=bundled)', () => {
  it('summer peak', () => {
    const r = getRate(new Date('2026-07-15T17:00:00-07:00'), etoucConfig, 'bundled');
    expect(r.rate).toBeCloseTo(0.52240, 4);
  });
  it('winter off-peak', () => {
    const r = getRate(new Date('2026-01-15T02:00:00-08:00'), etoucConfig, 'bundled');
    expect(r.rate).toBeCloseTo(0.36757, 4);
  });
});

describe('getRate — E-1 tiered', () => {
  it('returns null rate and offPeak period', () => {
    const r = getRate(new Date('2026-01-15T17:00:00-08:00'), e1Config);
    expect(r.rate).toBeNull();
    expect(r.period).toBe('offPeak');
    expect(r.season).toBeNull();
  });
});

// ── getNextRateChange ─────────────────────────────────────────────────────────

describe('getNextRateChange — EV2-A (provider=bundled)', () => {
  it('from 1 AM → next at 3 PM (offPeak → partPeak)', () => {
    const r = getNextRateChange(new Date('2026-01-15T01:00:00-08:00'), ev2aConfig, 'bundled');
    expect(r.newPeriod).toBe('partPeak');
    expect(pacificHour(r.time)).toBe(15);
    expect(r.newRate).toBeCloseTo(0.39428, 4);
  });
  it('from 5 PM → next at 9 PM (peak → partPeak)', () => {
    const r = getNextRateChange(new Date('2026-01-15T17:00:00-08:00'), ev2aConfig, 'bundled');
    expect(r.newPeriod).toBe('partPeak');
    expect(pacificHour(r.time)).toBe(21);
  });
  it('result.time is in the future', () => {
    const now = new Date('2026-01-15T10:00:00-08:00');
    expect(getNextRateChange(now, ev2aConfig, 'bundled').time.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe('getNextRateChange — EV-B weekday (provider=bundled)', () => {
  it('from 3 AM → next at 7 AM (offPeak → partPeak)', () => {
    const r = getNextRateChange(new Date('2026-01-06T03:00:00-08:00'), evbConfig, 'bundled');
    expect(r.newPeriod).toBe('partPeak');
    expect(pacificHour(r.time)).toBe(7);
  });
});

describe('getNextRateChange — EV-B weekend (provider=bundled)', () => {
  it('from 10 AM → next at 3 PM (offPeak → peak)', () => {
    const r = getNextRateChange(new Date('2026-01-10T10:00:00-08:00'), evbConfig, 'bundled');
    expect(r.newPeriod).toBe('peak');
    expect(pacificHour(r.time)).toBe(15);
  });
});

describe('getNextRateChange — E-TOU-C (provider=bundled)', () => {
  it('from 1 AM → next at 4 PM (offPeak → peak)', () => {
    const r = getNextRateChange(new Date('2026-01-15T01:00:00-08:00'), etoucConfig, 'bundled');
    expect(r.newPeriod).toBe('peak');
    expect(pacificHour(r.time)).toBe(16);
  });
});

// ── getDaySchedule ────────────────────────────────────────────────────────────

describe('getDaySchedule — EV2-A (provider=bundled)', () => {
  it('returns 4 blocks in correct order', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), ev2aConfig, 'bundled');
    expect(blocks).toHaveLength(4);
    expect(blocks.map(b => b.period)).toEqual(['offPeak', 'partPeak', 'peak', 'partPeak']);
  });
  it('correct boundaries', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), ev2aConfig, 'bundled');
    expect(blocks[0]).toMatchObject({ startHour: 0, endHour: 15 });
    expect(blocks[2]).toMatchObject({ startHour: 16, endHour: 21 });
  });
  it('winter peak rate', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), ev2aConfig, 'bundled');
    expect(blocks.find(b => b.period === 'peak').rate).toBeCloseTo(0.41099, 4);
  });
  it('summer peak rate', () => {
    const blocks = getDaySchedule(new Date('2026-07-15T12:00:00-07:00'), ev2aConfig, 'bundled');
    expect(blocks.find(b => b.period === 'peak').rate).toBeCloseTo(0.53809, 4);
  });
});

describe('getDaySchedule — EV-B weekday (provider=bundled)', () => {
  it('5 blocks: offPeak, partPeak, peak, partPeak, offPeak', () => {
    const blocks = getDaySchedule(new Date('2026-01-06T12:00:00-08:00'), evbConfig, 'bundled');
    expect(blocks).toHaveLength(5);
    expect(blocks.map(b => b.period)).toEqual(['offPeak', 'partPeak', 'peak', 'partPeak', 'offPeak']);
  });
  it('correct peak boundary (2 PM–9 PM)', () => {
    const blocks = getDaySchedule(new Date('2026-01-06T12:00:00-08:00'), evbConfig, 'bundled');
    expect(blocks[2]).toMatchObject({ period: 'peak', startHour: 14, endHour: 21 });
  });
});

describe('getDaySchedule — EV-B weekend (provider=bundled)', () => {
  it('3 blocks: offPeak, peak, offPeak', () => {
    const blocks = getDaySchedule(new Date('2026-01-10T12:00:00-08:00'), evbConfig, 'bundled');
    expect(blocks).toHaveLength(3);
    expect(blocks.map(b => b.period)).toEqual(['offPeak', 'peak', 'offPeak']);
  });
  it('weekend peak boundary (3 PM–7 PM)', () => {
    const blocks = getDaySchedule(new Date('2026-01-10T12:00:00-08:00'), evbConfig, 'bundled');
    expect(blocks[1]).toMatchObject({ startHour: 15, endHour: 19 });
  });
});

describe('getDaySchedule — E-TOU-C (provider=bundled)', () => {
  it('3 blocks: offPeak, peak, offPeak', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), etoucConfig, 'bundled');
    expect(blocks).toHaveLength(3);
    expect(blocks[1]).toMatchObject({ period: 'peak', startHour: 16, endHour: 21 });
  });
  it('weekend identical to weekday (no weekend relief)', () => {
    const wd = getDaySchedule(new Date('2026-01-06T12:00:00-08:00'), etoucConfig, 'bundled');
    const we = getDaySchedule(new Date('2026-01-10T12:00:00-08:00'), etoucConfig, 'bundled');
    expect(wd.map(b => b.period)).toEqual(we.map(b => b.period));
  });
});

describe('getDaySchedule — E-1 tiered', () => {
  it('returns empty array', () => {
    expect(getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), e1Config)).toHaveLength(0);
  });
});

// ── Bill validation (Nov 2025 — uses rates.json, unchanged) ──────────────────

describe('Bill validation (Nov 2025 statement — winter rates)', () => {
  const { usage, cceLineItems, pgeLineItems, billedAmounts } = ratesData.billValidation;

  it('November is winter for EV2-A', () => {
    expect(getSeason(new Date('2025-11-01T12:00:00-08:00'), ev2aConfig)).toBe('winter');
  });

  it('3CE peak charge reproduces billed amount', () => {
    expect(usage.peak * cceLineItems.peak).toBeCloseTo(billedAmounts.cce.peak, 1);
  });

  it('3CE total generation charge reproduces billed total', () => {
    const total =
      usage.peak * cceLineItems.peak +
      usage.partPeak * cceLineItems.partPeak +
      usage.offPeak * cceLineItems.offPeak;
    expect(total).toBeCloseTo(billedAmounts.cce.total, 1);
  });

  it('PG&E peak charge reproduces billed amount', () => {
    expect(usage.peak * pgeLineItems.peak).toBeCloseTo(billedAmounts.pge.peak, 1);
  });

  it('winter rates ordering: peak > partPeak > offPeak', () => {
    const { peak, partPeak, offPeak } = ratesData.rates.winter;
    expect(peak.combined).toBeGreaterThan(partPeak.combined);
    expect(partPeak.combined).toBeGreaterThan(offPeak.combined);
  });
});
