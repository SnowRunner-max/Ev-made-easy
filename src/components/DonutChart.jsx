import { useCurrentRate } from '../hooks/useCurrentRate';

/**
 * CSS conic-gradient donut chart showing the delivery/generation split
 * for the current rate period. Rendered in the dark results panel.
 */
export default function DonutChart({ planConfig }) {
  const { period, season } = useCurrentRate(planConfig);

  if (!planConfig.touPeriods) return null;

  const rateData = planConfig.rates[season]?.[period];
  if (!rateData) return null;

  const { delivery, generation, combined } = rateData;
  const deliveryDeg  = Math.round((delivery / combined) * 360);
  const generationDeg = 360 - deliveryDeg;

  const gradient = `conic-gradient(#CF5C36 0deg ${deliveryDeg}deg, #EFC88B ${deliveryDeg}deg 360deg)`;

  return (
    <div className="flex items-center gap-6 py-6 border-t border-white/[0.08] border-b border-b-white/[0.08] mb-6">
      {/* Donut */}
      <div className="relative flex-shrink-0 w-[100px] h-[100px] rounded-full" style={{ background: gradient }}>
        {/* Inner cutout */}
        <div className="absolute inset-[24px] rounded-full bg-ink" />
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-paprika flex-shrink-0" />
          <span className="text-pewter flex-1">PG&E Delivery</span>
          <span className="font-semibold text-white tabular-nums">${delivery.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-apricot flex-shrink-0" />
          <span className="text-pewter flex-1">Generation</span>
          <span className="font-semibold text-white tabular-nums">${generation.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs pt-1 border-t border-white/[0.08]">
          <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" />
          <span className="text-pewter flex-1">Total</span>
          <span className="font-semibold text-white tabular-nums">${combined.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}
