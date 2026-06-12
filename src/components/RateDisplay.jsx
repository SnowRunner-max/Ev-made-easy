import { useCountdown } from '../hooks/useCountdown';
import { PERIOD_DISPLAY } from '../engine/rateEngine';
import { PERIOD_COLORS } from '../constants/periodColors';

export default function RateDisplay({ planConfig, currentRate }) {
  const { period, rate, season, periodLabel, nextChange } = currentRate;
  const { formatted } = useCountdown(nextChange.time);

  // E-1 tiered plan — no TOU
  if (!planConfig.touPeriods) {
    const flatRate = rate != null ? `$${rate.toFixed(2)}` : 'Tiered Rate';
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-pewter/50">Live Rate</span>
          <div
            data-testid="rate-badge"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] bg-pewter/15 text-pewter/70"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-pewter/60 animate-pulse" />
            No TOU Pricing
          </div>
        </div>
        <div
          data-testid="rate-value"
          className="font-display tracking-tight leading-none text-white"
          style={{ fontSize: '72px', letterSpacing: '-3px' }}
        >
          {flatRate}
          {rate != null && <span className="text-2xl font-normal opacity-50 tracking-normal">/kWh</span>}
        </div>
        <p className="text-sm text-pewter/60 mt-3">{planConfig.name} · No time-based pricing</p>
      </div>
    );
  }

  const colors    = PERIOD_COLORS[period] ?? PERIOD_COLORS.offPeak;
  const pillClass = colors.pillClass;
  const dotColor  = colors.pillDotColor;
  const nextLabel = PERIOD_DISPLAY[nextChange.newPeriod]?.label ?? 'Next rate';
  const direction = nextChange.newRate > rate ? 'rises to' : 'drops to';

  return (
    <div className="mb-3">
      {/* Live Rate eyebrow + period pill */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-pewter/50">
          Live Rate
        </span>
        <span
          data-testid="rate-badge"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] ${pillClass}`}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: dotColor }} />
          {periodLabel}
        </span>
      </div>

      {/* Hero rate */}
      <div
        data-testid="rate-value"
        aria-label={`Current rate: $${rate.toFixed(2)} per kWh, ${periodLabel}`}
        className="font-display leading-none text-white"
        style={{ fontSize: '80px', letterSpacing: '-3px' }}
      >
        ${rate.toFixed(2)}
        <span className="text-2xl font-light opacity-50 tracking-normal">/kWh</span>
      </div>

      {/* Season / plan sublabel */}
      <p className="text-xs text-pewter/50 mt-2 mb-5">
        {season === 'summer' ? 'Summer' : 'Winter'} · {planConfig.name}
      </p>

      {/* Countdown */}
      <div
        data-testid="countdown"
        className="flex items-center gap-2 text-sm text-pewter/60"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span>
          {nextLabel} {direction}{' '}
          <span className="font-semibold text-white">${nextChange.newRate.toFixed(2)}/kWh</span>
          {' '}in <span className="font-semibold text-white">{formatted}</span>
        </span>
      </div>

      <div className="mt-3 border-t border-white/[0.08]" />
    </div>
  );
}
