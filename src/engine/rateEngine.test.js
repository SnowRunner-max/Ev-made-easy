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

// All times are given as ISO strings with explicit UTC offset for Pacific Time.
// PDT (daylight saving, UTC-7): Mar 8 – Nov 1 2026, e.g. 2026-07-15T02:00:00-07:00
// PST (standard time, UTC-8):   Nov 1 – Mar 8 2026, e.g. 2026-01-15T02:00:00-08:00
// NOTE: March 15 2026 is AFTER the DST switch (Mar 8), so it uses PDT (-07:00).
//       January and February dates use PST (-08:00).
//
// Day-of-week reference (January 2026):
//   Jan 1 = Thursday, Jan 5 = Monday, Jan 10 = Saturday, Jan 11 = Sunday
//   Jan 6 = Tuesday (non-holiday weekday)

const ev2aConfig = ratePlans.plans['ev2a'];
const eelecConfig = ratePlans.plans['e-elec'];
const evbConfig   = ratePlans.plans['ev-b'];

describe('getCurrentPeriod — EV2-A', () => {
  it('returns offPeak for 2:00 AM (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T02:00:00-08:00'), ev2aConfig)).toBe('offPeak');
  });

  it('returns offPeak for 2:59 PM (14:59, January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T14:59:00-08:00'), ev2aConfig)).toBe('offPeak');
  });

  it('returns offPeak for exactly midnight (0:00, January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T00:00:00-08:00'), ev2aConfig)).toBe('offPeak');
  });

  it('returns partPeak for 3:00 PM — start of first window (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T15:00:00-08:00'), ev2aConfig)).toBe('partPeak');
  });

  it('returns partPeak for 3:59 PM — end of first window (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T15:59:00-08:00'), ev2aConfig)).toBe('partPeak');
  });

  it('returns peak for 4:00 PM — start of peak (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T16:00:00-08:00'), ev2aConfig)).toBe('peak');
  });

  it('returns peak for 6:00 PM (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T18:00:00-08:00'), ev2aConfig)).toBe('peak');
  });

  it('returns peak for 8:59 PM — last minute of peak (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T20:59:00-08:00'), ev2aConfig)).toBe('peak');
  });

  it('returns partPeak for 9:00 PM — start of second window (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T21:00:00-08:00'), ev2aConfig)).toBe('partPeak');
  });

  it('returns partPeak for 11:59 PM (January, PST)', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T23:59:00-08:00'), ev2aConfig)).toBe('partPeak');
  });

  it('returns peak for 6:00 PM (summer, PDT) — same period regardless of season', () => {
    expect(getCurrentPeriod(new Date('2026-07-15T18:00:00-07:00'), ev2aConfig)).toBe('peak');
  });
});

describe('getCurrentPeriod — E-ELEC (same windows as EV2-A)', () => {
  it('returns offPeak for 2:00 AM', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T02:00:00-08:00'), eelecConfig)).toBe('offPeak');
  });

  it('returns partPeak for 3:00 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T15:00:00-08:00'), eelecConfig)).toBe('partPeak');
  });

  it('returns peak for 4:00 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T16:00:00-08:00'), eelecConfig)).toBe('peak');
  });

  it('returns partPeak for 9:00 PM', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T21:00:00-08:00'), eelecConfig)).toBe('partPeak');
  });
});

// EV-B weekday: Jan 6 2026 is a Tuesday (non-holiday weekday)
// Peak: 2pm–9pm, Part-Peak: 7am–2pm & 9pm–11pm, Off-Peak: midnight–7am & 11pm–midnight
describe('getCurrentPeriod — EV-B weekday (Tuesday Jan 6)', () => {
  it('returns offPeak for midnight (0:00)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T00:00:00-08:00'), evbConfig)).toBe('offPeak');
  });

  it('returns offPeak for 6:00 AM (before 7 AM part-peak start)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T06:00:00-08:00'), evbConfig)).toBe('offPeak');
  });

  it('returns partPeak for 7:00 AM (start of morning part-peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T07:00:00-08:00'), evbConfig)).toBe('partPeak');
  });

  it('returns partPeak for 1:00 PM (13:00, still in morning part-peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T13:00:00-08:00'), evbConfig)).toBe('partPeak');
  });

  it('returns peak for 2:00 PM (14:00, start of peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T14:00:00-08:00'), evbConfig)).toBe('peak');
  });

  it('returns peak for 6:00 PM (18:00)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T18:00:00-08:00'), evbConfig)).toBe('peak');
  });

  it('returns peak for 8:59 PM (20:59, last minute of peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T20:59:00-08:00'), evbConfig)).toBe('peak');
  });

  it('returns partPeak for 9:00 PM (21:00, start of evening part-peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T21:00:00-08:00'), evbConfig)).toBe('partPeak');
  });

  it('returns partPeak for 10:00 PM (22:00)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T22:00:00-08:00'), evbConfig)).toBe('partPeak');
  });

  it('returns offPeak for 11:00 PM (23:00, start of late off-peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-06T23:00:00-08:00'), evbConfig)).toBe('offPeak');
  });
});

// EV-B weekend: Jan 10 2026 is a Saturday
// Peak: 3pm–7pm only, Off-Peak: all other hours (no part-peak)
describe('getCurrentPeriod — EV-B weekend (Saturday Jan 10)', () => {
  it('returns offPeak for 2:00 AM', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T02:00:00-08:00'), evbConfig)).toBe('offPeak');
  });

  it('returns offPeak for 2:00 PM (14:00, before 3 PM peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T14:00:00-08:00'), evbConfig)).toBe('offPeak');
  });

  it('returns peak for 3:00 PM (15:00, start of weekend peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T15:00:00-08:00'), evbConfig)).toBe('peak');
  });

  it('returns peak for 4:00 PM (16:00)', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T16:00:00-08:00'), evbConfig)).toBe('peak');
  });

  it('returns peak for 6:00 PM (18:00)', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T18:00:00-08:00'), evbConfig)).toBe('peak');
  });

  it('returns offPeak for 7:00 PM (19:00, after weekend peak)', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T19:00:00-08:00'), evbConfig)).toBe('offPeak');
  });

  it('returns offPeak for 11:00 PM (23:00)', () => {
    expect(getCurrentPeriod(new Date('2026-01-10T23:00:00-08:00'), evbConfig)).toBe('offPeak');
  });

  it('returns offPeak for Sunday as well (Jan 11)', () => {
    expect(getCurrentPeriod(new Date('2026-01-11T10:00:00-08:00'), evbConfig)).toBe('offPeak');
  });
});

// EV-B holiday: Jan 1 2026 (New Year's Day, a Thursday) should use weekend schedule
describe('getCurrentPeriod — EV-B holiday (New Year\'s Day, Thursday Jan 1)', () => {
  it('returns offPeak for 9:00 AM (before 3 PM peak — weekend/holiday schedule)', () => {
    expect(getCurrentPeriod(new Date('2026-01-01T09:00:00-08:00'), evbConfig)).toBe('offPeak');
  });

  it('returns peak for 3:00 PM (weekend/holiday peak window)', () => {
    expect(getCurrentPeriod(new Date('2026-01-01T15:00:00-08:00'), evbConfig)).toBe('peak');
  });

  it('returns offPeak for 9:00 PM (after 7 PM, no part-peak on holidays)', () => {
    expect(getCurrentPeriod(new Date('2026-01-01T21:00:00-08:00'), evbConfig)).toBe('offPeak');
  });
});

describe('getSeason — EV2-A', () => {
  it('returns winter for January', () => {
    expect(getSeason(new Date('2026-01-15T12:00:00-08:00'), ev2aConfig)).toBe('winter');
  });

  it('returns winter for May 31', () => {
    expect(getSeason(new Date('2026-05-31T12:00:00-07:00'), ev2aConfig)).toBe('winter');
  });

  it('returns summer for June 1', () => {
    expect(getSeason(new Date('2026-06-01T12:00:00-07:00'), ev2aConfig)).toBe('summer');
  });

  it('returns summer for August', () => {
    expect(getSeason(new Date('2026-08-15T12:00:00-07:00'), ev2aConfig)).toBe('summer');
  });

  it('returns summer for September 30', () => {
    expect(getSeason(new Date('2026-09-30T12:00:00-07:00'), ev2aConfig)).toBe('summer');
  });

  it('returns winter for October 1', () => {
    expect(getSeason(new Date('2026-10-01T12:00:00-07:00'), ev2aConfig)).toBe('winter');
  });

  it('returns winter for December', () => {
    expect(getSeason(new Date('2026-12-15T12:00:00-08:00'), ev2aConfig)).toBe('winter');
  });
});

describe('getSeason — EV-B (Summer = May–Oct, Winter = Nov–Apr)', () => {
  it('returns winter for April 30', () => {
    expect(getSeason(new Date('2026-04-30T12:00:00-07:00'), evbConfig)).toBe('winter');
  });

  it('returns summer for May 1', () => {
    expect(getSeason(new Date('2026-05-01T12:00:00-07:00'), evbConfig)).toBe('summer');
  });

  it('returns summer for October 31', () => {
    expect(getSeason(new Date('2026-10-31T12:00:00-07:00'), evbConfig)).toBe('summer');
  });

  it('returns winter for November 1', () => {
    expect(getSeason(new Date('2026-11-01T12:00:00-08:00'), evbConfig)).toBe('winter');
  });

  it('returns winter for January (same as EV2-A for January)', () => {
    expect(getSeason(new Date('2026-01-15T12:00:00-08:00'), evbConfig)).toBe('winter');
  });

  it('EV-B May is summer but EV2-A May is winter', () => {
    const mayDate = new Date('2026-05-15T12:00:00-07:00');
    expect(getSeason(mayDate, ev2aConfig)).toBe('winter');
    expect(getSeason(mayDate, evbConfig)).toBe('summer');
  });

  it('EV-B October is summer but EV2-A October is winter', () => {
    const octDate = new Date('2026-10-15T12:00:00-07:00');
    expect(getSeason(octDate, ev2aConfig)).toBe('winter');
    expect(getSeason(octDate, evbConfig)).toBe('summer');
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

describe('getRate — EV2-A', () => {
  it('returns correct combined rate for winter off-peak', () => {
    const result = getRate(new Date('2026-01-15T02:00:00-08:00'), ev2aConfig);
    expect(result.rate).toBeCloseTo(0.22261, 4);
    expect(result.period).toBe('offPeak');
    expect(result.season).toBe('winter');
  });

  it('returns correct combined rate for summer peak', () => {
    const result = getRate(new Date('2026-07-15T17:00:00-07:00'), ev2aConfig);
    expect(result.rate).toBeCloseTo(0.53420, 4);
    expect(result.period).toBe('peak');
    expect(result.season).toBe('summer');
  });

  it('returns correct combined rate for winter part-peak (first window, 3 PM)', () => {
    const result = getRate(new Date('2026-01-15T15:00:00-08:00'), ev2aConfig);
    expect(result.rate).toBeCloseTo(0.39108, 4);
    expect(result.period).toBe('partPeak');
  });

  it('returns correct combined rate for winter part-peak (second window, 10 PM)', () => {
    const result = getRate(new Date('2026-01-15T22:00:00-08:00'), ev2aConfig);
    expect(result.rate).toBeCloseTo(0.39108, 4);
    expect(result.period).toBe('partPeak');
  });

  it('returns correct combined rate for winter peak', () => {
    const result = getRate(new Date('2026-01-15T17:00:00-08:00'), ev2aConfig);
    expect(result.rate).toBeCloseTo(0.40766, 4);
    expect(result.period).toBe('peak');
    expect(result.season).toBe('winter');
  });

  it('returns generation and delivery components', () => {
    const result = getRate(new Date('2026-01-15T02:00:00-08:00'), ev2aConfig); // winter off-peak
    expect(result.generation).toBeCloseTo(0.09249, 4);
    expect(result.delivery).toBeCloseTo(0.13012, 4);
  });

  it('returns periodLabel and colorScheme', () => {
    const peak = getRate(new Date('2026-01-15T17:00:00-08:00'), ev2aConfig);
    expect(peak.periodLabel).toBe('Peak');
    expect(peak.colorScheme).toBe('red');

    const offPeak = getRate(new Date('2026-01-15T02:00:00-08:00'), ev2aConfig);
    expect(offPeak.periodLabel).toBe('Off-Peak');
    expect(offPeak.colorScheme).toBe('emerald');

    const partPeak = getRate(new Date('2026-01-15T15:00:00-08:00'), ev2aConfig);
    expect(partPeak.periodLabel).toBe('Part-Peak');
    expect(partPeak.colorScheme).toBe('amber');
  });
});

describe('getRate — E-ELEC', () => {
  it('returns correct combined rate for winter off-peak', () => {
    const result = getRate(new Date('2026-01-15T02:00:00-08:00'), eelecConfig);
    expect(result.rate).toBeCloseTo(0.34153, 4);
    expect(result.period).toBe('offPeak');
    expect(result.season).toBe('winter');
  });

  it('returns correct combined rate for summer peak', () => {
    const result = getRate(new Date('2026-07-15T17:00:00-07:00'), eelecConfig);
    expect(result.rate).toBeCloseTo(0.80249, 4);
    expect(result.period).toBe('peak');
    expect(result.season).toBe('summer');
  });

  it('returns correct combined rate for winter peak', () => {
    const result = getRate(new Date('2026-01-15T17:00:00-08:00'), eelecConfig);
    expect(result.rate).toBeCloseTo(0.41047, 4);
    expect(result.period).toBe('peak');
  });
});

describe('getRate — EV-B', () => {
  // Jan 6 = Tuesday (weekday), Jan = winter for EV-B
  it('returns correct combined rate for EV-B winter weekday peak (2 PM)', () => {
    const result = getRate(new Date('2026-01-06T14:00:00-08:00'), evbConfig);
    expect(result.rate).toBeCloseTo(0.53024, 4);
    expect(result.period).toBe('peak');
    expect(result.season).toBe('winter');
  });

  it('returns correct combined rate for EV-B winter weekday part-peak (10 AM)', () => {
    const result = getRate(new Date('2026-01-06T10:00:00-08:00'), evbConfig);
    expect(result.rate).toBeCloseTo(0.37363, 4);
    expect(result.period).toBe('partPeak');
  });

  it('returns correct combined rate for EV-B winter weekday off-peak (3 AM)', () => {
    const result = getRate(new Date('2026-01-06T03:00:00-08:00'), evbConfig);
    expect(result.rate).toBeCloseTo(0.30190, 4);
    expect(result.period).toBe('offPeak');
  });

  // Jan 10 = Saturday, Jan = winter for EV-B
  it('returns correct combined rate for EV-B winter weekend peak (4 PM)', () => {
    const result = getRate(new Date('2026-01-10T16:00:00-08:00'), evbConfig);
    expect(result.rate).toBeCloseTo(0.53024, 4);
    expect(result.period).toBe('peak');
  });

  it('returns correct combined rate for EV-B winter weekend off-peak (10 AM)', () => {
    const result = getRate(new Date('2026-01-10T10:00:00-08:00'), evbConfig);
    expect(result.rate).toBeCloseTo(0.30190, 4);
    expect(result.period).toBe('offPeak');
  });

  // May = summer for EV-B
  it('returns correct combined rate for EV-B summer weekday peak (3 PM) — May 5 is a Tuesday', () => {
    const result = getRate(new Date('2026-05-05T15:00:00-07:00'), evbConfig);
    expect(result.rate).toBeCloseTo(0.90530, 4);
    expect(result.period).toBe('peak');
    expect(result.season).toBe('summer');
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

describe('getNextRateChange — EV2-A', () => {
  it('from 1:00 AM → next change at 3:00 PM same day (offPeak → partPeak)', () => {
    const now = new Date('2026-01-15T01:00:00-08:00');
    const result = getNextRateChange(now, ev2aConfig);
    expect(result.newPeriod).toBe('partPeak');
    expect(getPacificHourForTest(result.time)).toBe(15);
  });

  it('from 3:30 PM → next change at 4:00 PM (partPeak → peak)', () => {
    const now = new Date('2026-01-15T15:30:00-08:00');
    const result = getNextRateChange(now, ev2aConfig);
    expect(result.newPeriod).toBe('peak');
    expect(getPacificHourForTest(result.time)).toBe(16);
  });

  it('from 5:00 PM → next change at 9:00 PM (peak → partPeak)', () => {
    const now = new Date('2026-01-15T17:00:00-08:00');
    const result = getNextRateChange(now, ev2aConfig);
    expect(result.newPeriod).toBe('partPeak');
    expect(getPacificHourForTest(result.time)).toBe(21);
  });

  it('from 10:00 PM → next change at midnight (partPeak → offPeak)', () => {
    const now = new Date('2026-01-15T22:00:00-08:00');
    const result = getNextRateChange(now, ev2aConfig);
    expect(result.newPeriod).toBe('offPeak');
    expect(getPacificHourForTest(result.time)).toBe(0);
  });

  it('result.time is in the future relative to input', () => {
    const now = new Date('2026-01-15T10:00:00-08:00');
    const result = getNextRateChange(now, ev2aConfig);
    expect(result.time.getTime()).toBeGreaterThan(now.getTime());
  });

  it('result.newRate matches the expected rate for the new period', () => {
    const now = new Date('2026-01-15T01:00:00-08:00'); // off-peak, next is partPeak
    const result = getNextRateChange(now, ev2aConfig);
    expect(result.newRate).toBeCloseTo(0.39108, 4); // winter part-peak
  });
});

describe('getNextRateChange — EV-B weekday', () => {
  // Jan 6 = Tuesday (weekday): boundaries at 7, 14, 21, 23
  it('from 3:00 AM → next change at 7:00 AM (offPeak → partPeak)', () => {
    const now = new Date('2026-01-06T03:00:00-08:00');
    const result = getNextRateChange(now, evbConfig);
    expect(result.newPeriod).toBe('partPeak');
    expect(getPacificHourForTest(result.time)).toBe(7);
  });

  it('from 10:00 AM → next change at 2:00 PM (partPeak → peak)', () => {
    const now = new Date('2026-01-06T10:00:00-08:00');
    const result = getNextRateChange(now, evbConfig);
    expect(result.newPeriod).toBe('peak');
    expect(getPacificHourForTest(result.time)).toBe(14);
  });

  it('from 5:00 PM → next change at 9:00 PM (peak → partPeak)', () => {
    const now = new Date('2026-01-06T17:00:00-08:00');
    const result = getNextRateChange(now, evbConfig);
    expect(result.newPeriod).toBe('partPeak');
    expect(getPacificHourForTest(result.time)).toBe(21);
  });

  it('from 10:00 PM → next change at 11:00 PM (partPeak → offPeak)', () => {
    const now = new Date('2026-01-06T22:00:00-08:00');
    const result = getNextRateChange(now, evbConfig);
    expect(result.newPeriod).toBe('offPeak');
    expect(getPacificHourForTest(result.time)).toBe(23);
  });
});

describe('getNextRateChange — EV-B weekend', () => {
  // Jan 10 = Saturday: boundaries at 15, 19
  it('from 10:00 AM → next change at 3:00 PM (offPeak → peak)', () => {
    const now = new Date('2026-01-10T10:00:00-08:00');
    const result = getNextRateChange(now, evbConfig);
    expect(result.newPeriod).toBe('peak');
    expect(getPacificHourForTest(result.time)).toBe(15);
  });

  it('from 5:00 PM → next change at 7:00 PM (peak → offPeak)', () => {
    const now = new Date('2026-01-10T17:00:00-08:00');
    const result = getNextRateChange(now, evbConfig);
    expect(result.newPeriod).toBe('offPeak');
    expect(getPacificHourForTest(result.time)).toBe(19);
  });
});

describe('getDaySchedule — EV2-A', () => {
  it('returns exactly 4 blocks', () => {
    expect(getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), ev2aConfig)).toHaveLength(4);
  });

  it('returns blocks in correct order: offPeak, partPeak, peak, partPeak', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), ev2aConfig);
    expect(blocks[0].period).toBe('offPeak');
    expect(blocks[1].period).toBe('partPeak');
    expect(blocks[2].period).toBe('peak');
    expect(blocks[3].period).toBe('partPeak');
  });

  it('returns correct startHour/endHour boundaries', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), ev2aConfig);
    expect(blocks[0]).toMatchObject({ startHour: 0,  endHour: 15 });
    expect(blocks[1]).toMatchObject({ startHour: 15, endHour: 16 });
    expect(blocks[2]).toMatchObject({ startHour: 16, endHour: 21 });
    expect(blocks[3]).toMatchObject({ startHour: 21, endHour: 24 });
  });

  it('returns winter rates for a winter date', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), ev2aConfig);
    const peakBlock = blocks.find(b => b.period === 'peak');
    expect(peakBlock.rate).toBeCloseTo(0.40766, 4);
  });

  it('returns summer rates for a summer date', () => {
    const blocks = getDaySchedule(new Date('2026-07-15T12:00:00-07:00'), ev2aConfig);
    const peakBlock = blocks.find(b => b.period === 'peak');
    expect(peakBlock.rate).toBeCloseTo(0.53420, 4);
  });

  it('each block includes periodLabel and colorScheme', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), ev2aConfig);
    expect(blocks[2]).toMatchObject({ periodLabel: 'Peak', colorScheme: 'red' });
    expect(blocks[0]).toMatchObject({ periodLabel: 'Off-Peak', colorScheme: 'emerald' });
  });

  it('each block includes generation and delivery components', () => {
    const blocks = getDaySchedule(new Date('2026-01-15T12:00:00-08:00'), ev2aConfig);
    const offPeakBlock = blocks[0];
    expect(offPeakBlock.generation).toBeCloseTo(0.09249, 4);
    expect(offPeakBlock.delivery).toBeCloseTo(0.13012, 4);
  });
});

describe('getDaySchedule — EV-B weekday (Tuesday Jan 6)', () => {
  it('returns exactly 5 blocks', () => {
    expect(getDaySchedule(new Date('2026-01-06T12:00:00-08:00'), evbConfig)).toHaveLength(5);
  });

  it('returns blocks in correct order: offPeak, partPeak, peak, partPeak, offPeak', () => {
    const blocks = getDaySchedule(new Date('2026-01-06T12:00:00-08:00'), evbConfig);
    expect(blocks[0].period).toBe('offPeak');
    expect(blocks[1].period).toBe('partPeak');
    expect(blocks[2].period).toBe('peak');
    expect(blocks[3].period).toBe('partPeak');
    expect(blocks[4].period).toBe('offPeak');
  });

  it('returns correct startHour/endHour boundaries', () => {
    const blocks = getDaySchedule(new Date('2026-01-06T12:00:00-08:00'), evbConfig);
    expect(blocks[0]).toMatchObject({ startHour: 0,  endHour: 7  });
    expect(blocks[1]).toMatchObject({ startHour: 7,  endHour: 14 });
    expect(blocks[2]).toMatchObject({ startHour: 14, endHour: 21 });
    expect(blocks[3]).toMatchObject({ startHour: 21, endHour: 23 });
    expect(blocks[4]).toMatchObject({ startHour: 23, endHour: 24 });
  });

  it('returns winter rates for January', () => {
    const blocks = getDaySchedule(new Date('2026-01-06T12:00:00-08:00'), evbConfig);
    const peakBlock = blocks.find(b => b.period === 'peak');
    expect(peakBlock.rate).toBeCloseTo(0.53024, 4);
  });
});

describe('getDaySchedule — EV-B weekend (Saturday Jan 10)', () => {
  it('returns exactly 3 blocks', () => {
    expect(getDaySchedule(new Date('2026-01-10T12:00:00-08:00'), evbConfig)).toHaveLength(3);
  });

  it('returns blocks in correct order: offPeak, peak, offPeak', () => {
    const blocks = getDaySchedule(new Date('2026-01-10T12:00:00-08:00'), evbConfig);
    expect(blocks[0].period).toBe('offPeak');
    expect(blocks[1].period).toBe('peak');
    expect(blocks[2].period).toBe('offPeak');
  });

  it('returns correct startHour/endHour boundaries', () => {
    const blocks = getDaySchedule(new Date('2026-01-10T12:00:00-08:00'), evbConfig);
    expect(blocks[0]).toMatchObject({ startHour: 0,  endHour: 15 });
    expect(blocks[1]).toMatchObject({ startHour: 15, endHour: 19 });
    expect(blocks[2]).toMatchObject({ startHour: 19, endHour: 24 });
  });
});

describe('Bill validation (Nov 2025 statement — winter rates)', () => {
  const { usage, cceLineItems, pgeLineItems, billedAmounts } = ratesData.billValidation;

  it('November is correctly identified as winter season', () => {
    expect(getSeason(new Date('2025-11-01T12:00:00-08:00'), ev2aConfig)).toBe('winter');
  });

  it('October (start of billing period) is correctly identified as winter', () => {
    expect(getSeason(new Date('2025-10-07T12:00:00-07:00'), ev2aConfig)).toBe('winter');
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
