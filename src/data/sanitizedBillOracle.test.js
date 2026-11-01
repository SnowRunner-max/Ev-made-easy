import { describe, expect, it } from 'vitest';
import ratePlans from './ratePlans.json';
import { buildEffectivePlanConfig } from './effectivePlanConfig';

// Sanitized net-usage rows only. No statement or personal/account identifiers.
// This oracle reconciles a single statement, not a reusable NEM settlement model.
const rows = [
  { season: 'summer', period: 'peak', kwh: 43.0846, bundled: 0.53809, generation: 0.17641, credit: 0.17819 },
  { season: 'summer', period: 'partPeak', kwh: 84.0688, bundled: 0.42760, generation: 0.13214, credit: 0.13348 },
  { season: 'summer', period: 'offPeak', kwh: 549.9537, bundled: 0.22558, generation: 0.09141, credit: 0.09234 },
  { season: 'winter', period: 'peak', kwh: 16.5228, bundled: 0.41099, generation: 0.12010, credit: 0.12132 },
  { season: 'winter', period: 'partPeak', kwh: 24.2946, bundled: 0.39428, generation: 0.10774, credit: 0.10883 },
  { season: 'winter', period: 'offPeak', kwh: 172.1856, bundled: 0.22558, generation: 0.08449, credit: 0.08535 },
];
const cents = amount => Math.round((amount + Number.EPSILON) * 100);
const sum = values => values.reduce((total, value) => total + value, 0);

describe('sanitized independent PG&E/3CE statement oracle', () => {
  it('reconciles published generation credits, seasonal PCIA and franchise lines with bill line rounding', () => {
    const expected = {
      summer: { credit: 6968, pcia: 3564, franchise: 33 },
      winter: { credit: 1934, pcia: 1121, franchise: 10 },
    };
    for (const season of ['summer', 'winter']) {
      const seasonal = rows.filter(row => row.season === season);
      const kwh = sum(seasonal.map(row => row.kwh));
      expect(sum(seasonal.map(row => cents(row.kwh * row.credit)))).toBe(expected[season].credit);
      expect(cents(kwh * 0.05264)).toBe(expected[season].pcia);
      expect(cents(kwh * 0.00048)).toBe(expected[season].franchise);
    }
  });

  it('reconciles current/deferred/fixed totals without treating NBC reconciliation as a reusable fee', () => {
    const netKwh = sum(rows.map(row => row.kwh));
    expect(netKwh).toBeCloseTo(890.1101, 10);
    expect(916.9128 - 26.8027).toBeCloseTo(netKwh, 10);
    const bundled = sum(rows.map(row => cents(row.kwh * row.bundled)));
    const generationCredits = 6968 + 1934;
    const pcia = 3564 + 1121;
    const franchise = 33 + 10;
    // Statement-only NBC replacement evidence: these are not a tariff rate.
    const nbcReconciliation = -833 + 854 - 263 + 265;
    expect(nbcReconciliation).toBe(23);
    const pgeAccrued = bundled - generationCredits + pcia + franchise + nbcReconciliation;
    const ccaGeneration = sum(rows.map(row => cents(row.kwh * row.generation)));
    const energySurcharge = cents(netKwh * 0.00030);
    const ccaCurrentlyDue = ccaGeneration + energySurcharge;
    expect(ccaGeneration).toBe(8813);
    expect(energySurcharge).toBe(27);
    expect(ccaCurrentlyDue).toBe(8840);
    expect(pgeAccrued).toBe(19689);
    const variableCharges = pgeAccrued + ccaCurrentlyDue;
    const fixedCharge = cents(29 * 0.79343);
    expect(variableCharges).toBe(28529);
    expect(fixedCharge).toBe(2301);
    expect(variableCharges + fixedCharge).toBe(30830);
    expect(ccaCurrentlyDue + fixedCharge).toBe(11141);
  });

  it('matches component-only pricing independently and keeps the statement-specific NBC difference outside runtime rates', () => {
    const effective = buildEffectivePlanConfig({
      planConfig: ratePlans.ratePlans['EV2-A'],
      serviceArea: { utilityId: 'pge' },
      providerId: '3ce',
      tierId: '3cchoice',
      accountOptions: { pciaVintage: 2021 },
    });
    const componentOnly = sum(rows.map(row => row.kwh * effective.rates[row.season][row.period].combined));
    expect(cents(componentOnly)).toBe(28506);
    expect(28529 - cents(componentOnly)).toBe(23);
    for (const row of rows) {
      const components = effective.rates[row.season][row.period].components;
      expect(Object.keys(components).sort()).toEqual(['delivery', 'energySurcharge', 'franchiseFee', 'generation', 'pcia']);
      expect(components.generation).toBe(row.generation);
    }
  });
});
