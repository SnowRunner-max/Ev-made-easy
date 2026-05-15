import ratePlans from './ratePlans.json';
import sceRatePlans from './sceRatePlans.json';
import tdpudRatePlans from './tdpudRatePlans.json';
import libertyRatePlans from './libertyRatePlans.json';
import pgeTerritory from './pgeTerritory.json';
import sceTerritory from './sceTerritory.json';
import tdpudTerritory from './tdpudTerritory.json';
import libertyTerritory from './libertyTerritory.json';

export const UTILITY_REGISTRY = {
  pge: {
    id: 'pge',
    label: 'PG&E',
    bundledProviderId: 'pge',
    directServiceAreaId: 'pge-only',
    ratePlans,
    territory: pgeTerritory,
    metadataKeys: {
      effectiveDate: 'pgeEffectiveDate',
      adviceLetter: 'pgeAdviceLetter',
    },
  },
  sce: {
    id: 'sce',
    label: 'SCE',
    bundledProviderId: 'sce',
    directServiceAreaId: 'sce-only',
    ratePlans: sceRatePlans,
    territory: sceTerritory,
    metadataKeys: {
      effectiveDate: 'sceEffectiveDate',
      adviceLetter: 'sceAdviceLetter',
    },
  },
  tdpud: {
    id: 'tdpud',
    label: 'TDPUD',
    bundledProviderId: 'tdpud',
    directServiceAreaId: 'tdpud-truckee',
    ratePlans: tdpudRatePlans,
    territory: tdpudTerritory,
    metadataKeys: {
      effectiveDate: 'effectiveDate',
      adviceLetter: null,
    },
  },
  liberty: {
    id: 'liberty',
    label: 'Liberty',
    bundledProviderId: 'liberty',
    directServiceAreaId: 'liberty-tahoe',
    ratePlans: libertyRatePlans,
    territory: libertyTerritory,
    metadataKeys: {
      effectiveDate: 'effectiveDate',
      adviceLetter: null,
    },
  },
};

export const UTILITY_ORDER = Object.keys(UTILITY_REGISTRY);

export function getUtilityConfig(utilityId) {
  return UTILITY_REGISTRY[utilityId] ?? null;
}

export function getUtilityConfigForServiceArea(serviceArea) {
  if (!serviceArea) return null;
  if (serviceArea.utilityId) return getUtilityConfig(serviceArea.utilityId);
  return Object.values(UTILITY_REGISTRY).find(utility => utility.label === serviceArea.utility) ?? null;
}

export function getUtilityTerritories() {
  return UTILITY_ORDER.map(utilityId => {
    const utility = UTILITY_REGISTRY[utilityId];
    return {
      utilityId,
      label: utility.label,
      zips: utility.territory.zips ?? {},
    };
  });
}
