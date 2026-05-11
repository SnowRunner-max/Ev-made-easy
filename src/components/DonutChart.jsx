import { useCurrentRate } from '../hooks/useCurrentRate';

/**
 * SVG donut chart showing delivery/generation split as percentages.
 * Uses stroke-dasharray on a circle with circumference ≈ 100 for easy % mapping.
 */
export default function DonutChart({ planConfig }) {
  const { period, season } = useCurrentRate(planConfig);

  if (!planConfig.touPeriods) return null;

  const rateData = planConfig.rates[season]?.[period];
  if (!rateData) return null;

  const { delivery, combined } = rateData;
  const delivPct = Math.round((delivery / combined) * 100);
  const genPct   = 100 - delivPct;

  return (
    <div className="py-6 border-t border-white/[0.08] border-b border-b-white/[0.08] mb-6">
      <div className="text-[10px] font-bold uppercase tracking-[2px] text-pewter/60 mb-4">
        Cost Distribution
      </div>
      <div className="flex items-center gap-6">
        {/* SVG donut */}
        <div className="relative flex-shrink-0 w-[96px] h-[96px]">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            {/* Track */}
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="4"
            />
            {/* Delivery segment (paprika) */}
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#CF5C36"
              strokeWidth="4"
              strokeDasharray={`${delivPct}, 100`}
            />
            {/* Generation segment (apricot) */}
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#EFC88B"
              strokeWidth="4"
              strokeDasharray={`${genPct}, 100`}
              strokeDashoffset={`-${delivPct}`}
            />
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-lg font-bold text-white">100%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-paprika flex-shrink-0" />
            <span className="text-[11px] text-pewter flex-1">PG&E Delivery</span>
            <span className="text-[11px] font-semibold text-white tabular-nums">{delivPct}%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-apricot flex-shrink-0" />
            <span className="text-[11px] text-pewter flex-1">Generation</span>
            <span className="text-[11px] font-semibold text-white tabular-nums">{genPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
