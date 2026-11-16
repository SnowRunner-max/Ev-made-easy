import { PERIOD_DISPLAY } from '../engine/rateEngine';
import { PERIOD_ORDER } from '../constants/periodColors';
import { getUtilityConfigForServiceArea } from '../data/utilityRegistry';

const CCA_RATE_DATE_KEYS_BY_PROVIDER = {
  '3ce': ['3ceRateSheetDate', 'cceRateSheetDate'],
  cpa: ['cpaRateSheetDate'],
  sbce: ['sbceRateEffectiveDate'],
  sdcp: ['sdcpRateEffectiveDate'],
  cea: ['ceaRateEffectiveDate'],
};

const CCA_RATE_DATE_FALLBACK_KEYS = [
  'cceRateSheetDate',
  'cpaRateSheetDate',
  'sbceRateEffectiveDate',
  '3ceRateSheetDate',
  'sdcpRateEffectiveDate',
  'ceaRateEffectiveDate',
];

function getCcaRateDate(globalMetadata, provider) {
  const providerKeys = CCA_RATE_DATE_KEYS_BY_PROVIDER[provider] ?? [];
  const keys = providerKeys.length ? providerKeys : CCA_RATE_DATE_FALLBACK_KEYS;
  return keys.map(key => globalMetadata?.[key]).find(Boolean);
}

function SectionHeader({ label, right }) {
  return (
    <div className="flex justify-between items-baseline pb-2 border-b border-[var(--line)] mb-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text)]">{label}</span>
      {right && <span className="text-[10px] tabular-nums text-[var(--secondary)]">{right}</span>}
    </div>
  );
}

function KV({ label, value, prominent }) {
  return (
    <div className="flex justify-between items-baseline py-1.5">
      <span className={`text-[13px] ${prominent ? 'text-[var(--text)] font-medium' : 'text-[var(--secondary)]'}`}>{label}</span>
      <span className={`tabular-nums text-[13px] tabular-nums ${prominent ? 'text-[var(--text)] font-semibold' : 'text-[var(--secondary)]'}`}>{value}</span>
    </div>
  );
}

function RateTable({ rates, seasons }) {
  const seasonKeys = Object.keys(seasons);
  const periodKeys = PERIOD_ORDER.filter(p => seasonKeys.some(s => rates[s][p] !== undefined));

  return (
    <table className="w-full border-collapse mt-1">
      <thead>
        <tr>
          <th className="py-1.5 text-left text-[10px] font-medium text-[var(--secondary)]">Period</th>
          {seasonKeys.map(s => (
            <th key={s} className="py-1.5 text-right text-[10px] font-medium text-[var(--secondary)] capitalize">{seasons[s].label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periodKeys.map(period => (
          <tr key={period} className="border-t border-[var(--line)]">
            <td className="py-1.5 text-[12px] text-[var(--secondary)]">{PERIOD_DISPLAY[period].label}</td>
            {seasonKeys.map(s => {
              const rate = rates[s][period];
              return (
                <td key={s} className="py-1.5 text-right tabular-nums text-[12px] text-[var(--text)] tabular-nums">
                  {rate ? `$${rate.combined.toFixed(5)}` : '—'}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CostFacts({ planConfig, summary, globalMetadata, serviceArea, provider, currentRate }) {
  const { period, season } = currentRate;

  const session = summary?.to80 ?? summary?.to100;
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-[var(--secondary)] text-center">Select a vehicle and charge level to see cost breakdown.</p>
      </div>
    );
  }

  const rateData = planConfig._flatRate ?? planConfig.rates[season]?.[period];
  if (!rateData) return null;

  const kwh = session.meteredKwh ?? session.kwhNeeded;
  const componentCosts = session.componentCosts ?? {};
  const deliveryCost = componentCosts.delivery ?? 0;
  const generationCost = componentCosts.generation ?? 0;
  const totalCost = session.costNow;
  const costPerKwh = kwh ? totalCost / kwh : 0;
  const deliveryLabel = planConfig.deliveryLabel ?? 'Utility Delivery';
  const generationLabel = planConfig.generationLabel ?? 'Generation';

  const { rates, seasons, fixedCharges } = planConfig;
  const bsc = fixedCharges?.type === 'incomeBasedBSC' ? fixedCharges.baseServicesCharge : null;
  const dmc = fixedCharges?.type === 'flatMeterCharge' ? fixedCharges.meterCharge : null;

  const utility = serviceArea ? getUtilityConfigForServiceArea(serviceArea) : null;
  const effectiveDateKey = utility?.metadataKeys?.effectiveDate;
  const effectiveDate = globalMetadata?.[effectiveDateKey];
  const ccaRateDate = globalMetadata ? getCcaRateDate(globalMetadata, provider) : null;
  const ccaName = planConfig._displayProvider
    ? planConfig._displayProvider.split(' — ')[0]
    : (serviceArea?.cca ?? 'CCA');

  return (
    <div className="overflow-y-auto flex-1">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-5 pb-3 border-b border-[var(--line)]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--secondary)]">Cost Breakdown</span>
        <span className="text-[10px] tabular-nums text-[var(--secondary)]">{planConfig.name}</span>
      </div>

      {/* Total */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--secondary)] mb-2">
          Total · {session.complete === false ? `Reaches ${Math.round(session.finalPct)}% of ${summary.to80 ? '80%' : '100%'} target` : `Charge to ${summary.to80 ? '80%' : '100%'}`}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-[var(--text)]" style={{ fontSize: '2rem', letterSpacing: '-1px' }}>
            ${totalCost.toFixed(2)}
          </span>
          <span className="tabular-nums text-[12px] text-[var(--secondary)]">for {kwh.toFixed(1)} kWh</span>
        </div>
      </div>

      {/* Delivery group */}
      <div className="mb-4">
        <SectionHeader label={deliveryLabel} right={`$${deliveryCost.toFixed(2)}`} />
        <KV label="Delivery charges" value={`$${(kwh ? deliveryCost / kwh : 0).toFixed(4)}/kWh session average`} />
      </div>

      {/* Generation group */}
      <div className="mb-4">
        <SectionHeader label={generationLabel} right={`$${generationCost.toFixed(2)}`} />
        <KV label={generationLabel} value={`$${(kwh ? generationCost / kwh : 0).toFixed(4)}/kWh session average`} />
      </div>

      {/* Cost per kWh */}
      {Object.entries(componentCosts).filter(([key, value]) => !['delivery', 'generation'].includes(key) && Math.abs(value) > 1e-9).map(([key, value]) => (
        <KV key={key} label={({ pcia: 'PCIA', franchiseFee: 'Franchise fee', energySurcharge: 'State energy surcharge', baselineCredit: 'Baseline credit' })[key] ?? key}
          value={`$${value.toFixed(2)}`} />
      ))}
      <p className="text-[10px] text-[var(--secondary)] mb-3">Integrated across the session; individual amounts are rounded for display. Energy shown is metered grid import.</p>
      <div className="mb-5 pt-1 border-t border-[var(--line)]">
        <KV label="Session average per metered kWh" value={`$${costPerKwh.toFixed(4)}`} prominent />
      </div>

      {/* Published per-kWh rate table */}
      {seasons && (
        <div className="mb-5">
          <SectionHeader label="Published Rates" right="$/kWh" />
          <RateTable rates={rates} seasons={seasons} />
        </div>
      )}

      {/* Sources */}
      {(effectiveDate || ccaRateDate) && (
        <div className="mb-4">
          <SectionHeader label="Sources" />
          <div className="flex flex-col gap-0.5 mt-1">
            {effectiveDate && (
              <div className="py-1.5 border-t border-[var(--line)]">
                <p className="text-[12px] font-medium text-[var(--text)]">{serviceArea?.utility ?? 'Utility'} Tariff Schedule</p>
                <p className="text-[10px] tabular-nums text-[var(--secondary)]">Effective {effectiveDate}</p>
              </div>
            )}
            {ccaRateDate && (
              <div className="py-1.5 border-t border-[var(--line)]">
                <p className="text-[12px] font-medium text-[var(--text)]">{ccaName} Generation Rate Sheet</p>
                <p className="text-[10px] tabular-nums text-[var(--secondary)]">Effective {ccaRateDate}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fine print */}
      {(bsc || dmc) && (
        <p className="text-[10px] text-[var(--secondary)] leading-relaxed mt-2">
          {bsc && `Excludes daily base service charge: $${bsc.tier1.toFixed(2)} T1 · $${bsc.tier2.toFixed(2)} T2 · $${bsc.tier3.toFixed(2)} T3 per day.`}
          {dmc && `Excludes daily meter charge: $${dmc.rate.toFixed(5)}/day.`}
        </p>
      )}
    </div>
  );
}
