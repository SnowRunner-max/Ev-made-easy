import { useCurrentRate } from '../hooks/useCurrentRate';

export default function CostFacts({ planConfig, summary }) {
  const { period, season } = useCurrentRate(planConfig);

  if (!planConfig.touPeriods || !summary?.to80) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-pewter text-center">Select a vehicle and charge level to see cost facts.</p>
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border border-white/15 rounded-sm p-5">
        <div className="border-b-8 border-white pb-2 mb-2">
          <h3 className="font-display text-3xl font-black uppercase tracking-tight leading-none">Cost Facts</h3>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-[10px] text-white/60 font-bold">
              Session: {kwh.toFixed(1)} kWh delivered
            </span>
            <span className="text-[10px] text-white/60 font-bold">{planConfig.name}</span>
          </div>
        </div>

        <div className="flex justify-between items-end border-b-4 border-white pb-1 mb-1">
          <span className="font-black text-lg uppercase">Total Cost</span>
          <span className="font-display text-3xl font-black">${totalCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-white/20 py-1 text-xs">
          <span className="font-bold text-white/60">Cost per kWh</span>
          <span className="text-white/90">${costPerKwh.toFixed(4)}</span>
        </div>

        <div className="mt-5">
          <div className="flex justify-between items-baseline">
            <span className="font-black text-sm uppercase">{deliveryLabel}</span>
            <span className="font-bold text-sm">${deliveryCost.toFixed(2)}</span>
          </div>
          <div className="border-b-4 border-white mb-2" />
          <div className="flex justify-between text-[11px] border-b border-white/20 py-1.5 text-white/70">
            <span>Delivery charges</span>
            <span className="font-medium text-white">${rateData.delivery.toFixed(4)}/kWh</span>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between items-baseline">
            <span className="font-black text-sm uppercase">{generationLabel}</span>
            <span className="font-bold text-sm">${generationCost.toFixed(2)}</span>
          </div>
          <div className="border-b-4 border-white mb-2" />
          <div className="flex justify-between text-[11px] border-b border-white/20 py-1.5 text-white/70">
            <span>{generationLabel}</span>
            <span className="font-medium text-white">${rateData.generation.toFixed(4)}/kWh</span>
          </div>
        </div>

        <footer className="mt-5 text-[9px] leading-tight text-white/40 italic">
          * Based on {planConfig.name} rate schedule charging {kwh.toFixed(1)} kWh from current charge level to 80%.
        </footer>
      </div>
    </div>
  );
}
