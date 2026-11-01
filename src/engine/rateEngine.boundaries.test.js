import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { execPath } from 'node:process';
import ratePlans from '../data/ratePlans.json';
import tdpudRates from '../data/tdpudRatePlans.json';
import {
  getRate, getDaySchedule, getNextRateChange, getNextIntegrationBoundary,
  getPacificDateStr, getSeason, getCurrentPeriod, isHoliday,
} from './rateEngine';
import { buildPacificTime } from '../utils/pacificTime';

const plans = ['EV2-A', 'E-ELEC', 'EV-B', 'E-TOU-C', 'E-TOU-D'];
const evb = ratePlans.ratePlans['EV-B'];
const etoud = ratePlans.ratePlans['E-TOU-D'];

it('returns finite real charging summaries on the spring-DST hang date within a subprocess deadline', () => {
  // An async timeout cannot stop an infinite synchronous loop. SSR-load real
  // production modules in a killable subprocess using existing dependencies.
  const script = `
    import { createServer } from 'vite';
    const server = await createServer({
      configFile: false, server: { middlewareMode: true }, appType: 'custom',
      optimizeDeps: { noDiscovery: true, entries: [] },
    });
    try {
      const { calcChargeSummary } = await server.ssrLoadModule('/src/engine/costCalculator.js');
      const { default: data } = await server.ssrLoadModule('/src/data/ratePlans.json');
      const { buildEffectivePlanConfig } = await server.ssrLoadModule('/src/data/effectivePlanConfig.js');
      for (const name of ${JSON.stringify(plans)}) {
        const effective = buildEffectivePlanConfig({
          planConfig: data.ratePlans[name], serviceArea: { utilityId: 'pge' }, providerId: '3ce',
          accountOptions: { pciaVintage: '2021', baselineTier: 'tier2' },
        });
        const summary = calcChargeSummary(
          new Date('2026-03-07T10:00:00-08:00'), 60, 20, 7.7, effective
        );
        for (const target of [summary.to80, summary.to100]) {
          for (const value of [target.costNow, target.hoursNeeded, target.cheapestCost]) {
            if (!Number.isFinite(value) || value < 0) throw new Error('Invalid charge summary');
          }
        }
      }
      process.stdout.write('summaries complete');
    } finally {
      await server.close();
    }
  `;
  const output = execFileSync(execPath, ['--input-type=module', '-e', script], {
    timeout: 5000, encoding: 'utf8',
  });
  expect(output).toContain('summaries complete');
});

describe.each(plans)('%s calendar and integration boundaries', planName => {
  const plan = ratePlans.ratePlans[planName];

  it.each([
    ['2026-03-07T23:30:00-08:00', '2026-03-08T08:00:00.000Z'],
    ['2026-03-08T23:30:00-07:00', '2026-03-09T07:00:00.000Z'],
    ['2026-10-31T23:30:00-07:00', '2026-11-01T07:00:00.000Z'],
    ['2026-11-01T23:30:00-08:00', '2026-11-02T08:00:00.000Z'],
    ['2026-12-31T23:30:00-08:00', '2027-01-01T08:00:00.000Z'],
    ['2026-02-28T23:30:00-08:00', '2026-03-01T08:00:00.000Z'],
  ])('keeps midnight strictly future from %s', (input, expected) => {
    const date = new Date(input);
    const boundary = getNextIntegrationBoundary(date, plan, 'bundled');
    expect(boundary.time.toISOString()).toBe(expected);
    expect(boundary.time.getTime()).toBeGreaterThan(date.getTime());
  });

  it.each(['2026-03-08', '2026-11-01', '2026-07-03', '2026-07-11', '2026-06-01'])(
    'timeline schedule agrees with runtime periods and rates on %s', day => {
      for (const block of getDaySchedule(buildPacificTime(day, 12), plan, 'bundled')) {
        const rate = getRate(buildPacificTime(day, (block.startHour + block.endHour) / 2), plan, 'bundled');
        expect(rate.period).toBe(block.period);
        expect(rate.rate).toBe(block.rate);
      }
    }
  );

  it('retains the configured season boundary without altering month ranges', () => {
    const first = `${2026}-${String(plan.seasons.summer.startMonth).padStart(2, '0')}-01`;
    const midnight = buildPacificTime(first, 0);
    const before = new Date(midnight.getTime() - 1);
    expect(getSeason(before, plan)).toBe('winter');
    expect(getNextIntegrationBoundary(before, plan, 'bundled').time).toEqual(midnight);
    expect(getSeason(midnight, plan)).toBe('summer');
  });

  it('returns a strictly future actual price change across spring DST', () => {
    const date = new Date('2026-03-07T23:30:00-08:00');
    const next = getNextRateChange(date, plan, 'bundled');
    expect(next.time.getTime()).toBeGreaterThan(date.getTime());
    expect(next.newRate).not.toBe(getRate(date, plan, 'bundled').rate);
  });
});
describe('fractional and repeated/nonexistent Pacific boundary hours', () => {
  const synthetic = {
    ...etoud,
    touPeriods: {
      summer: { peak: { start: '01:30', end: '02:30', days: 'all' } },
      winter: { peak: { start: '01:30', end: '02:30', days: 'all' } },
    },
  };

  it('reads minutes rather than truncating the configured tariff hours', () => {
    expect(getCurrentPeriod(new Date('2026-01-15T01:29:59-08:00'), synthetic)).toBe('offPeak');
    expect(getCurrentPeriod(new Date('2026-01-15T01:30:00-08:00'), synthetic)).toBe('peak');
    expect(getNextIntegrationBoundary(new Date('2026-01-15T01:20:00-08:00'), synthetic, 'bundled').time.toISOString())
      .toBe('2026-01-15T09:30:00.000Z');
  });

  it('walks the first peak, backward clock reset, repeated peak, and final end monotonically', () => {
    let cursor = new Date('2026-11-01T01:20:00-07:00');
    const actual = [];
    for (let i = 0; i < 4; i++) {
      const next = getNextIntegrationBoundary(cursor, synthetic, 'bundled');
      expect(next.time.getTime()).toBeGreaterThan(cursor.getTime());
      actual.push([next.time.toISOString(), next.newPeriod]);
      cursor = next.time;
    }
    expect(actual).toEqual([
      ['2026-11-01T08:30:00.000Z', 'peak'],
      ['2026-11-01T09:00:00.000Z', 'offPeak'],
      ['2026-11-01T09:30:00.000Z', 'peak'],
      ['2026-11-01T10:30:00.000Z', 'offPeak'],
    ]);
  });

  it('treats the spring jump as the end of a window whose wall-clock end does not exist', () => {
    const date = new Date('2026-03-08T01:45:00-08:00');
    const next = getNextIntegrationBoundary(date, synthetic, 'bundled');
    expect(next.time.toISOString()).toBe('2026-03-08T10:00:00.000Z');
    expect(next.newPeriod).toBe('offPeak');
    expect(getNextRateChange(date, synthetic, 'bundled')).toEqual(next);
  });

  it('starts a skipped wall-clock window at the real spring jump, not a fabricated 2 AM', () => {
    const plan = {
      ...synthetic,
      touPeriods: {
        summer: { peak: { start: '02:30', end: '03:30', days: 'all' } },
        winter: { peak: { start: '02:30', end: '03:30', days: 'all' } },
      },
    };
    const next = getNextRateChange(new Date('2026-03-08T01:45:00-08:00'), plan, 'bundled');
    expect(next.time.toISOString()).toBe('2026-03-08T10:00:00.000Z');
    expect(next.newPeriod).toBe('peak');
    expect(getNextRateChange(next.time, plan, 'bundled').time.toISOString()).toBe('2026-03-08T10:30:00.000Z');
  });
});

describe('EV-B official sheet 3 shoulder schedule', () => {
  it.each([
    ['2026-03-16T14:30:00-07:00', 'partPeak', 0.30677],
    ['2026-10-26T14:30:00-07:00', 'partPeak', 0.37720],
    ['2026-10-31T15:30:00-07:00', 'offPeak', 0.26465],
    ['2026-10-31T19:30:00-07:00', 'peak', 0.62131],
    ['2026-03-16T07:30:00-07:00', 'offPeak', 0.23504],
    ['2026-03-16T23:30:00-07:00', 'partPeak', 0.30677],
  ])('%s is %s at the published precise rate', (input, period, rate) => {
    expect(getRate(new Date(input), evb, 'bundled')).toMatchObject({ period, rate });
  });

  it.each([
    ['2026-03-07', 15, 19],
    ['2026-03-08', 16, 20],
    ['2026-04-04', 16, 20],
    ['2026-04-05', 15, 19],
    ['2026-10-24', 15, 19],
    ['2026-10-25', 16, 20],
    ['2026-10-31', 16, 20],
    ['2026-11-01', 15, 19],
  ])('bounding Sunday interpretation on %s matches the daily timeline', (day, startHour, endHour) => {
    expect(getDaySchedule(buildPacificTime(day, 12), evb, 'bundled').find(b => b.period === 'peak'))
      .toMatchObject({ startHour, endHour });
  });

  it('moves the next bundled boundary with the timeline', () => {
    const input = new Date('2026-03-16T14:30:00-07:00');
    expect(getNextRateChange(input, evb, 'bundled').time.toISOString()).toBe('2026-03-16T22:00:00.000Z');
    expect(getNextIntegrationBoundary(input, evb, 'bundled').time.toISOString()).toBe('2026-03-16T22:00:00.000Z');
  });

  it('does not apply EV-B policy to a different schedule with the same windows', () => {
    const other = { ...evb, scheduleCode: 'OTHER', rateDesignation: 'OTHER' };
    expect(getCurrentPeriod(new Date('2026-03-16T14:30:00-07:00'), other)).toBe('peak');
  });

  it('keeps EV2-A and E-ELEC afternoon hours unchanged in shoulders', () => {
    for (const name of ['EV2-A', 'E-ELEC']) {
      expect(getCurrentPeriod(new Date('2026-03-16T15:30:00-07:00'), ratePlans.ratePlans[name])).toBe('partPeak');
    }
  });
});

describe('actual price changes versus integration boundaries', () => {
  it('skips weekend midnights to the next weekday peak', () => {
    const date = new Date('2026-07-11T18:00:00-07:00');
    expect(getNextIntegrationBoundary(date, etoud, 'bundled').time.toISOString()).toBe('2026-07-12T07:00:00.000Z');
    expect(getNextRateChange(date, etoud, 'bundled').time.toISOString()).toBe('2026-07-14T00:00:00.000Z');
  });

  it('skips a holiday weekday as well as the weekend', () => {
    const date = new Date('2026-09-04T21:00:00-07:00');
    expect(getNextRateChange(date, etoud, 'bundled').time.toISOString()).toBe('2026-09-09T00:00:00.000Z');
  });

  it('skips equal-price period transitions without rounding away real precision', () => {
    const plan = tdpudRates.ratePlans['TDPUD-TOU-PRIMARY'];
    const date = new Date('2026-01-15T10:00:00-08:00');
    expect(getNextIntegrationBoundary(date, plan, 'bundled').newPeriod).toBe('midPeak');
    expect(getNextRateChange(date, plan, 'bundled').time.toISOString()).toBe('2026-01-16T00:00:00.000Z');
  });

  it('recognizes a seasonal midnight price change even with the same period', () => {
    const input = new Date('2026-05-31T23:30:00-07:00');
    const change = getNextRateChange(input, etoud, 'bundled');
    expect(change.time.toISOString()).toBe('2026-06-01T07:00:00.000Z');
    expect(change.newPeriod).toBe('offPeak');
    expect(change.newRate).toBe(etoud.rates.totalBundled.summer.offPeak);
  });

  it('uses null for flat or uniform rates, while retaining daily integration boundaries', () => {
    const date = new Date('2026-01-15T12:00:00-08:00');
    const flat = { _flatRate: { combined: 0.25, delivery: 0.1, generation: 0.15 } };
    expect(getNextRateChange(date, flat)).toBeNull();
    expect(getNextIntegrationBoundary(date, flat).time.toISOString()).toBe('2026-01-16T08:00:00.000Z');
    const uniform = structuredClone(etoud);
    for (const season of ['summer', 'winter']) {
      for (const period of ['peak', 'offPeak']) uniform.rates.totalBundled[season][period] = 0.25;
    }
    expect(getNextRateChange(date, uniform, 'bundled')).toBeNull();
  });

  it('does not round away a small but real tariff price difference', () => {
    const plan = structuredClone(etoud);
    plan.rates.totalBundled.winter.offPeak = 0.250001;
    plan.rates.totalBundled.winter.peak = 0.250002;
    const change = getNextRateChange(new Date('2026-01-15T16:59:59-08:00'), plan, 'bundled');
    expect(change.time.toISOString()).toBe('2026-01-16T01:00:00.000Z');
    expect(change.newRate).toBe(0.250002);
  });

  it('finds tomorrow rather than returning an already-reached boundary', () => {
    const date = new Date('2026-01-15T20:00:00-08:00');
    expect(getNextRateChange(date, etoud, 'bundled').time.toISOString()).toBe('2026-01-17T01:00:00.000Z');
  });
});

describe('component and validation contracts', () => {
  it('passes the complete effective component map through rate and timeline results', () => {
    const components = { delivery: 0.1, generation: 0.2, pcia: 0.05264, franchiseFee: 0.00048, energySurcharge: 0.0003, baselineCredit: -0.0814 };
    const cell = { combined: Object.values(components).reduce((sum, n) => sum + n, 0), delivery: 0.1, generation: 0.2, components };
    const config = { ...etoud, rates: { winter: { peak: cell, offPeak: cell }, summer: { peak: cell, offPeak: cell } } };
    const date = new Date('2026-01-15T18:00:00-08:00');
    expect(getRate(date, config).components).toEqual(components);
    expect(getDaySchedule(date, config).every(block => block.components === components)).toBe(true);
    expect(getRate(date, { _flatRate: cell }).components).toBe(components);
  });

  it.each([getRate, getCurrentPeriod, getDaySchedule, getSeason, getNextRateChange, getNextIntegrationBoundary])(
    '%s rejects invalid Dates immediately', fn => {
      expect(() => fn(new Date(NaN), etoud, 'bundled')).toThrow(RangeError);
    }
  );
});

describe('legacy assumed holiday policy — consistency, not a verified tariff oracle', () => {
  it.each([
    ['2027-12-31T18:00:00-08:00', true],
    ['2026-07-03T18:00:00-07:00', true],
    ['2023-01-02T18:00:00-08:00', true],
    ['2026-02-16T18:00:00-08:00', true],
    ['2026-05-25T18:00:00-07:00', true],
    ['2026-11-26T18:00:00-08:00', true],
    ['2027-12-30T23:59:59-08:00', false],
    ['2027-12-31T00:00:00-08:00', true],
  ])('%s resolves consistently across adjacent years and Pacific dates', (input, expected) => {
    expect(isHoliday(new Date(input))).toBe(expected);
  });

  it('uses a stable ISO Pacific date independent of locale punctuation', () => {
    expect(getPacificDateStr(new Date('2027-01-01T07:59:59Z'))).toBe('2026-12-31');
  });

  it('applies the retained holiday day-type only to plans that specify one', () => {
    const date = new Date('2027-12-31T18:00:00-08:00');
    expect(getCurrentPeriod(date, etoud)).toBe('offPeak');
    expect(getCurrentPeriod(new Date('2027-12-31T09:00:00-08:00'), evb)).toBe('offPeak');
    for (const name of ['EV2-A', 'E-ELEC', 'E-TOU-C']) {
      expect(getCurrentPeriod(date, ratePlans.ratePlans[name])).toBe('peak');
    }
  });
});
