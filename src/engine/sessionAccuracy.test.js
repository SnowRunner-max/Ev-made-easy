import { describe, expect, it } from 'vitest';
import ratePlans from '../data/ratePlans.json';
import { calcChargeCost, calcChargeSummary, findCheapestWindow } from './costCalculator';
import { buildEffectivePlanConfig } from '../data/effectivePlanConfig';

const raw = ratePlans.ratePlans['EV2-A'];
const config = {
  ...raw,
  rates: Object.fromEntries(Object.keys(raw.rates.delivery).map(season => [
    season,
    Object.fromEntries(Object.keys(raw.rates.delivery[season]).map(period => {
      const delivery = raw.rates.delivery[season][period];
      const generation = raw.rates.generation[season][period];
      return [period, { combined: delivery + generation, delivery, generation,
        components: { delivery, generation } }];
    })),
  ])),
};

describe('session accuracy regressions', () => {
  it.each([
    ['E-1', 0.32591, 0.40732],
    ['E-TOU-C', 0.28647, 0.36787],
  ])('integrates verified %s baseline crossing with state surcharge', (planId, below, above) => {
    const effective = buildEffectivePlanConfig({
      planConfig: ratePlans.ratePlans[planId], serviceArea: { utilityId: 'pge' }, providerId: 'pge',
      accountOptions: { baselineRemainingKwh: 5 },
    });
    const result = calcChargeCost(new Date('2026-01-15T02:00:00-08:00'), 10, 7.2, effective);
    expect(result.totalCost).toBeCloseTo(5 * below + 5 * above, 8);
    expect(Object.values(result.componentCosts).reduce((a, b) => a + b, 0))
      .toBeCloseTo(result.totalCost, 10);
  });

  it.each(['EV2-A', 'E-ELEC', 'EV-B', 'E-TOU-C', 'E-TOU-D'])(
    'terminates and reconciles %s sessions across spring DST and midnight', planId => {
      const effective = buildEffectivePlanConfig({
        planConfig: ratePlans.ratePlans[planId], serviceArea: { utilityId: 'pge' },
        providerId: '3ce', accountOptions: { pciaVintage: '2021', baselineTier: 'tier2' },
      });
      for (const start of ['2026-03-07T23:30:00-08:00', '2026-03-08T01:30:00-08:00']) {
        const { to80 } = calcChargeSummary(new Date(start), 60, 20, 7.7, effective);
        expect(Number.isFinite(to80.costNow)).toBe(true);
        expect(to80.cheapestStartTime.getTime()).toBeGreaterThanOrEqual(new Date(start).getTime());
        expect(Object.values(to80.componentCosts).reduce((a, b) => a + b, 0))
          .toBeCloseTo(to80.costNow, 9);
      }
    }
  );

  it('prices standard 3CE components through the real session engine', () => {
    const effective = buildEffectivePlanConfig({
      planConfig: raw, serviceArea: { utilityId: 'pge' }, providerId: '3ce',
      accountOptions: { pciaVintage: '2021' },
    });
    const result = calcChargeCost(new Date('2026-01-15T02:00:00-08:00'), 10, 7.7, effective);
    expect(result.totalCost).toBeCloseTo(2.7814, 8);
    expect(result.componentCosts.pcia).toBeCloseTo(0.5264, 10);
    expect(result.componentCosts.franchiseFee).toBeCloseTo(0.0048, 10);
    expect(result.componentCosts.energySurcharge).toBeCloseTo(0.003, 10);
  });
  it('integrates delivery and generation across the same periods as the total', () => {
    const result = calcChargeCost(new Date('2026-07-15T14:00:00-07:00'), 36, 7.7, config);
    expect(result.totalCost).toBeCloseTo(16.11414, 8);
    expect(Object.values(result.componentCosts).reduce((a, b) => a + b, 0))
      .toBeCloseTo(result.totalCost, 10);
    expect(result.componentCosts.delivery).not.toBeCloseTo(36 * config.rates.summer.offPeak.delivery, 3);
  });

  it('never recommends a past start and returns the full absolute timestamp', () => {
    const now = new Date('2026-07-15T17:37:00-07:00');
    const result = findCheapestWindow(now, 36, 7.7, config);
    expect(result.startTime.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(result.startTime.getTime()).toBeLessThanOrEqual(now.getTime() + 86_400_000);
    expect(result.totalCost).toBeLessThanOrEqual(calcChargeCost(now, 36, 7.7, config).totalCost);
    expect(result.startTime.toISOString()).toBe('2026-07-16T07:00:00.000Z');
    expect(result.totalCost).toBeCloseTo(36 * 0.22558, 8);
  });

  it('allows live displays to skip unused future-window calculations explicitly', () => {
    const { to80 } = calcChargeSummary(new Date('2026-07-15T02:00:00-07:00'), 60, 20, 7.2, config,
      { optimize: false });
    expect(to80.costNow).toBeCloseTo(36 * 0.22558, 8);
    expect(to80.cheapestCost).toBeNull();
    expect(to80.cheapestStartTime).toBeNull();
    expect(to80.savings).toBeNull();
  });

  it('distinguishes battery energy from metered energy using explicit efficiency', () => {
    const { to80 } = calcChargeSummary(new Date('2026-07-15T02:00:00-07:00'), 60, 20, 7.2, config,
      { chargingEfficiency: 0.9 });
    expect(to80.kwhNeeded).toBe(36);
    expect(to80.meteredKwh).toBe(40);
    expect(to80.hoursNeeded).toBeCloseTo(40 / 7.2, 10);
    expect(to80.costNow).toBeCloseTo(40 * 0.22558, 8);
  });

  it('splits metered energy at the remaining-baseline threshold exactly once', () => {
    const flat = {
      _flatRate: { combined: 0.3, delivery: 0.2, generation: 0.1,
        components: { delivery: 0.2, generation: 0.1 } },
      _baselineRemainingKwh: 5,
      _aboveBaselineDelta: 0.08,
      _aboveBaselineComponent: 'delivery',
    };
    const result = calcChargeCost(new Date('2026-07-15T02:00:00-07:00'), 10, 7.2, flat);
    expect(result.totalCost).toBeCloseTo(5 * 0.3 + 5 * 0.38, 10);
    expect(result.componentCosts.delivery).toBeCloseTo(5 * 0.2 + 5 * 0.28, 10);
    const above = { ...flat, _baselineRemainingKwh: 0,
      _flatRate: { combined: 0.38, delivery: 0.28, generation: 0.1,
        components: { delivery: 0.28, generation: 0.1 } } };
    expect(calcChargeCost(new Date('2026-07-15T02:00:00-07:00'), 10, 7.2, above).totalCost)
      .toBeCloseTo(3.8, 10);
  });

  it.each([0, -1, NaN, Infinity])('rejects invalid charging power %s rather than looping', power => {
    expect(() => calcChargeCost(new Date(), 10, power, config)).toThrow(RangeError);
  });

  it('rejects invalid energy, clock and efficiency', () => {
    expect(() => calcChargeCost(new Date(), Infinity, 7.2, config)).toThrow(RangeError);
    expect(() => calcChargeCost(new Date('invalid'), 10, 7.2, config)).toThrow(RangeError);
    expect(() => calcChargeCost(new Date(), 10, 7.2, config, { chargingEfficiency: 0 }))
      .toThrow(RangeError);
  });
});
