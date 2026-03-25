import { useCurrentRate } from '../hooks/useCurrentRate';
import { getDaySchedule, getPacificDateStr } from '../engine/rateEngine';
import { getPacificHour, formatPacificTime, buildPacificTime } from '../utils/pacificTime';
import { PERIOD_COLORS } from '../constants/periodColors';

function savingsPct(cheapRate, expensiveRate) {
  return Math.round((1 - cheapRate / expensiveRate) * 100);
}

function findNextOffPeakStart(now, planConfig) {
  const currentHour = getPacificHour(now);
  const blocks = getDaySchedule(now, planConfig);
  const nextOffPeak = blocks.find(b => b.period === 'offPeak' && b.startHour > currentHour);
  if (nextOffPeak) {
    return buildPacificTime(getPacificDateStr(now), nextOffPeak.startHour);
  }
  // Off-peak must start at midnight tomorrow
  return null;
}

function buildMessage(period, season, rate, nextChange, planConfig, now) {
  const offPeakRate = planConfig.rates[season].offPeak.combined;
  const partPeakData = planConfig.rates[season].partPeak;

  const pctVsOffPeak  = savingsPct(offPeakRate, rate);

  if (period === 'offPeak') {
    return "You're in the cheapest charging window. Now is the best time to charge your EV.";
  }

  if (period === 'peak') {
    const nextChangeTime = formatPacificTime(nextChange.time);

    if (nextChange.newPeriod === 'partPeak' && partPeakData) {
      const pctVsPartPeak = savingsPct(partPeakData.combined, rate);
      const offPeakStart = findNextOffPeakStart(now, planConfig);
      const offPeakTime = offPeakStart ? formatPacificTime(offPeakStart) : 'midnight';
      return (
        `Electricity is at its most expensive right now. ` +
        `Part-peak starts at ${nextChangeTime} — saving ~${pctVsPartPeak}% over current rates. ` +
        `Wait until ${offPeakTime} for off-peak: the cheapest rates, ~${pctVsOffPeak}% cheaper than peak.`
      );
    }

    // Peak transitions directly to off-peak (e.g. EV-B weekend)
    return (
      `Electricity is at its most expensive right now. ` +
      `Rates drop at ${nextChangeTime} — off-peak is ~${pctVsOffPeak}% cheaper than peak.`
    );
  }

  // partPeak — afternoon (next period is peak) or evening (next is off-peak)
  const nextChangeTime = formatPacificTime(nextChange.time);

  if (nextChange.newPeriod === 'peak') {
    return (
      `Peak pricing starts at ${nextChangeTime}. ` +
      `If you can wait until off-peak, rates are ~${pctVsOffPeak}% cheaper than right now.`
    );
  }

  return (
    `Rates drop at ${nextChangeTime}! ` +
    `Off-peak rates are ~${pctVsOffPeak}% cheaper — worth waiting if you can.`
  );
}

export default function ChargingTip({ planConfig }) {
  const { period, season, rate, nextChange } = useCurrentRate(planConfig);
  const message = buildMessage(period, season, rate, nextChange, planConfig, new Date());

  return (
    <div
      data-testid="charging-tip"
      className={`w-full rounded-lg border px-4 py-3 text-sm ${PERIOD_COLORS[period].tip}`}
    >
      <p data-testid="tip-message">{message}</p>
    </div>
  );
}
