import { describe, it, expect } from 'vitest';
import ratesData from '../data/rates.json';
import {
  getCurrentPeriod,
  getSeason,
  isHoliday,
  getRate,
  getNextRateChange,
  getDaySchedule,
} from './rateEngine';

// All times are given as ISO strings with explicit UTC offset for Pacific Time.
// PDT (daylight saving, UTC-7): Mar 8 – Nov 1 2026, e.g. 2026-07-15T02:00:00-07:00
// PST (standard time, UTC-8):   Nov 1 – Mar 8 2026, e.g. 2026-01-15T02:00:00-08:00
// NOTE: March 15 2026 is AFTER the DST switch (Mar 8), so it uses PDT (-07:00).
//       January and February dates use PST (-08:00).

describe('getCurrentPeriod', () => {
  it('returns offPeak for 2:00 AM (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T02:00:00-08:00'))).toBe('offPeak');
  });

  it('returns offPeak for 2:59 PM (14:59, January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T14:59:00-08:00'))).toBe('offPeak');
  });

  it('returns offPeak for exactly midnight (0:00, January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T00:00:00-08:00'))).toBe('offPeak');
  });

  it('returns partPeak for 3:00 PM — start of first window (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T15:00:00-08:00'))).toBe('partPeak');
  });

  it('returns partPeak for 3:59 PM — end of first window (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T15:59:00-08:00'))).toBe('partPeak');
  });

  it('returns peak for 4:00 PM — start of peak (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T16:00:00-08:00'))).toBe('peak');
  });

  it('returns peak for 6:00 PM (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T18:00:00-08:00'))).toBe('peak');
  });

  it('returns peak for 8:59 PM — last minute of peak (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T20:59:00-08:00'))).toBe('peak');
  });

  it('returns partPeak for 9:00 PM — start of second window (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T21:00:00-08:00'))).toBe('partPeak');
  });

  it('returns partPeak for 11:59 PM (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T23:59:00-08:00'))).toBe('partPeak');
  });

  it('returns peak for 6:00 PM (summer, PDT) — same period regardless of season', () => {
    expect(getCurrentPeriod(new Date('2026-07-15T18:00:00-07:00'))).toBe('peak');
  });
});

describe('getSeason', () => {
  it('returns winter for January', () => {
    expect(getSeason(new Date('2026-01-15T12:00:00-08:00'))).toBe('winter');
  });

  it('returns winter for May 31', () => {
    expect(getSeason(new Date('2026-05-31T12:00:00-07:00'))).toBe('winter');
  });

  it('returns summer for June 1', () => {
    expect(getSeason(new Date('2026-06-01T12:00:00-07:00'))).toBe('summer');
  });

  it('returns summer for August', () => {
    expect(getSeason(new Date('2026-08-15T12:00:00-07:00'))).toBe('summer');
  });

  it('returns summer for September 30', () => {
    expect(getSeason(new Date('2026-09-30T12:00:00-07:00'))).toBe('summer');
  });

  it('returns winter for October 1', () => {
    expect(getSeason(new Date('2026-10-01T12:00:00-07:00'))).toBe('winter');
  });

  it('returns winter for December', () => {
    expect(getSeason(new Date('2026-12-15T12:00:00-08:00'))).toBe('winter');
  });
});

describe('isHoliday', () => {
  it('returns true for New Year\'s Day 2026', () => {
    expect(isHoliday(new Date('2026-01-01T12:00:00-08:00'))).toBe(true);
  });

  it('returns true for Thanksgiving 2026', () => {
    expect(isHoliday(new Date('2026-11-26T12:00:00-08:00'))).toBe(true);
  });

  it('returns true for Christmas 2026', () => {
    expect(isHoliday(new Date('2026-12-25T12:00:00-08:00'))).toBe(true);
  });

  it('returns false for a regular weekday', () => {
    expect(isHoliday(new Date('2026-03-22T12:00:00-07:00'))).toBe(false);
  });

  it('returns false for July 4 (Saturday — actual date, not observed)', () => {
    expect(isHoliday(new Date('2026-07-04T12:00:00-07:00'))).toBe(false);
  });

  it('returns true for July 3 (observed Independence Day)', () => {
    expect(isHoliday(new Date('2026-07-03T12:00:00-07:00'))).toBe(true);
  });
});

describe('getRate', () => {
  it('returns correct combined rate for winter off-peak', () => {
    const result = getRate(new Date('2026-01-15T02:00:00-08:00'));
    expect(result.rate).toBeCloseTo(0.22261, 4);
    expect(result.period).toBe('offPeak');
    expect(result.season).toBe('winter');
  });

  it('returns correct combined rate for summer peak', () => {
    const result = getRate(new Date('2026-07-15T17:00:00-07:00'));
    expect(result.rate).toBeCloseTo(0.53420, 4);
    expect(result.period).toBe('peak');
    expect(result.season).toBe('summer');
  });

  it('returns correct combined rate for winter part-peak (first window, 3 PM)', () => {
    const result = getRate(new Date('2026-01-15T15:00:00-08:00'));
    expect(result.rate).toBeCloseTo(0.39108, 4);
    expect(result.period).toBe('partPeak');
  });

  it('returns correct combined rate for winter part-peak (second window, 10 PM)', () => {
    const result = getRate(new Date('2026-01-15T22:00:00-08:00'));
    expect(result.rate).toBeCloseTo(0.39108, 4);
    expect(result.period).toBe('partPeak');
  });

  it('returns correct combined rate for winter peak', () => {
    const result = getRate(new Date('2026-01-15T17:00:00-08:00'));
    expect(result.rate).toBeCloseTo(0.40766, 4);
    expect(result.period).toBe('peak');
    expect(result.season).toBe('winter');
  });

  it('returns generation and delivery components', () => {
    const result = getRate(new Date('2026-01-15T02:00:00-08:00')); // winter off-peak
    expect(result.generation).toBeCloseTo(0.09249, 4);
    expect(result.delivery).toBeCloseTo(0.13012, 4);
  });

  it('returns periodLabel and colorScheme', () => {
    const peak = getRate(new Date('2026-01-15T17:00:00-08:00'));
    expect(peak.periodLabel).toBe('Peak');
    expect(peak.colorScheme).toBe('red');

    const offPeak = getRate(new Date('2026-01-15T02:00:00-08:00'));
    expect(offPeak.periodLabel).toBe('Off-Peak');
    expect(offPeak.colorScheme).toBe('emerald');

    const partPeak = getRate(new Date('2026-01-15T15:00:00-08:00'));
    expect(partPeak.periodLabel).toBe('Part-Peak');
    expect(partPeak.colorScheme).toBe('amber');
  });
});

// Helper to extract Pacific hour from a Date for assertions
function getPacificHourForTest(date) {
  const h = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
    }).format(date)
  );
  return h === 24 ? 0 : h;
}

describe('getNextRateChange', () => {
  it('from 1:00 AM → next change at 3:00 PM same day (offPeak → partPeak)', () => {
    const now = new Date('2026-01-15T01:00:00-08:00');
    const result = getNextRateChange(now);
    expect(result.newPeriod).toBe('partPeak');
    expect(getPacificHourForTest(result.time)).toBe(15);
  });

  it('from 3:30 PM → next change at 4:00 PM (partPeak → peak)', () => {
    const now = new Date('2026-01-15T15:30:00-08:00');
    const result = getNextRateChange(now);
    expect(result.newPeriod).toBe('peak');
    expect(getPacificHourForTest(result.time)).toBe(16);
  });

  it('from 5:00 PM → next change at 9:00 PM (peak → partPeak)', () => {
    const now = new Date('2026-01-15T17:00:00-08:00');
    const result = getNextRateChange(now);
    expect(result.newPeriod).toBe('partPeak');
    expect(getPacificHourForTest(result.time)).toBe(21);
  });

  it('from 10:00 PM → next change at midnight (partPeak → offPeak)', () => {
    const now = new Date('2026-01-15T22:00:00-08:00');
    const result = getNextRateChange(now);
    expect(result.newPeriod).toBe('offPeak');
    expect(getPacificHourForTest(result.time)).toBe(0);
  });

  it('result.time is in the future relative to input', () => {
    const now = new Date('2026-01-15T10:00:00-08:00');
    const result = getNextRateChange(now);
    expect(result.time.getTime()).toBeGreaterThan(now.getTime());
  });

  it('result.newRate matches the expected rate for the new period', () => {
    const now = new Date('2026-01-15T01:00:00-08:00'); // off-peak, next is partPeak
    const result = getNextRateChange(now);
    expect(result.newRate).toBeCloseTo(0.39108, 4); // winter part-peak
  });
});

describe('getDaySchedule', () => {
  it('returns exactly 4 blocks', () => {
    expect(getDaySchedule(new Date('2026-01-15T12:00:00-08:00'))).toHaveLength(4);
  });

  it('returns blocks in correct order: offPeak, partPeak, peak, partPeak', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'));
    expect(blocks[0].period).toBe('offPeak');
    expect(blocks[1].period).toBe('partPeak');
    expect(blocks[2].period).toBe('peak');
    expect(blocks[3].period).toBe('partPeak');
  });

  it('returns correct startHour/endHour boundaries', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'));
    expect(blocks[0]).toMatchObject({ startHour: 0,  endHour: 15 });
    expect(blocks[1]).toMatchObject({ startHour: 15, endHour: 16 });
    expect(blocks[2]).toMatchObject({ startHour: 16, endHour: 21 });
    expect(blocks[3]).toMatchObject({ startHour: 21, endHour: 24 });
  });

  it('returns winter rates for a winter date', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'));
    const peakBlock = blocks.find(b => b.period === 'peak');
    expect(peakBlock.rate).toBeCloseTo(0.40766, 4);
  });

  it('returns summer rates for a summer date', () => {
    const blocks = getDaySchedule(new Date('2026-07-15T12:00:00-07:00'));
    const peakBlock = blocks.find(b => b.period === 'peak');
    expect(peakBlock.rate).toBeCloseTo(0.53420, 4);
  });

  it('each block includes periodLabel and colorScheme', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'));
    expect(blocks[2]).toMatchObject({ periodLabel: 'Peak', colorScheme: 'red' });
    expect(blocks[0]).toMatchObject({ periodLabel: 'Off-Peak', colorScheme: 'emerald' });
  });

  it('each block includes generation and delivery components', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'));
    const offPeakBlock = blocks[0];
    expect(offPeakBlock.generation).toBeCloseTo(0.09249, 4);
    expect(offPeakBlock.delivery).toBeCloseTo(0.13012, 4);
  });
});

describe('Bill validation (Nov 2025 statement — winter rates)', () => {
  const { usage, cceLineItems, pgeLineItems, billedAmounts } = ratesData.billValidation;

  it('November is correctly identified as winter season', () => {
    expect(getSeason(new Date('2025-11-01T12:00:00-08:00'))).toBe('winter');
  });

  it('October (start of billing period) is correctly identified as winter', () => {
    expect(getSeason(new Date('2025-10-07T12:00:00-07:00'))).toBe('winter');
  });

  it('3CE peak charge reproduces billed amount within $0.02', () => {
    expect(usage.peak * cceLineItems.peak).toBeCloseTo(billedAmounts.cce.peak, 1);
  });

  it('3CE part-peak charge reproduces billed amount within $0.02', () => {
    expect(usage.partPeak * cceLineItems.partPeak).toBeCloseTo(billedAmounts.cce.partPeak, 1);
  });

  it('3CE off-peak charge reproduces billed amount within $0.02', () => {
    expect(usage.offPeak * cceLineItems.offPeak).toBeCloseTo(billedAmounts.cce.offPeak, 1);
  });

  it('3CE total generation charge reproduces billed total within $0.02', () => {
    const total =
      usage.peak * cceLineItems.peak +
      usage.partPeak * cceLineItems.partPeak +
      usage.offPeak * cceLineItems.offPeak;
    expect(total).toBeCloseTo(billedAmounts.cce.total, 1);
  });

  it('PG&E peak charge reproduces billed amount within $0.02', () => {
    expect(usage.peak * pgeLineItems.peak).toBeCloseTo(billedAmounts.pge.peak, 1);
  });

  it('PG&E part-peak charge reproduces billed amount within $0.02', () => {
    expect(usage.partPeak * pgeLineItems.partPeak).toBeCloseTo(billedAmounts.pge.partPeak, 1);
  });

  it('PG&E off-peak charge reproduces billed amount within $0.02', () => {
    expect(usage.offPeak * pgeLineItems.offPeak).toBeCloseTo(billedAmounts.pge.offPeak, 1);
  });

  it('current winter rates maintain correct ordering: peak > partPeak > offPeak', () => {
    const { peak, partPeak, offPeak } = ratesData.rates.winter;
    expect(peak.combined).toBeGreaterThan(partPeak.combined);
    expect(partPeak.combined).toBeGreaterThan(offPeak.combined);
  });

  it('current 3CE winter generation rates maintain correct ordering', () => {
    const { peak, partPeak, offPeak } = ratesData.rates.winter;
    expect(peak.generation).toBeGreaterThan(partPeak.generation);
    expect(partPeak.generation).toBeGreaterThan(offPeak.generation);
  });

  it('total cost using current winter rates falls in expected range for 275 kWh', () => {
    const { peak, partPeak, offPeak } = ratesData.rates.winter;
    const estimatedTotal =
      usage.peak * peak.combined +
      usage.partPeak * partPeak.combined +
      usage.offPeak * offPeak.combined;
    // ~275 kWh at current winter rates should land between $50–$100
    expect(estimatedTotal).toBeGreaterThan(50);
    expect(estimatedTotal).toBeLessThan(100);
  });
});
