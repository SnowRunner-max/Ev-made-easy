import { describe, expect, it } from 'vitest';
import serviceAreasData from './serviceAreas.json';
import { RATE_PLAN_REGISTRY } from './ratePlanRegistry';
import { UTILITY_REGISTRY, getUtilityConfigForServiceArea } from './utilityRegistry';
import { buildEffectivePlanConfig, getProviderOptions } from './effectivePlanConfig';

describe('utility registry', () => {
  it('backs every service area with a utility config and rate data', () => {
    for (const [serviceAreaId, serviceArea] of Object.entries(serviceAreasData.serviceAreas)) {
      const utility = getUtilityConfigForServiceArea(serviceArea);
      const rateData = RATE_PLAN_REGISTRY[serviceAreaId];

      expect(utility, serviceAreaId).toBeTruthy();
      expect(UTILITY_REGISTRY[serviceArea.utilityId], serviceAreaId).toBe(utility);
      expect(rateData?.ratePlans?.[serviceArea.defaultPlanId], serviceAreaId).toBeTruthy();
    }
  });

  it('validates service-area default provider backing', () => {
    for (const [serviceAreaId, serviceArea] of Object.entries(serviceAreasData.serviceAreas)) {
      const utility = getUtilityConfigForServiceArea(serviceArea);
      const defaultPlan = RATE_PLAN_REGISTRY[serviceAreaId].ratePlans[serviceArea.defaultPlanId];
      const providerIsBundled = serviceArea.defaultProvider === utility.bundledProviderId;
      const providerIsCcaBacked = defaultPlan.rates.ccaGeneration?.[serviceArea.defaultProvider] != null;

      expect(providerIsBundled || providerIsCcaBacked, serviceAreaId).toBe(true);
    }
  });
});

describe('effective plan config helpers', () => {
  it('derives utility labels for an SCE bundled provider', () => {
    const serviceArea = serviceAreasData.serviceAreas['sce-only'];
    const planConfig = RATE_PLAN_REGISTRY['sce-only'].ratePlans[serviceArea.defaultPlanId];
    const effective = buildEffectivePlanConfig({
      planConfig,
      serviceArea,
      providerId: 'sce',
      tierId: null,
    });

    expect(effective.deliveryLabel).toBe('SCE Delivery');
    expect(effective.generationLabel).toBe('SCE Generation');
    expect(effective._displayProvider).toBe('SCE Bundled Service');
  });

  it('falls back to service-area labels for a future SDG&E utility config', () => {
    const options = getProviderOptions(
      { rates: { ccaGeneration: {} } },
      { utilityId: 'sdge', utility: 'SDG&E', defaultProvider: 'sdge', ccas: [] }
    );

    expect(options).toEqual([{ value: 'sdge', label: 'SDG&E Bundled' }]);
  });
});
