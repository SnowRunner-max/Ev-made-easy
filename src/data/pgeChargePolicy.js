/**
 * Runtime policy for the checked-in March 2026 PG&E energy-rate snapshot.
 * This deliberately does not rewrite the source-rate schema or infer an account
 * vintage from its ZIP/community. All amounts are dollars per metered kWh.
 *
 * PG&E EV2 sheets 3–5 exclude BOTH generation and bundled PCIA for CCA
 * service. The stored delivery (= bundled total - published generation) still
 * includes bundled PCIA -0.01011, so verified 3CE delivery must add 0.01011.
 * E-1 / E-TOU-C / E-TOU-D / E-ELEC / EV use the same bundled-PCIA component.
 *
 * Vintage PCIA and franchise values below: official 3CE residential rate sheet,
 * effective 2026-02-15, page 2 (charges effective 2026-01-01).
 * State surcharge: CDTFA L-1020, calendar 2026, separately added, never rounded
 * here. NEM billing bases, NBC replacement, fixed charges and settlement are
 * outside this incremental-import rate policy.
 *
 * CCA-CRS sheet 2 includes CARE/medical/continuous-DA exemptions with effects
 * beyond PCIA. A boolean alone cannot select a complete exempt tariff. Until
 * that customer-group pricing is verified, pciaExempt requests retain a warned
 * standard reference rather than fabricate a complete discounted price.
 * Other CCAs (including Ava's unverified embedded-fee note) retain their old
 * numeric composition; the 3CE charges must not be applied globally.
 */
export const PGE_CHARGE_POLICY = Object.freeze({
  effectiveDate: '2026-03-01',
  bundledPcia: -0.01011,
  stateSurcharge: 0.00030,
  referenceVintage: '2021',
  sources: Object.freeze({
    bundledComponents: 'https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_EV2%20(Sch).pdf',
    ccaRateSheet: 'https://3cenergy.org/wp-content/uploads/2026/04/PGE-Residential-Website-Rate-Sheet-2026.02.15_with3Cflex.pdf',
    ccaExemptions: 'https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_CCA-CRS.pdf',
    stateSurcharge: 'https://cdtfa.ca.gov/formspubs/l1020.pdf',
  }),
});

const VINTAGE_CHARGES = Object.freeze(Object.fromEntries([
  ['2009', 0.02973, 0.00064], ['2010', 0.03366, 0.00061],
  ['2011', 0.03492, 0.00060], ['2012', 0.03676, 0.00059],
  ['2013', 0.03708, 0.00059], ['2014', 0.03686, 0.00059],
  ['2015', 0.03680, 0.00059], ['2016', 0.03687, 0.00059],
  ['2017', 0.03661, 0.00059], ['2018', 0.03679, 0.00059],
  ['2019', 0.03725, 0.00059], ['2020', 0.03632, 0.00059],
  ['2021', 0.05264, 0.00048], ['2022', 0.05272, 0.00048],
  ['2023', 0.05380, 0.00047], ['2024', 0.05066, 0.00049],
  ['2025', -0.01011, 0.00093], ['2026', -0.01011, 0.00093],
].map(([vintage, pcia, franchiseFee]) => [vintage, Object.freeze({ pcia, franchiseFee })])));

export function getPgeChargePolicy({ providerId, isBundledProvider, accountOptions = {} }) {
  const warnings = [];
  if (!isBundledProvider && providerId !== '3ce') {
    return {
      deliveryAdjustment: 0,
      components: {},
      pciaVintage: null,
      warnings: ['Provider-specific PG&E CCA charges, embedded fees and state surcharge are unverified; existing numeric rates are retained, not a complete variable price.'],
    };
  }

  let pciaVintage = null;
  let components = {};
  if (!isBundledProvider) {
    const requested = accountOptions.pciaVintage;
    const vintage = (typeof requested === 'string' || Number.isInteger(requested))
      ? String(requested)
      : null;
    if (vintage && Object.hasOwn(VINTAGE_CHARGES, vintage)) {
      pciaVintage = vintage;
    } else {
      pciaVintage = PGE_CHARGE_POLICY.referenceVintage;
      warnings.push('PCIA vintage is unknown or unsupported; using 2021 standard reference charges, not an account-verified vintage.');
    }
    components = { ...VINTAGE_CHARGES[pciaVintage] };
    if (accountOptions.pciaExempt === true) {
      warnings.push('PCIA-exempt customer-group pricing is unsupported; standard non-exempt reference charges are retained. CCA-CRS exemptions can affect other delivery components; no complete discounted price is claimed.');
    } else if (accountOptions.pciaExempt != null && accountOptions.pciaExempt !== false) {
      warnings.push('PCIA exemption must be a boolean; standard non-exempt reference charges are retained.');
    }
  }

  if (accountOptions.includeStateSurcharge === false) {
    warnings.push('State energy surcharge is excluded from this tariff-only price.');
  } else {
    components.energySurcharge = PGE_CHARGE_POLICY.stateSurcharge;
    if (accountOptions.includeStateSurcharge != null && accountOptions.includeStateSurcharge !== true) {
      warnings.push('State surcharge inclusion must be a boolean; the verified standard surcharge is included.');
    }
  }

  return {
    deliveryAdjustment: isBundledProvider ? 0 : -PGE_CHARGE_POLICY.bundledPcia,
    components,
    pciaVintage,
    warnings,
  };
}
