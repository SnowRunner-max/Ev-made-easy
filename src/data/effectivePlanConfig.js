import { getUtilityConfigForServiceArea } from './utilityRegistry';

function buildRateMatrix(rawRates, providerId, tierId) {
  const seasons = Object.keys(rawRates.delivery);
  return Object.fromEntries(
    seasons.map(season => [
      season,
      Object.fromEntries(
        Object.keys(rawRates.delivery[season]).map(period => {
          const delivery = rawRates.delivery[season][period];
          const bundled = rawRates.totalBundled[season][period];
          const ccaEntry = rawRates.ccaGeneration?.[providerId];

          if (!ccaEntry) {
            return [
              period,
              {
                combined: bundled,
                delivery,
                generation: rawRates.generation[season][period],
              },
            ];
          }

          const tier = tierId ?? ccaEntry.defaultTier;
          const generation = ccaEntry.tiers[tier][season][period];
          return [period, { combined: delivery + generation, delivery, generation }];
        })
      ),
    ])
  );
}

export function getBundledProviderId(serviceArea) {
  return getUtilityConfigForServiceArea(serviceArea)?.bundledProviderId ?? serviceArea?.defaultProvider;
}

export function getProviderOptions(planConfig, serviceArea) {
  const utility = getUtilityConfigForServiceArea(serviceArea);
  const bundledProviderId = utility?.bundledProviderId ?? serviceArea.defaultProvider;
  const bundledLabel = `${utility?.label ?? serviceArea.utility} Bundled`;

  return [
    { value: bundledProviderId, label: bundledLabel },
    ...(serviceArea.ccas ?? [])
      .filter(ccaId => planConfig.rates.ccaGeneration?.[ccaId] != null)
      .map(ccaId => {
        const ccaData = planConfig.rates.ccaGeneration[ccaId];
        return { value: ccaId, label: `${ccaData.name} (CCA)` };
      }),
  ];
}

export function normalizeProvider(providerId, providerOptions, serviceArea) {
  return providerOptions.some(option => option.value === providerId)
    ? providerId
    : getBundledProviderId(serviceArea);
}

export function getTierState(planConfig, providerId, tierId) {
  const ccaEntry = planConfig.rates.ccaGeneration?.[providerId] ?? null;
  const tierOptions = ccaEntry
    ? Object.entries(ccaEntry.tiers).map(([value, tier]) => ({ value, label: tier.label }))
    : [];
  const effectiveTier = ccaEntry ? (tierId ?? ccaEntry.defaultTier) : null;

  return {
    ccaEntry,
    tierOptions,
    effectiveTier,
    showTierSelector: ccaEntry != null && tierOptions.length > 1,
  };
}

export function buildEffectivePlanConfig({ planConfig, serviceArea, providerId, tierId }) {
  const utility = getUtilityConfigForServiceArea(serviceArea);
  const utilityLabel = utility?.label ?? serviceArea?.utility ?? 'Utility';
  const ccaEntry = planConfig.rates.ccaGeneration?.[providerId] ?? null;
  const isBundledProvider = !ccaEntry;
  const activeTier = ccaEntry ? (tierId ?? ccaEntry.defaultTier) : null;
  const providerLabel = ccaEntry
    ? `${ccaEntry.name} — ${ccaEntry.tiers[activeTier].label}`
    : `${utilityLabel} Bundled Service`;
  const deliveryLabel = `${utilityLabel} Delivery`;
  const generationLabel = ccaEntry ? providerLabel : `${utilityLabel} Generation`;

  if (!planConfig.touPeriods) {
    const rawRates = planConfig.rates;
    const delivery = rawRates.delivery.tier1;
    const generation = ccaEntry
      ? ccaEntry.tiers[activeTier].allUsage
      : rawRates.generation.allUsage;
    const combined = ccaEntry
      ? delivery + generation
      : rawRates.totalBundled.tier1;

    return {
      ...planConfig,
      _displayProvider: providerLabel,
      _flatRate: { combined, delivery, generation },
      deliveryLabel,
      generationLabel,
      isBundledProvider,
      utilityId: utility?.id,
      bundledProviderId: utility?.bundledProviderId,
    };
  }

  return {
    ...planConfig,
    rates: buildRateMatrix(planConfig.rates, providerId, activeTier),
    _displayProvider: providerLabel,
    deliveryLabel,
    generationLabel,
    isBundledProvider,
    utilityId: utility?.id,
    bundledProviderId: utility?.bundledProviderId,
  };
}
