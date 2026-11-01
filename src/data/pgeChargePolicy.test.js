import { describe, expect, it } from 'vitest';
import { getPgeChargePolicy, PGE_CHARGE_POLICY } from './pgeChargePolicy';

// Independent transcription of the official 3CE 2026-02-15 rate sheet, page 2.
const vintageCharges = [
  [2009, 0.02973, 0.00064], [2010, 0.03366, 0.00061],
  [2011, 0.03492, 0.00060], [2012, 0.03676, 0.00059],
  [2013, 0.03708, 0.00059], [2014, 0.03686, 0.00059],
  [2015, 0.03680, 0.00059], [2016, 0.03687, 0.00059],
  [2017, 0.03661, 0.00059], [2018, 0.03679, 0.00059],
  [2019, 0.03725, 0.00059], [2020, 0.03632, 0.00059],
  [2021, 0.05264, 0.00048], [2022, 0.05272, 0.00048],
  [2023, 0.05380, 0.00047], [2024, 0.05066, 0.00049],
  [2025, -0.01011, 0.00093], [2026, -0.01011, 0.00093],
];

const policy = (accountOptions = {}, providerId = '3ce') => getPgeChargePolicy({
  providerId,
  isBundledProvider: providerId === 'pge',
  accountOptions,
});

describe('verified PG&E charge policy', () => {
  it.each(vintageCharges)('uses published vintage %i PCIA and franchise fees', (pciaVintage, pcia, franchiseFee) => {
    const result = policy({ pciaVintage });
    expect(result.deliveryAdjustment).toBe(0.01011);
    expect(result.components).toEqual({ pcia, franchiseFee, energySurcharge: 0.00030 });
    expect(result.pciaVintage).toBe(String(pciaVintage));
    expect(result.warnings).toEqual([]);
  });

  it('accepts explicit string vintage and preserves negative PCIA', () => {
    expect(policy({ pciaVintage: '2026' }).components.pcia).toBe(-0.01011);
  });

  it.each([undefined, null, '', 'unknown', '2008', 2027, 2021.5, true])(
    'warns about an unknown vintage %s instead of inferring it from location',
    pciaVintage => {
      const result = policy({ pciaVintage });
      expect(result.pciaVintage).toBe('2021');
      expect(result.components.pcia).toBe(0.05264);
      expect(result.warnings.join(' ')).toMatch(/vintage.*2021.*reference/i);
    }
  );

  it('preserves a standard reference and warns rather than claiming complete exempt pricing', () => {
    const result = policy({ pciaVintage: 2021, pciaExempt: true });
    expect(result.components.pcia).toBe(0.05264);
    expect(result.warnings.join(' ')).toMatch(/exempt.*unsupported.*standard.*reference/i);
  });

  it('never imposes CCA fees or delivery normalization on bundled service', () => {
    const result = policy({ pciaVintage: 2021 }, 'pge');
    expect(result.deliveryAdjustment).toBe(0);
    expect(result.components).toEqual({ energySurcharge: 0.00030 });
    expect(result.pciaVintage).toBeNull();
  });

  it('can explicitly exclude the separately itemized state surcharge', () => {
    const result = policy({ pciaVintage: 2021, includeStateSurcharge: false });
    expect(result.components).toEqual({ pcia: 0.05264, franchiseFee: 0.00048 });
    expect(result.warnings.join(' ')).toMatch(/state.*excluded/i);
  });

  it.each(['ava', 'pce', 'sjce'])('does not universalize 3CE charges to %s', providerId => {
    const result = policy({ pciaVintage: 2021, includeStateSurcharge: true }, providerId);
    expect(result.deliveryAdjustment).toBe(0);
    expect(result.components).toEqual({});
    expect(result.warnings.join(' ')).toMatch(/unverified/i);
  });

  it('documents the tariff snapshot and authoritative evidence', () => {
    expect(PGE_CHARGE_POLICY.sources.ccaRateSheet).toContain('2026.02.15');
    expect(PGE_CHARGE_POLICY.sources.ccaExemptions).toContain('CCA-CRS');
    expect(PGE_CHARGE_POLICY.sources.stateSurcharge).toContain('l1020');
    expect(PGE_CHARGE_POLICY.effectiveDate).toBe('2026-03-01');
  });
});
