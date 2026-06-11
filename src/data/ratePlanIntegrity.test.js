import { describe, expect, it } from 'vitest';
import { UTILITY_REGISTRY } from './utilityRegistry.js';

describe('rate plan integrity (all utilities)', () => {
  for (const { id: utilityId, ratePlans } of Object.values(UTILITY_REGISTRY)) {
    describe(utilityId, () => {
      for (const [planId, plan] of Object.entries(ratePlans.ratePlans)) {
        it(`${planId} keeps bundled totals equal to delivery plus generation`, () => {
          if (plan.touPeriods) {
            for (const [season, periods] of Object.entries(plan.rates.delivery)) {
              for (const [period, delivery] of Object.entries(periods)) {
                if (typeof delivery !== 'number') continue;
                const generation = plan.rates.generation[season][period];
                const total = plan.rates.totalBundled[season][period];
                expect(delivery + generation, `${utilityId} ${planId} ${season} ${period}`).toBeCloseTo(total, 5);
              }
            }
          }

          const tieredDelivery = plan.rates.delivery?.tier1;
          const tieredGeneration = plan.rates.generation?.allUsage;
          const tieredTotal = plan.rates.totalBundled?.tier1;
          if (tieredDelivery !== undefined && tieredGeneration !== undefined && tieredTotal !== undefined) {
            expect(tieredDelivery + tieredGeneration, `${utilityId} ${planId} tier1`).toBeCloseTo(tieredTotal, 5);
          }
        });
      }
    });
  }
});
