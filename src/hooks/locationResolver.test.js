import { describe, expect, it, vi } from 'vitest';
import { createLocationResolver } from './locationResolver';

const utilityTerritories = [
  { utilityId: 'pge', label: 'PG&E', zips: { '93427': 'pge-3ce-sbco' } },
  { utilityId: 'sce', label: 'SCE', zips: { '91001': 'sce-cpa-la' } },
  { utilityId: 'sdge', label: 'SDG&E', zips: { '92101': 'sdge-sdcp-sd' } },
];

function buildResolver() {
  const zipcodes = {
    lookup: vi.fn(zip => ({
      '93427': { zip: '93427', city: 'Buellton', state: 'CA' },
      '91001': { zip: '91001', city: 'Altadena', state: 'CA' },
      '92101': { zip: '92101', city: 'San Diego', state: 'CA' },
      '99999': { zip: '99999', city: 'Splitville', state: 'CA' },
      '10001': { zip: '10001', city: 'New York', state: 'NY' },
    })[zip] ?? null),
    lookupByName: vi.fn(city => ({
      'San Diego': [{ zip: '92101', city: 'San Diego', state: 'CA' }],
      Splitville: [{ zip: '99999', city: 'Splitville', state: 'CA' }],
      Nowhere: [{ zip: '90001', city: 'Los Angeles', state: 'CA' }],
    })[city] ?? []),
  };

  return createLocationResolver({
    zipcodes,
    utilityTerritories,
    multiUtilityZips: { zips: { '99999': ['pge-3ce-sbco', 'sdge-sdcp-sd'] } },
  });
}

describe('location resolver', () => {
  it('resolves a future third utility ZIP through configured territories', () => {
    expect(buildResolver()('92101')).toEqual({
      ok: true,
      data: { serviceAreaId: 'sdge-sdcp-sd', displayLabel: 'San Diego, CA', zip: '92101' },
    });
  });

  it('resolves a future third utility city through configured territories', () => {
    expect(buildResolver()('San Diego')).toEqual({
      ok: true,
      data: { serviceAreaId: 'sdge-sdcp-sd', displayLabel: 'San Diego, CA', zip: '92101' },
    });
  });

  it('returns multi_utility before assigning a territory', () => {
    const result = buildResolver()('99999');
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('multi_utility');
    expect(result.candidates).toEqual(['pge-3ce-sbco', 'sdge-sdcp-sd']);
  });

  it('returns not_supported for California ZIPs outside configured territories', () => {
    expect(buildResolver()('Nowhere')).toEqual({ ok: false, errorCode: 'not_supported' });
  });

  it('returns not_ca for ZIPs outside California', () => {
    expect(buildResolver()('10001')).toEqual({ ok: false, errorCode: 'not_ca' });
  });

  it('returns invalid_input for unknown ZIPs', () => {
    expect(buildResolver()('00000')).toEqual({ ok: false, errorCode: 'invalid_input' });
  });
});
