import { describe, expect, it } from 'vitest';
import sdgeRatePlans from './sdgeRatePlans.json';

describe('SDG&E rate plan metadata', () => {
  it('stores effective dates as full ISO dates for staleness checks', () => {
    expect(sdgeRatePlans._metadata.sdgeEffectiveDate).toBe('2026-04-01');
    expect(sdgeRatePlans._metadata.sdcpRateEffectiveDate).toBe('2026-01-01');
    expect(sdgeRatePlans._metadata.ceaRateEffectiveDate).toBe('2026-02-01');
    expect(sdgeRatePlans._metadata.sdgeEffectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('SDG&E rate plan integrity', () => {
  it('backs SDCP and CEA generation for every TOU period', () => {
    for (const [planId, plan] of Object.entries(sdgeRatePlans.ratePlans)) {
      for (const providerId of ['sdcp', 'cea']) {
        const provider = plan.rates.ccaGeneration[providerId];
        expect(provider, `${planId} ${providerId}`).toBeTruthy();
        const defaultTier = provider.tiers[provider.defaultTier];
        expect(defaultTier, `${planId} ${providerId} default tier`).toBeTruthy();

        if (!plan.touPeriods) {
          expect(defaultTier.allUsage).toBeGreaterThan(0);
          continue;
        }

        for (const [season, periods] of Object.entries(plan.rates.delivery)) {
          for (const period of Object.keys(periods)) {
            expect(defaultTier[season][period], `${planId} ${providerId} ${season} ${period}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
