import { useState } from 'react';

const PERIOD_ORDER = ['peak', 'partPeak', 'offPeak'];

function RateTable({ rates, touPeriods, seasons }) {
  const seasonKeys = Object.keys(seasons);
  const periodKeys = PERIOD_ORDER.filter(p => rates[seasonKeys[0]][p] !== undefined);

  return (
    <table className="w-full text-xs border-collapse mt-2">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="py-1 pr-3 font-medium">Period</th>
          {seasonKeys.map(s => (
            <th key={s} className="py-1 pr-3 font-medium capitalize">{seasons[s].label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periodKeys.map(period => (
          <tr key={period} className="border-t border-gray-100">
            <td className="py-1 pr-3 text-gray-600">{touPeriods[period].label}</td>
            {seasonKeys.map(s => (
              <td key={s} className="py-1 pr-3 font-mono text-gray-800">
                ${rates[s][period].combined.toFixed(5)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Footer({ planConfig }) {
  const data = planConfig;
  const [expanded, setExpanded] = useState(false);
  const { _metadata: meta, rates, touPeriods, seasons } = data;
  const bsc = data.baseServicesCharge;
  const dmc = data.dailyMeterCharge;

  return (
    <footer
      data-testid="app-footer"
      className="border-t border-gray-200 bg-white px-4 py-5 text-xs text-gray-500"
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-gray-500">{meta.ratePlan}</p>
          <button
            data-testid="footer-toggle"
            onClick={() => setExpanded(e => !e)}
            className="text-blue-500 hover:text-blue-700 underline shrink-0"
          >
            About these rates {expanded ? '▲' : '▼'}
          </button>
        </div>

        {expanded && (
          <div data-testid="footer-details" className="mt-4 space-y-4 text-gray-600">

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">All-in rates ($/kWh)</h3>
              <p className="text-gray-500 mb-1">
                {meta.activeProvider ?? `3CE ${meta.ccaTier} generation + PG&E delivery`} · {meta.serviceArea}
              </p>
              <RateTable rates={rates} touPeriods={touPeriods} seasons={seasons} />
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">
                {dmc ? 'Daily meter charge' : 'Daily base service charge'}
              </h3>
              {bsc && (
                <p>
                  ${bsc.ratePerDay.toFixed(2)}/day (~${(bsc.ratePerDay * 30.5).toFixed(2)}/month) for
                  Income Tier {bsc.incomeTier} customers. This fixed charge is not reflected in the
                  per-kWh rates shown in the app.
                </p>
              )}
              {dmc && (
                <p>
                  ${dmc.ratePerDay.toFixed(5)}/day for the separately metered EV outlet.
                  EV-B requires a dedicated second meter for your EV charger.
                  This fixed charge is not reflected in the per-kWh rates shown in the app.
                </p>
              )}
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">Effective dates</h3>
              <ul className="space-y-0.5">
                <li>PG&E delivery rates: {meta.effectiveDates.pgeDelivery}</li>
                <li>3CE generation rates: {meta.effectiveDates.cceGeneration}</li>
                {meta.lastUpdated && <li>Last updated: {meta.lastUpdated}</li>}
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">Notes</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  If you have rooftop solar (NEM), your actual net costs may differ from these estimates.
                </li>
                {meta.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">Sources</h3>
              <ul className="space-y-0.5 list-disc list-inside">
                {meta.sources.map((src, i) => (
                  <li key={i}>{src}</li>
                ))}
              </ul>
            </section>

          </div>
        )}
      </div>
    </footer>
  );
}
