import { describe, expect, it } from 'vitest';
import ratePlans from './ratePlans.json';
import serviceAreas from './serviceAreas.json';
import { UTILITY_REGISTRY } from './utilityRegistry';
import { buildEffectivePlanConfig } from './effectivePlanConfig';

const pgeArea = serviceAreas.serviceAreas['pge-3ce-sbco'];
const build = (planId = 'EV2-A', providerId = '3ce', accountOptions = {}, tierId) =>
  buildEffectivePlanConfig({
    planConfig: ratePlans.ratePlans[planId],
    serviceArea: pgeArea,
    providerId,
    tierId,
    accountOptions: { pciaVintage: 2021, ...accountOptions },
  });

// Published PG&E cells + verified CCA normalization, before the separate state fee.
const ev2Reference = {
  summer: { offPeak: 0.27777, partPeak: 0.47938, peak: 0.58943 },
  winter: { offPeak: 0.27784, partPeak: 0.44631, peak: 0.46289 },
};

function assertComponents(cell) {
  expect(Object.values(cell.components).every(Number.isFinite)).toBe(true);
  expect(Object.values(cell.components).reduce((sum, value) => sum + value, 0)).toBeCloseTo(cell.combined, 12);
  expect(cell.components.delivery).toBe(cell.delivery);
  expect(cell.components.generation).toBe(cell.generation);
}

describe('effective verified PG&E composition', () => {
  for (const tierId of ['3cchoice', '3cprime']) {
    for (const includeStateSurcharge of [false, true]) {
      it(`matches all six independent EV2 cells for ${tierId}, state=${includeStateSurcharge}`, () => {
        const result = build('EV2-A', '3ce', { includeStateSurcharge }, tierId);
        const adjustment = (tierId === '3cprime' ? 0.008 : 0) + (includeStateSurcharge ? 0.00030 : 0);
        for (const [season, periods] of Object.entries(ev2Reference)) {
          for (const [period, expected] of Object.entries(periods)) {
            const cell = result.rates[season][period];
            expect(cell.combined).toBeCloseTo(expected + adjustment, 12);
            expect(cell.delivery).toBeCloseTo(ratePlans.ratePlans['EV2-A'].rates.delivery[season][period] + 0.01011, 12);
            expect(cell.components.pcia).toBe(0.05264);
            expect(cell.components.franchiseFee).toBe(0.00048);
            expect(cell.components.energySurcharge).toBe(includeStateSurcharge ? 0.00030 : undefined);
            assertComponents(cell);
          }
        }
      });
    }
  }

  it('includes the verified state surcharge by default', () => {
    expect(build().rates.winter.offPeak.combined).toBeCloseTo(0.27814, 12);
  });

  it('applies the same verified standard charge correction across all five PG&E TOU plans', () => {
    for (const planId of ['EV2-A', 'E-ELEC', 'EV-B', 'E-TOU-C', 'E-TOU-D']) {
      const raw = ratePlans.ratePlans[planId];
      const result = build(planId, '3ce', { baselineTier: 'tier2', includeStateSurcharge: false });
      for (const [season, periods] of Object.entries(raw.rates.delivery)) {
        for (const [period, delivery] of Object.entries(periods)) {
          const generation = raw.rates.ccaGeneration['3ce'].tiers['3cchoice'][season][period];
          expect(result.rates[season][period].combined).toBeCloseTo(delivery + generation + 0.06323, 12);
          assertComponents(result.rates[season][period]);
        }
      }
    }
  });

  it('preserves every bundled published cell before the optional separate state surcharge', () => {
    for (const [planId, raw] of Object.entries(ratePlans.ratePlans)) {
      if (!raw.touPeriods) continue;
      for (const includeStateSurcharge of [false, true]) {
        const result = build(planId, 'pge', { baselineTier: 'tier2', includeStateSurcharge });
        for (const [season, periods] of Object.entries(raw.rates.totalBundled)) {
          for (const [period, bundled] of Object.entries(periods)) {
            const cell = result.rates[season][period];
            expect(cell.combined).toBeCloseTo(bundled + (includeStateSurcharge ? 0.00030 : 0), 12);
            expect(cell.delivery).toBe(raw.rates.delivery[season][period]);
            expect(cell.components.pcia).toBeUndefined();
            expect(cell.components.franchiseFee).toBeUndefined();
            assertComponents(cell);
          }
        }
      }
    }
  });

  it('keeps full precision for non-2021 vintage totals', () => {
    const cell = build('EV2-A', '3ce', { pciaVintage: 2009 }).rates.winter.offPeak;
    expect(cell.combined).toBeCloseTo(0.25539, 12);
    expect(cell.components).toEqual({
      delivery: 0.13012 + 0.01011,
      generation: 0.08449,
      pcia: 0.02973,
      franchiseFee: 0.00064,
      energySurcharge: 0.00030,
    });
  });

  it('does not treat Ava embedded-fee comments as verified pricing policy', () => {
    const result = build('EV2-A', 'ava', { includeStateSurcharge: true });
    expect(result.rates.winter.offPeak.combined).toBeCloseTo(0.16389, 12);
    expect(result.rates.winter.offPeak.components).toEqual({ delivery: 0.13012, generation: 0.03377 });
    expect(result._pricingWarnings.join(' ')).toMatch(/unverified/i);
  });

  it('preserves all other utilities and provider numeric behavior, warning about unverified adjustments', () => {
    for (const utility of Object.values(UTILITY_REGISTRY).filter(item => item.id !== 'pge')) {
      const serviceArea = { utilityId: utility.id };
      for (const planConfig of Object.values(utility.ratePlans.ratePlans)) {
        for (const providerId of [utility.bundledProviderId, ...Object.keys(planConfig.rates.ccaGeneration ?? {})]) {
          const result = buildEffectivePlanConfig({
            planConfig, serviceArea, providerId,
            accountOptions: { includeStateSurcharge: true, pciaVintage: 2021, baselineTier: 'tier2' },
          });
          const cca = planConfig.rates.ccaGeneration?.[providerId];
          if (planConfig.touPeriods) {
            for (const [season, periods] of Object.entries(planConfig.rates.delivery)) {
              for (const [period, delivery] of Object.entries(periods)) {
                const expected = cca
                  ? delivery + cca.tiers[cca.defaultTier][season][period]
                  : planConfig.rates.totalBundled[season][period];
                expect(result.rates[season][period].combined).toBe(expected);
                assertComponents(result.rates[season][period]);
              }
            }
          } else {
            const expected = cca
              ? planConfig.rates.delivery.tier1 + cca.tiers[cca.defaultTier].allUsage
              : planConfig.rates.totalBundled.tier1;
            expect(result._flatRate.combined).toBe(expected);
            assertComponents(result._flatRate);
          }
          expect(result._pricingWarnings.join(' ')).toMatch(/unverified/i);
        }
      }
    }
  });

  it('does not mutate the source rate data or seasonal definitions', () => {
    const before = JSON.stringify(ratePlans);
    build('E-1', '3ce', { baselineTier: 'tier2' });
    build('E-TOU-C', '3ce', { baselineRemainingKwh: 7 });
    expect(JSON.stringify(ratePlans)).toBe(before);
  });
});

describe('explicit PG&E baseline contract', () => {
  it.each([
    ['pge', 'tier1', 0.19706, 0.32561],
    ['pge', 'tier2', 0.27847, 0.40702],
    ['3ce', 'tier1', 0.20717, 0.37754],
    ['3ce', 'tier2', 0.28858, 0.45895],
  ])('prices E-1 %s %s without double-counting conservation adjustments', (providerId, baselineTier, delivery, combined) => {
    const result = build('E-1', providerId, { baselineTier, includeStateSurcharge: false });
    expect(result._flatRate.delivery).toBeCloseTo(delivery, 12);
    expect(result._flatRate.combined).toBeCloseTo(combined, 12);
    expect(result._baselineRemainingKwh).toBeNull();
    expect(result._aboveBaselineDelta).toBeCloseTo(0.08141, 12);
    expect(result._aboveBaselineComponent).toBe('delivery');
    assertComponents(result._flatRate);
  });

  it.each(['pge', '3ce'])('uses the E-TOU-C baseline credit once for %s, in all periods', providerId => {
    const within = build('E-TOU-C', providerId, { baselineTier: 'tier1', includeStateSurcharge: false });
    const above = build('E-TOU-C', providerId, { baselineTier: 'tier2', includeStateSurcharge: false });
    for (const season of ['summer', 'winter']) {
      for (const period of ['peak', 'offPeak']) {
        expect(within.rates[season][period].combined).toBeCloseTo(above.rates[season][period].combined - 0.08140, 12);
        expect(within.rates[season][period].components.baselineCredit).toBe(-0.08140);
        expect(above.rates[season][period].components.baselineCredit).toBeUndefined();
        expect(within.rates[season][period].delivery).toBe(above.rates[season][period].delivery);
        assertComponents(within.rates[season][period]);
      }
    }
    expect(within._aboveBaselineDelta).toBe(0.08140);
    expect(within._aboveBaselineComponent).toBe('baselineCredit');
    expect(within._pricingWarnings.join(' ')).toMatch(/proportional.*billing.*incremental/i);
  });

  it('matches independent bundled E-TOU-C winter baseline reference', () => {
    expect(build('E-TOU-C', 'pge', { baselineTier: 'tier1', includeStateSurcharge: false })
      .rates.winter.offPeak.combined).toBeCloseTo(0.28617, 12);
  });
  it('represents a 36 kWh E-1 session with 12 kWh remaining without adding the delta twice', () => {
    const result = build('E-1', 'pge', { baselineRemainingKwh: 12, includeStateSurcharge: false });
    const within = result._flatRate.combined;
    const above = within + result._aboveBaselineDelta;
    expect(12 * within + 24 * above).toBeCloseTo(13.67580, 10);
    const exhausted = build('E-1', 'pge', { baselineRemainingKwh: 0, includeStateSurcharge: false });
    expect(exhausted._flatRate.combined).toBeCloseTo(above, 12);
  });

  it('represents E-1 3Cprime without changing its independent tier delivery amounts', () => {
    const result = build('E-1', '3ce', { baselineTier: 'tier1', includeStateSurcharge: false }, '3cprime');
    expect(result._flatRate.delivery).toBeCloseTo(0.20717, 12);
    expect(result._flatRate.generation).toBe(0.12525);
    expect(result._flatRate.combined).toBeCloseTo(0.38554, 12);
    assertComponents(result._flatRate);
  });

  it('matches E-TOU-C proportional tier allocation for mixed billing-period TOU usage', () => {
    // Tariff example: 20% peak, 80% off-peak. Of 500 kWh, 100 kWh
    // eligible baseline is allocated 20 peak / 80 off-peak, not all to one period.
    const within = build('E-TOU-C', 'pge', { baselineTier: 'tier1', includeStateSurcharge: false });
    const above = build('E-TOU-C', 'pge', { baselineTier: 'tier2', includeStateSurcharge: false });
    const allocatedBill = 20 * within.rates.winter.peak.combined
      + 80 * within.rates.winter.offPeak.combined
      + 80 * above.rates.winter.peak.combined
      + 320 * above.rates.winter.offPeak.combined;
    expect(allocatedBill).toBeCloseTo(178.645, 10);
    expect(allocatedBill).toBeCloseTo(100 * 0.39757 + 400 * 0.36757 - 100 * 0.08140, 10);
  });

  it.each(['E-1', 'E-TOU-C'])('starts %s within when remaining>0, above when zero, overriding a conflicting tier', planId => {
    const within = build(planId, '3ce', { baselineRemainingKwh: 12.25, baselineTier: 'tier2' });
    const above = build(planId, '3ce', { baselineRemainingKwh: 0, baselineTier: 'tier1' });
    const withinCell = planId === 'E-1' ? within._flatRate : within.rates.winter.offPeak;
    const aboveCell = planId === 'E-1' ? above._flatRate : above.rates.winter.offPeak;
    expect(within._baselineRemainingKwh).toBe(12.25);
    expect(above._baselineRemainingKwh).toBe(0);
    expect(aboveCell.combined - withinCell.combined).toBeCloseTo(within._aboveBaselineDelta, 12);
    expect(within._pricingWarnings.join(' ')).toMatch(/override/i);
  });

  it.each([undefined, '', 'within', 'tier3', 1])('warns on unknown baseline %s and uses a non-discounted reference', baselineTier => {
    for (const planId of ['E-1', 'E-TOU-C']) {
      const result = build(planId, 'pge', { baselineTier, includeStateSurcharge: false });
      expect(result._baselineRemainingKwh).toBeNull();
      expect(result._pricingWarnings.join(' ')).toMatch(/baseline.*unknown.*non-discounted.*reference/i);
      const actual = planId === 'E-1' ? result._flatRate.combined : result.rates.winter.offPeak.combined;
      expect(actual).toBeCloseTo(planId === 'E-1' ? 0.40702 : 0.36757, 12);
    }
  });

  it.each([-1, NaN, Infinity, '10'])('rejects invalid remaining baseline %s without coercion or silent discount', baselineRemainingKwh => {
    const result = build('E-1', 'pge', { baselineRemainingKwh, includeStateSurcharge: false });
    expect(result._baselineRemainingKwh).toBeNull();
    expect(result._flatRate.combined).toBeCloseTo(0.40702, 12);
    expect(result._pricingWarnings.join(' ')).toMatch(/remaining.*finite.*nonnegative/i);
  });

  it('does not enable baseline deltas for plans without a baseline price', () => {
    const result = build('EV2-A', '3ce', { baselineRemainingKwh: 10 });
    expect(result._baselineRemainingKwh).toBeNull();
    expect(result._aboveBaselineDelta).toBe(0);
    expect(result._aboveBaselineComponent).toBeNull();
  });
});
