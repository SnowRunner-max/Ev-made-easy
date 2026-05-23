import { useCurrentRate } from '../hooks/useCurrentRate';
import { PERIOD_DISPLAY } from '../engine/rateEngine';
import { getUtilityConfigForServiceArea } from '../data/utilityRegistry';

const PERIOD_ORDER = ['peak', 'midPeak', 'partPeak', 'offPeak', 'superOffPeak'];

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
    <div className="flex justify-between items-baseline pb-2 border-b border-white/10 mb-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">{label}</span>
      {right && <span className="text-[10px] font-mono text-pewter/50">{right}</span>}
    </div>
  );
}

function KV({ label, value, prominent }) {
  return (
    <div className="flex justify-between items-baseline py-1.5">
      <span className={`text-[13px] ${prominent ? 'text-white font-medium' : 'text-pewter/70'}`}>{label}</span>
      <span className={`font-mono text-[13px] tabular-nums ${prominent ? 'text-white font-semibold' : 'text-pewter/80'}`}>{value}</span>
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
          <th className="py-1.5 text-left text-[10px] font-medium text-pewter/40">Period</th>
          {seasonKeys.map(s => (
            <th key={s} className="py-1.5 text-right text-[10px] font-medium text-pewter/40 capitalize">{seasons[s].label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periodKeys.map(period => (
          <tr key={period} className="border-t border-white/[0.06]">
            <td className="py-1.5 text-[12px] text-pewter/60">{PERIOD_DISPLAY[period].label}</td>
            {seasonKeys.map(s => {
              const rate = rates[s][period];
              return (
                <td key={s} className="py-1.5 text-right font-mono text-[12px] text-white/80 tabular-nums">
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

export default function CostFacts({ planConfig, summary, globalMetadata, serviceArea, provider }) {
  const { period, season } = useCurrentRate(planConfig);

  if (!planConfig.touPeriods || !summary?.to80) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-pewter/60 text-center">Select a vehicle and charge level to see cost breakdown.</p>
      </div>
    );
  }

  const rateData = planConfig.rates[season]?.[period];
  if (!rateData) return null;

  const kwh = summary.to80.kwhNeeded;
  const deliveryCost = rateData.delivery * kwh;
  const generationCost = rateData.generation * kwh;
  const totalCost = summary.to80.costNow;
  const costPerKwh = rateData.combined;
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
      <div className="flex items-baseline justify-between mb-5 pb-3 border-b border-white/10">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-pewter/50">Cost Breakdown</span>
        <span className="text-[10px] font-mono text-pewter/40">{planConfig.name}</span>
      </div>

      {/* Total */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pewter/50 mb-2">
          Total · Charge to 80%
        </p>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-white" style={{ fontSize: '52px', letterSpacing: '-2px' }}>
            ${totalCost.toFixed(2)}
          </span>
          <span className="font-mono text-[12px] text-pewter/50">for {kwh.toFixed(1)} kWh</span>
        </div>
      </div>

      {/* Delivery group */}
      <div className="mb-4">
        <SectionHeader label={deliveryLabel} right={`$${deliveryCost.toFixed(2)}`} />
        <KV label="Delivery charges" value={`$${rateData.delivery.toFixed(4)}/kWh`} />
      </div>

      {/* Generation group */}
      <div className="mb-4">
        <SectionHeader label={generationLabel} right={`$${generationCost.toFixed(2)}`} />
        <KV label={generationLabel} value={`$${rateData.generation.toFixed(4)}/kWh`} />
      </div>

      {/* Cost per kWh */}
      <div className="mb-5 pt-1 border-t border-white/10">
        <KV label="Cost per kWh" value={`$${costPerKwh.toFixed(4)}`} prominent />
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
              <div className="py-1.5 border-t border-white/[0.06]">
                <p className="text-[12px] font-medium text-white">{serviceArea?.utility ?? 'Utility'} Tariff Schedule</p>
                <p className="text-[10px] font-mono text-pewter/40">Effective {effectiveDate}</p>
              </div>
            )}
            {ccaRateDate && (
              <div className="py-1.5 border-t border-white/[0.06]">
                <p className="text-[12px] font-medium text-white">{ccaName} Generation Rate Sheet</p>
                <p className="text-[10px] font-mono text-pewter/40">Effective {ccaRateDate}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fine print */}
      {(bsc || dmc) && (
        <p className="text-[10px] text-pewter/35 leading-relaxed mt-2">
          {bsc && `Excludes daily base service charge: $${bsc.tier1.toFixed(2)} T1 · $${bsc.tier2.toFixed(2)} T2 · $${bsc.tier3.toFixed(2)} T3 per day.`}
          {dmc && `Excludes daily meter charge: $${dmc.rate.toFixed(5)}/day.`}
        </p>
      )}
    </div>
  );
}
