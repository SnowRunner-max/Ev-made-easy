import { useCurrentRate } from '../hooks/useCurrentRate';
import { useCountdown } from '../hooks/useCountdown';
import { PERIOD_COLORS } from '../constants/periodColors';
import { PERIOD_DISPLAY } from '../engine/rateEngine';

export default function RateDisplay({ planConfig }) {
  const { period, rate, season, periodLabel, nextChange } = useCurrentRate(planConfig);
  const { formatted } = useCountdown(nextChange.time);

  // E-1 tiered plan
  if (!planConfig.touPeriods) {
    return (
      <div className="mb-6">
        <div
          data-testid="rate-badge"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.8px] mb-2 bg-pewter/20 text-pewter"
        >
          <span className="w-2 h-2 rounded-full bg-pewter animate-pulse" />
          No TOU Pricing
        </div>
        <div className="text-xs uppercase tracking-[2px] text-apricot font-medium mb-1">
          Current Rate
        </div>
        <div
          data-testid="rate-value"
          className="font-serif text-5xl tracking-tight leading-none text-white mb-1"
        >
          Tiered Rate
        </div>
        <div className="text-sm text-pewter">{planConfig.name} · No time-based pricing</div>
      </div>
    );
  }

  const colors = PERIOD_COLORS[period];
  const nextLabel = PERIOD_DISPLAY[nextChange.newPeriod]?.label;
  const direction = nextChange.newRate > rate ? 'rises to' : 'drops to';

  return (
    <div className="mb-5">
      {/* Period badge with pulsing dot */}
      <div
        data-testid="rate-badge"
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.8px] mb-2 ${colors.darkBadge}`}
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: colors.dotColor }}
        />
        {periodLabel}
      </div>

      {/* Label */}
      <div className="text-xs uppercase tracking-[2px] text-apricot font-medium mb-1">
        Current Rate
      </div>

      {/* Hero rate number */}
      <div
        data-testid="rate-value"
        aria-label={`Current rate: $${rate.toFixed(2)} per kWh, ${periodLabel}`}
        className="font-serif tracking-tight leading-none text-white mb-1"
        style={{ fontSize: '56px', letterSpacing: '-2px' }}
      >
        ${rate.toFixed(2)}
        <span className="text-[22px] font-light opacity-70 tracking-normal">/kWh</span>
      </div>

      {/* Season / plan sublabel */}
      <div className="text-sm text-pewter mb-6">
        <span>{season === 'summer' ? 'Summer Rates' : 'Winter Rates'}</span>
        {' · '}
        <span>{planConfig.name}</span>
      </div>

      {/* Countdown */}
      <p data-testid="countdown" className="text-sm text-pewter leading-relaxed">
        {nextLabel} starts in{' '}
        <span className="font-bold text-white">{formatted}</span>
        {' '}— rate {direction}{' '}
        <span className="font-bold text-white">${nextChange.newRate.toFixed(2)}/kWh</span>
      </p>
    </div>
  );
}
