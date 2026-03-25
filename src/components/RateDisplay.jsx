import { useCurrentRate } from '../hooks/useCurrentRate';
import { useCountdown } from '../hooks/useCountdown';
import { PERIOD_COLORS } from '../constants/periodColors';

export default function RateDisplay({ planConfig }) {
  const { period, rate, season, periodLabel, nextChange } = useCurrentRate(planConfig);
  const { formatted } = useCountdown(nextChange.time);

  const nextLabel = planConfig.touPeriods[nextChange.newPeriod]?.label;
  const direction = nextChange.newRate > rate ? 'rises to' : 'drops to';
  const hasMultiplePeriods = Object.keys(planConfig.touPeriods).length > 1;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
      <div
        data-testid="rate-badge"
        aria-label={`Current rate: $${rate.toFixed(2)} per kWh, ${periodLabel}`}
        className={`${PERIOD_COLORS[period].badge} rounded-2xl p-8 text-center shadow-lg w-full sm:w-64 shrink-0`}
      >
        <div data-testid="rate-value" className="text-6xl font-bold tracking-tight">
          <span>${rate.toFixed(2)}</span>
          <span className="text-2xl font-normal">/kWh</span>
        </div>
        <div className="mt-2 text-xl font-semibold uppercase tracking-wide">
          {periodLabel}
        </div>
        <div className="mt-1 text-sm opacity-80">
          {season === 'summer' ? 'Summer' : 'Winter'} Rates
        </div>
      </div>

      {hasMultiplePeriods && (
        <p data-testid="countdown" className="mt-4 sm:mt-0 text-sm text-gray-500 text-center sm:text-left">
          {nextLabel} starts in{' '}
          <span className="font-semibold text-gray-700">{formatted}</span>
          {' '}— rate {direction}{' '}
          <span className="font-semibold text-gray-700">${nextChange.newRate.toFixed(2)}/kWh</span>
        </p>
      )}
    </div>
  );
}
