import { useCurrentRate } from '../hooks/useCurrentRate';
import { getDaySchedule, getPacificDateStr, PERIOD_DISPLAY } from '../engine/rateEngine';
import { getPacificHour, formatPacificTime, buildPacificTime } from '../utils/pacificTime';
import { PERIOD_COLORS } from '../constants/periodColors';

function savingsPct(cheapRate, expensiveRate) {
  return Math.round((1 - cheapRate / expensiveRate) * 100);
}

// Cheapest TOU period for the season — not always offPeak (SDG&E and SCE
// winter schedules have a superOffPeak period below offPeak).
function getCheapestPeriod(seasonRates) {
  return Object.keys(seasonRates).reduce((cheapest, period) =>
    seasonRates[period].combined < seasonRates[cheapest].combined ? period : cheapest
  );
}

function findNextPeriodStart(now, planConfig, targetPeriod) {
  const currentHour = getPacificHour(now);
  const dateStr = getPacificDateStr(now);

  const todayBlock = getDaySchedule(now, planConfig)
    .find(b => b.period === targetPeriod && b.startHour > currentHour);
  if (todayBlock) {
    return buildPacificTime(dateStr, todayBlock.startHour);
  }

  // No window left today — look at tomorrow's schedule (day type may differ)
  const tomorrowNoon = buildPacificTime(dateStr, 12, true);
  const tomorrowBlock = getDaySchedule(tomorrowNoon, planConfig)
    .find(b => b.period === targetPeriod);
  if (tomorrowBlock) {
    return buildPacificTime(dateStr, tomorrowBlock.startHour, true);
  }
  return null;
}

function buildMessage(period, season, rate, nextChange, planConfig, now) {
  if (!planConfig.touPeriods) {
    return 'This plan has no time-based pricing — your rate is the same at all hours.';
  }

  const seasonRates = planConfig.rates[season];
  const cheapestPeriod = getCheapestPeriod(seasonRates);
  const cheapestRate = seasonRates[cheapestPeriod].combined;

  if (rate <= cheapestRate) {
    return "You're in the cheapest charging window. Now is the best time to charge your EV.";
  }

  const cheapestLabel = PERIOD_DISPLAY[cheapestPeriod].label;
  const pctVsCheapest = savingsPct(cheapestRate, rate);
  const nextChangeTime = formatPacificTime(nextChange.time);
  const cheapestStart = findNextPeriodStart(now, planConfig, cheapestPeriod);
  const cheapestTime = cheapestStart ? formatPacificTime(cheapestStart) : 'midnight';

  if (period === 'peak') {
    if (nextChange.newPeriod !== cheapestPeriod && nextChange.newRate < rate) {
      const stepLabel = PERIOD_DISPLAY[nextChange.newPeriod]?.label ?? 'A cheaper period';
      const pctVsStep = savingsPct(nextChange.newRate, rate);
      return (
        `Electricity is at its most expensive right now. ` +
        `${stepLabel} starts at ${nextChangeTime} — saving ~${pctVsStep}% over current rates. ` +
        `Wait until ${cheapestTime} for ${cheapestLabel.toLowerCase()}: the cheapest rates, ~${pctVsCheapest}% cheaper than peak.`
      );
    }
    return (
      `Electricity is at its most expensive right now. ` +
      `Rates drop at ${nextChangeTime} — ${cheapestLabel.toLowerCase()} is ~${pctVsCheapest}% cheaper than peak.`
    );
  }

  const currentLabel = PERIOD_DISPLAY[period]?.label ?? 'This rate period';

  if (nextChange.newRate > rate) {
    const nextLabel = PERIOD_DISPLAY[nextChange.newPeriod]?.label ?? 'Higher';
    return (
      `${nextLabel} pricing starts at ${nextChangeTime}. ` +
      `If you can wait until ${cheapestLabel.toLowerCase()} at ${cheapestTime}, rates are ~${pctVsCheapest}% cheaper than right now.`
    );
  }

  if (nextChange.newPeriod === cheapestPeriod) {
    return (
      `${currentLabel} rates drop at ${nextChangeTime}. ` +
      `${cheapestLabel} rates are ~${pctVsCheapest}% cheaper — worth waiting if you can.`
    );
  }
  return (
    `${currentLabel} rates drop at ${nextChangeTime}. ` +
    `For the cheapest rates, ${cheapestLabel.toLowerCase()} starts at ${cheapestTime} — ~${pctVsCheapest}% cheaper than right now.`
  );
}

export default function ChargingTip({ planConfig }) {
  const { period, season, rate, nextChange } = useCurrentRate(planConfig);
  const message = buildMessage(period, season, rate, nextChange, planConfig, new Date());

  return (
    <div
      data-testid="charging-tip"
      className={`w-full rounded-xl px-4 py-3.5 text-sm leading-relaxed ${(PERIOD_COLORS[period] ?? PERIOD_COLORS.offPeak).tip}`}
    >
      <p data-testid="tip-message">{message}</p>
    </div>
  );
}
