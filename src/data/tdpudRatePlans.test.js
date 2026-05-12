import { describe, expect, it } from 'vitest';
import tdpudRatePlans from './tdpudRatePlans.json';

describe('TDPUD rate plan metadata', () => {
  it('stores the 2026 effective date as a full ISO date for staleness checks', () => {
    expect(tdpudRatePlans._metadata.effectiveDate).toBe('2026-01-01');
    expect(tdpudRatePlans._metadata.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
