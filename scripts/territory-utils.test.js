import { describe, expect, it } from 'vitest';
import { buildTerritoryData, validateTerritoryData } from './territory-utils.js';

const ratePlanFiles = {
  pge: {
    ratePlans: {
      'EV2-A': {
        rates: {
          ccaGeneration: {
            '3ce': {},
          },
        },
      },
    },
  },
  sce: {
    ratePlans: {
      'TOU-D-4-9PM': {
        rates: {
          ccaGeneration: {
            cpa: {},
            sbce: {},
          },
        },
      },
    },
  },
};

const serviceAreas = {
  serviceAreas: {
    'pge-3ce-sbco': {
      utility: 'PG&E',
      defaultPlanId: 'EV2-A',
      defaultProvider: 'pge',
      ccas: ['3ce'],
    },
    'pge-only': {
      utility: 'PG&E',
      defaultPlanId: 'EV2-A',
      defaultProvider: 'pge',
      ccas: [],
    },
    'sce-cpa-la': {
      utility: 'SCE',
      defaultPlanId: 'TOU-D-4-9PM',
      defaultProvider: 'cpa',
      ccas: ['cpa'],
    },
    'sce-sbce-sb': {
      utility: 'SCE',
      defaultPlanId: 'TOU-D-4-9PM',
      defaultProvider: 'sbce',
      ccas: ['sbce'],
    },
    'sce-only': {
      utility: 'SCE',
      defaultPlanId: 'TOU-D-4-9PM',
      defaultProvider: 'sce',
      ccas: [],
    },
  },
};

const rateRegistryIds = new Set(Object.keys(serviceAreas.serviceAreas));

const threeUtilityConfig = {
  pge: {
    id: 'pge',
    label: 'PG&E',
    bundledProviderId: 'pge',
    verifiedKey: 'pge',
    generatedKey: 'pgeTerritory',
    statsKey: 'pgeZipCount',
    territoryNote: 'PG&E fixture territory',
  },
  sce: {
    id: 'sce',
    label: 'SCE',
    bundledProviderId: 'sce',
    verifiedKey: 'sce',
    generatedKey: 'sceTerritory',
    statsKey: 'sceZipCount',
    territoryNote: 'SCE fixture territory',
  },
  sdge: {
    id: 'sdge',
    label: 'SDG&E',
    bundledProviderId: 'sdge',
    verifiedKey: 'sdge',
    generatedKey: 'sdgeTerritory',
    statsKey: 'sdgeZipCount',
    territoryNote: 'SDG&E fixture territory',
  },
};

function validate(overrides = {}) {
  return validateTerritoryData({
    pgeTerritory: { zips: { '93427': 'pge-3ce-sbco', '94804': 'pge-only', ...(overrides.pge ?? {}) } },
    sceTerritory: { zips: { '90265': 'sce-cpa-la', '92401': 'sce-only', ...(overrides.sce ?? {}) } },
    multiUtilityZips: { zips: { '93101': ['pge-3ce-sbco', 'sce-sbce-sb'], ...(overrides.multi ?? {}) } },
    serviceAreas: overrides.serviceAreas ?? serviceAreas,
    ratePlanFiles: overrides.ratePlanFiles ?? ratePlanFiles,
    rateRegistryIds: overrides.rateRegistryIds ?? rateRegistryIds,
  });
}

describe('territory validation', () => {
  it('passes for valid PG&E, SCE, direct-service, and multi-utility coverage', () => {
    expect(validate().ok).toBe(true);
  });

  it('fails when a ZIP references an unknown service area', () => {
    const result = validate({ pge: { '99998': 'pge-missing' } });
    expect(result.ok).toBe(false);
    expect(result.errors.map(error => error.message).join('\n')).toContain('unknown serviceAreaId pge-missing');
  });

  it('fails when a ZIP is assigned to both utilities without a multi-utility entry', () => {
    const result = validate({ pge: { '90265': 'pge-3ce-sbco' } });
    expect(result.ok).toBe(false);
    expect(result.errors.map(error => error.message).join('\n')).toContain('assigned to both PG&E and SCE');
  });

  it('fails when a multi-utility candidate is unknown', () => {
    const result = validate({ multi: { '93102': ['pge-3ce-sbco', 'sce-missing'] } });
    expect(result.ok).toBe(false);
    expect(result.errors.map(error => error.message).join('\n')).toContain('unknown serviceAreaId sce-missing');
  });

  it('fails when a default CCA provider is not backed by the default plan rates', () => {
    const brokenServiceAreas = structuredClone(serviceAreas);
    brokenServiceAreas.serviceAreas['sce-cpa-la'].defaultProvider = 'missing-cpa';
    const result = validate({ serviceAreas: brokenServiceAreas });
    expect(result.ok).toBe(false);
    expect(result.errors.map(error => error.message).join('\n')).toContain('default provider missing-cpa');
  });

  it('fails when a runtime service area is missing from the rate registry', () => {
    const result = validate({ rateRegistryIds: new Set(['pge-3ce-sbco']) });
    expect(result.ok).toBe(false);
    expect(result.errors.map(error => error.message).join('\n')).toContain('missing from RATE_PLAN_REGISTRY');
  });

  it('warns while ZIP outputs remain bootstrapped after boundary snapshots are pinned', () => {
    const result = validateTerritoryData({
      pgeTerritory: { zips: { '93427': 'pge-3ce-sbco', '94804': 'pge-only' } },
      sceTerritory: { zips: { '90265': 'sce-cpa-la', '92401': 'sce-only' } },
      multiUtilityZips: { zips: { '93101': ['pge-3ce-sbco', 'sce-sbce-sb'] } },
      serviceAreas,
      ratePlanFiles,
      rateRegistryIds,
      manifest: { sourceMode: 'pinned-boundary-snapshots-bootstrap-runtime-zips' },
    });

    expect(result.ok).toBe(true);
    expect(result.warnings.map(warning => warning.message).join('\n')).toContain('ZIP outputs are bootstrapped');
  });

  it('validates a third utility fixture without PG&E/SCE-specific branches', () => {
    const expandedServiceAreas = structuredClone(serviceAreas);
    expandedServiceAreas.serviceAreas['sdge-sdcp-sd'] = {
      utilityId: 'sdge',
      utility: 'SDG&E',
      defaultPlanId: 'EV-TOU-5',
      defaultProvider: 'sdcp',
      ccas: ['sdcp'],
    };

    const result = validateTerritoryData({
      utilityTerritories: {
        pge: { zips: { '93427': 'pge-3ce-sbco' } },
        sce: { zips: { '90265': 'sce-cpa-la' } },
        sdge: { zips: { '92101': 'sdge-sdcp-sd' } },
      },
      multiUtilityZips: { zips: { '99999': ['pge-3ce-sbco', 'sdge-sdcp-sd'] } },
      serviceAreas: expandedServiceAreas,
      ratePlanFiles: {
        ...ratePlanFiles,
        sdge: {
          ratePlans: {
            'EV-TOU-5': {
              rates: {
                ccaGeneration: {
                  sdcp: {},
                },
              },
            },
          },
        },
      },
      rateRegistryIds: new Set([...Object.keys(expandedServiceAreas.serviceAreas)]),
      utilityConfig: threeUtilityConfig,
    });

    expect(result.ok).toBe(true);
    expect(result.stats.sdgeZipCount).toBe(1);
  });

  it('uses utilityId before legacy utility labels when selecting rate data', () => {
    const expandedServiceAreas = structuredClone(serviceAreas);
    expandedServiceAreas.serviceAreas['sdge-label-mismatch'] = {
      utilityId: 'sdge',
      utility: 'Legacy label that should not be used',
      defaultPlanId: 'EV-TOU-5',
      defaultProvider: 'sdge',
      ccas: [],
    };

    const result = validateTerritoryData({
      utilityTerritories: {
        pge: { zips: {} },
        sce: { zips: {} },
        sdge: { zips: { '92101': 'sdge-label-mismatch' } },
      },
      multiUtilityZips: { zips: {} },
      serviceAreas: expandedServiceAreas,
      ratePlanFiles: {
        ...ratePlanFiles,
        sdge: {
          ratePlans: {
            'EV-TOU-5': {
              rates: {
                generation: { allUsage: 0.1 },
              },
            },
          },
        },
      },
      rateRegistryIds: new Set([...Object.keys(expandedServiceAreas.serviceAreas)]),
      utilityConfig: threeUtilityConfig,
    });

    expect(result.ok).toBe(true);
  });
});

describe('territory generator', () => {
  it('builds PG&E, SCE, multi-utility, and excluded fixture outputs', () => {
    const generated = buildTerritoryData({
      verifiedZips: {
        pge: { zips: { '93427': 'pge-3ce-sbco', '94804': 'pge-only' } },
        sce: { zips: { '90265': 'sce-cpa-la', '92401': 'sce-only' } },
        multiUtility: { zips: { '93101': ['pge-3ce-sbco', 'sce-sbce-sb'] } },
        excluded: { zips: { '92101': { reason: 'SDG&E out of scope' } } },
      },
    });

    expect(generated.pgeTerritory.zips['93427']).toBe('pge-3ce-sbco');
    expect(generated.pgeTerritory.zips['94804']).toBe('pge-only');
    expect(generated.sceTerritory.zips['90265']).toBe('sce-cpa-la');
    expect(generated.sceTerritory.zips['92401']).toBe('sce-only');
    expect(generated.multiUtilityZips.zips['93101']).toEqual(['pge-3ce-sbco', 'sce-sbce-sb']);
    expect(generated.excluded['92101'].reason).toBe('SDG&E out of scope');
  });

  it('applies documented multi-utility overrides after source data', () => {
    const generated = buildTerritoryData({
      verifiedZips: {
        pge: { zips: { '93117': 'pge-3ce-sbco' } },
        sce: { zips: { '93117': 'sce-sbce-sb' } },
        multiUtility: { zips: {} },
      },
      manualOverrides: [
        {
          zip: '93117',
          action: 'multiUtility',
          candidates: ['sce-sbce-sb', 'pge-3ce-sbco'],
          reason: 'fixture overlap',
          source: 'test',
        },
      ],
    });

    expect(generated.multiUtilityZips.zips['93117']).toEqual(['pge-3ce-sbco', 'sce-sbce-sb']);
    expect(generated.appliedOverrides).toHaveLength(1);
  });

  it('builds third utility fixture output from the same generator path', () => {
    const generated = buildTerritoryData({
      utilityConfig: threeUtilityConfig,
      verifiedZips: {
        pge: { zips: {} },
        sce: { zips: {} },
        sdge: { zips: { '92101': 'sdge-sdcp-sd' } },
        multiUtility: { zips: {} },
      },
    });

    expect(generated.sdgeTerritory.zips['92101']).toBe('sdge-sdcp-sd');
  });
});
