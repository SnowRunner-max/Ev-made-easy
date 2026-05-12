import pgeTerritory from './pgeTerritory.json';
import sceTerritory from './sceTerritory.json';
import tdpudTerritory from './tdpudTerritory.json';
import libertyTerritory from './libertyTerritory.json';

export const UTILITY_CONFIG = {
  'PG&E': {
    id: 'pge',
    displayName: 'PG&E',
    bundledProvider: 'pge',
    directServiceAreaId: 'pge-only',
    territory: pgeTerritory,
  },
  SCE: {
    id: 'sce',
    displayName: 'SCE',
    bundledProvider: 'sce',
    directServiceAreaId: 'sce-only',
    territory: sceTerritory,
  },
  TDPUD: {
    id: 'tdpud',
    displayName: 'TDPUD',
    bundledProvider: 'tdpud',
    directServiceAreaId: 'tdpud-truckee',
    territory: tdpudTerritory,
  },
  Liberty: {
    id: 'liberty',
    displayName: 'Liberty',
    bundledProvider: 'liberty',
    directServiceAreaId: 'liberty-tahoe',
    territory: libertyTerritory,
  },
};

export const SUPPORTED_UTILITIES = Object.values(UTILITY_CONFIG);

export function getUtilityConfig(utilityName) {
  return UTILITY_CONFIG[utilityName] ?? null;
}
