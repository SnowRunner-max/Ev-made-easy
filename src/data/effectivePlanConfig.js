import { getUtilityConfigForServiceArea } from './utilityRegistry';
import { getPgeChargePolicy } from './pgeChargePolicy';

/**
 * Only explicit tier1 / tier2 assumptions are supported. Remaining baseline
 * kWh, when finite and nonnegative, takes precedence over a tier assumption.
 * No baseline allowance is inferred from location, season or medical status.
 *
 * A positive remaining allowance starts cells within baseline. The integrator
 * adds _aboveBaselineDelta ONCE after using it up. Zero already starts above;
 * null means a fixed selected/reference tier and must not trigger another delta.
 */
function getBaselineState(planConfig, utilityId, accountOptions) {
  const isE1 = utilityId === 'pge' && planConfig.scheduleCode === 'E-1';
  const isEtouc = utilityId === 'pge' && planConfig.scheduleCode === 'E-TOU-C';
  const warnings = [];
  const state = {
    _baselineTier: null,
    _baselineRemainingKwh: null,
    _aboveBaselineDelta: 0,
    _aboveBaselineComponent: null,
    warnings,
  };
  if (!isE1 && !isEtouc) return state;

  state._aboveBaselineDelta = isE1
    ? planConfig.rates.delivery.tier2 - planConfig.rates.delivery.tier1
    : -planConfig.baselineCredit.rate;
  state._aboveBaselineComponent = isE1 ? 'delivery' : 'baselineCredit';

  const remaining = accountOptions.baselineRemainingKwh;
  const validRemaining = Number.isFinite(remaining) && remaining >= 0;
  if (remaining != null && !validRemaining) {
    warnings.push('Remaining baseline kWh must be finite and nonnegative; invalid input is ignored.');
  }
  const tier = accountOptions.baselineTier;
  const validTier = tier === 'tier1' || tier === 'tier2';
  if (validRemaining) {
    state._baselineRemainingKwh = remaining;
    state._baselineTier = remaining > 0 ? 'tier1' : 'tier2';
    if (validTier && tier !== state._baselineTier) {
      warnings.push('Remaining baseline kWh overrides the conflicting baseline tier assumption.');
    }
  } else if (validTier) {
    state._baselineTier = tier;
  } else {
    warnings.push('Baseline eligibility is unknown; using the published non-discounted tier2 reference. Select tier1/tier2 or supply remaining baseline kWh for an explicit assumption.');
  }
  if (isEtouc) {
    warnings.push('E-TOU-C assigns tiers proportionally across TOU usage at billing-period level; this is an incremental-energy baseline assumption, not a full household bill allocation.');
  }
  return state;
}

function composeRate({ delivery, generation, bundled, isBundledProvider, chargePolicy, baselineCredit }) {
  const adjustedDelivery = delivery + chargePolicy.deliveryAdjustment;
  const components = { delivery: adjustedDelivery, generation, ...chargePolicy.components };
  if (baselineCredit) components.baselineCredit = baselineCredit;

  // Retain the published bundled total; CCA composition uses normalized delivery
  // and generation. Never round tariff precision to display/bill-line precision.
  const base = isBundledProvider ? bundled : adjustedDelivery + generation;
  const additions = Object.values(chargePolicy.components).reduce((sum, value) => sum + value, 0);
  const combined = base + additions + baselineCredit;
  return { combined, delivery: adjustedDelivery, generation, components };
}

function buildRateMatrix(rawRates, providerId, tierId, chargePolicy, baselineCredit) {
  const seasons = Object.keys(rawRates.delivery);
  const ccaEntry = rawRates.ccaGeneration?.[providerId];
  return Object.fromEntries(
    seasons.map(season => [
      season,
      Object.fromEntries(
        Object.keys(rawRates.delivery[season]).map(period => {
          const delivery = rawRates.delivery[season][period];
          const bundled = rawRates.totalBundled[season][period];
          const generation = ccaEntry
            ? ccaEntry.tiers[tierId][season][period]
            : rawRates.generation[season][period];
          return [period, composeRate({
            delivery,
            generation,
            bundled,
            isBundledProvider: !ccaEntry,
            chargePolicy,
            baselineCredit,
          })];
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

export function buildEffectivePlanConfig({ planConfig, serviceArea, providerId, tierId, accountOptions = {} }) {
  accountOptions = accountOptions ?? {};
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
  const chargePolicy = utility?.id === 'pge'
    ? getPgeChargePolicy({ providerId, isBundledProvider, accountOptions })
    : {
      deliveryAdjustment: 0,
      components: {},
      pciaVintage: null,
      warnings: ['Provider-specific surcharges and exemptions are unverified for this utility; existing numeric rates are retained, not a complete variable price.'],
    };
  const { warnings: baselineWarnings, ...baselineState } = getBaselineState(planConfig, utility?.id, accountOptions);
  const baselineCredit = utility?.id === 'pge'
    && planConfig.scheduleCode === 'E-TOU-C'
    && baselineState._baselineTier === 'tier1'
    ? planConfig.baselineCredit.rate
    : 0;
  const sharedConfig = {
    ...planConfig,
    ...baselineState,
    _displayProvider: providerLabel,
    _pciaVintage: chargePolicy.pciaVintage,
    _pricingWarnings: [...chargePolicy.warnings, ...baselineWarnings],
    deliveryLabel,
    generationLabel,
    isBundledProvider,
    utilityId: utility?.id,
    bundledProviderId: utility?.bundledProviderId,
  };
  if (utility?.id === 'pge' && (planConfig.rateDesignation === 'EV-B' || planConfig.scheduleCode === 'E-TOU-D')) {
    sharedConfig._pricingWarnings.push('Residential holiday observation is not tariff-verified; the internally consistent legacy observation assumption is retained.');
  }
  if (utility?.id === 'pge' && planConfig.rateDesignation === 'EV-B' && !isBundledProvider) {
    sharedConfig._pricingWarnings.push('EV-B delivery shoulder-hour shifts are verified; CCA generation alignment to those shifted windows is unverified. Treat the combined shoulder-period estimate as provisional.');
  }

  if (!planConfig.touPeriods) {
    const rawRates = planConfig.rates;
    const baselineTier = baselineState._baselineTier ?? (utility?.id === 'pge' ? 'tier2' : 'tier1');
    const delivery = rawRates.delivery[baselineTier];
    const generation = ccaEntry
      ? ccaEntry.tiers[activeTier].allUsage
      : rawRates.generation.allUsage;

    return {
      ...sharedConfig,
      _flatRate: composeRate({
        delivery,
        generation,
        bundled: rawRates.totalBundled[baselineTier],
        isBundledProvider,
        chargePolicy,
        baselineCredit,
      }),
    };
  }

  return {
    ...sharedConfig,
    rates: buildRateMatrix(planConfig.rates, providerId, activeTier, chargePolicy, baselineCredit),
  };
}
