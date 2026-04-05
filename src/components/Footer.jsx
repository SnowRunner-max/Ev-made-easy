import { useState } from 'react';
import { PERIOD_DISPLAY } from '../engine/rateEngine';

const PERIOD_ORDER = ['peak', 'partPeak', 'offPeak'];

function RateTable({ rates, seasons }) {
  const seasonKeys = Object.keys(seasons);
  const periodKeys = PERIOD_ORDER.filter(p => rates[seasonKeys[0]][p] !== undefined);

  return (
    <table className="w-full text-xs border-collapse mt-2">
      <thead>
        <tr className="text-left text-[var(--text-muted)]">
          <th className="py-1.5 pr-4 font-medium">Period</th>
          {seasonKeys.map(s => (
            <th key={s} className="py-1.5 pr-4 font-medium capitalize">{seasons[s].label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periodKeys.map(period => (
          <tr key={period} className="border-t border-pewter-light">
            <td className="py-1.5 pr-4 text-[var(--text-secondary)]">{PERIOD_DISPLAY[period].label}</td>
            {seasonKeys.map(s => (
              <td key={s} className="py-1.5 pr-4 font-mono text-[var(--text-primary)]">
                ${rates[s][period].combined.toFixed(5)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TieredRateTable({ rates, provider }) {
  const delivery = rates.pgeDelivery;
  const cce = rates.cce;
  const bundled = rates.pgeTotalBundled;
  const combined1 = provider === 'pge' ? bundled.tier1 : delivery.tier1 + cce.allUsage;
  const combined2 = provider === 'pge' ? bundled.tier2 : delivery.tier2 + cce.allUsage;

  return (
    <table className="w-full text-xs border-collapse mt-2">
      <thead>
        <tr className="text-left text-[var(--text-muted)]">
          <th className="py-1.5 pr-4 font-medium">Usage Tier</th>
          <th className="py-1.5 pr-4 font-medium">Rate ($/kWh)</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-t border-pewter-light">
          <td className="py-1.5 pr-4 text-[var(--text-secondary)]">Tier 1 (0–100% of baseline)</td>
          <td className="py-1.5 pr-4 font-mono text-[var(--text-primary)]">${combined1.toFixed(5)}</td>
        </tr>
        <tr className="border-t border-pewter-light">
          <td className="py-1.5 pr-4 text-[var(--text-secondary)]">Tier 2 (above baseline)</td>
          <td className="py-1.5 pr-4 font-mono text-[var(--text-primary)]">${combined2.toFixed(5)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function Footer({ planConfig, globalMetadata, city, serviceArea }) {
  const [expanded, setExpanded] = useState(false);
  const { rates, touPeriods, seasons, fixedCharges } = planConfig;

  const bsc = fixedCharges?.type === 'incomeBasedBSC' ? fixedCharges.baseServicesCharge : null;
  const dmc = fixedCharges?.type === 'flatMeterCharge' ? fixedCharges.meterCharge : null;

  const isCCA = planConfig._displayProvider?.includes('3CE') || planConfig._displayProvider?.includes('Community Energy');

  return (
    <footer
      data-testid="app-footer"
      className="border-t border-pewter-light bg-white px-10 py-5 text-xs text-[var(--text-muted)] max-w-[1120px] mx-auto w-full"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[var(--text-muted)]">{planConfig.name} · {city?.name ?? 'Buellton'}, CA · {serviceArea?.shortLabel ?? 'PG&E + 3CE'}</p>
        <button
          data-testid="footer-toggle"
          onClick={() => setExpanded(e => !e)}
          className="text-paprika underline shrink-0 text-xs hover:text-paprika-hover transition-colors"
        >
          About these rates {expanded ? '▲' : '▼'}
        </button>
      </div>

      {expanded && (
        <div data-testid="footer-details" className="mt-4 pt-4 border-t border-pewter-light space-y-4 text-[var(--text-secondary)]">

          <section>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">All-in rates ($/kWh)</h3>
            <p className="text-[var(--text-muted)] mb-1">
              {planConfig._displayProvider} · {city?.name ?? 'Buellton'}, CA
            </p>
            {touPeriods ? (
              <RateTable rates={rates} seasons={seasons} />
            ) : (
              <TieredRateTable rates={rates} provider={isCCA ? '3ce' : 'pge'} />
            )}
          </section>

          <section>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">
              {dmc ? 'Daily meter charge' : 'Daily base service charge'}
            </h3>
            {bsc && (
              <p>
                ${bsc.tier3.toFixed(2)}/day (~${(bsc.tier3 * 30.5).toFixed(2)}/month) for
                Income Tier 3 customers (${bsc.tier1.toFixed(2)}/day for Tier 1,{' '}
                ${bsc.tier2.toFixed(2)}/day for Tier 2). This fixed charge is not reflected
                in the per-kWh rates shown in the app.
              </p>
            )}
            {dmc && (
              <p>
                ${dmc.rate.toFixed(5)}/day for the separately metered EV outlet.
                EV-B requires a dedicated second meter for your EV charger.
                This fixed charge is not reflected in the per-kWh rates shown in the app.
              </p>
            )}
          </section>

          <section>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Effective dates</h3>
            <ul className="space-y-0.5">
              <li>{serviceArea?.utility ?? 'PG&E'} delivery rates: {globalMetadata?.pgeEffectiveDate} (Advice Letter {globalMetadata?.pgeAdviceLetter})</li>
              <li>{serviceArea?.cca ?? '3CE'} generation rates: {globalMetadata?.cceRateSheetDate}</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Notes</h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>If you have rooftop solar (NEM), your actual net costs may differ from these estimates.</li>
              <li>{planConfig.description}</li>
              {planConfig.deprecationNotice && <li>{planConfig.deprecationNotice}</li>}
              {planConfig.baselineCredit && (
                <li>
                  E-TOU-C baseline credit of ${Math.abs(planConfig.baselineCredit.rate).toFixed(4)}/kWh
                  applies to usage within baseline allowance. Not included in rates shown above.
                </li>
              )}
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Sources</h3>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>{serviceArea?.utility ?? 'PG&E'} Tariff Schedule {planConfig.tariffSource} (Advice Letter {globalMetadata?.pgeAdviceLetter})</li>
              <li>{serviceArea?.cca ?? '3CE'} 3Cchoice Generation Rate Sheet (effective {globalMetadata?.cceRateSheetDate})</li>
            </ul>
          </section>

        </div>
      )}
    </footer>
  );
}
