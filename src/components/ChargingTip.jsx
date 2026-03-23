import { useCurrentRate } from '../hooks/useCurrentRate';
import { getDaySchedule, getPacificDateStr } from '../engine/rateEngine';

function savingsPct(cheapRate, expensiveRate) {
  return Math.round((1 - cheapRate / expensiveRate) * 100);
}

const COLOR = {
  offPeak:  'bg-emerald-50 border-emerald-300 text-emerald-800',
  partPeak: 'bg-amber-50 border-amber-300 text-amber-800',
  peak:     'bg-red-50 border-red-300 text-red-800',
};

function formatPacificTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    hour12: true,
  }).format(date);
}

function findNextOffPeakStart(now, planConfig) {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
    }).format(now)
  );
  const currentHour = hour === 24 ? 0 : hour;
  const blocks = getDaySchedule(now, planConfig);
  const nextOffPeak = blocks.find(b => b.period === 'offPeak' && b.startHour > currentHour);
  if (nextOffPeak) {
    // Build a date at that hour today (Pacific)
    const dateStr = getPacificDateStr(now);
    const [year, month, day] = dateStr.split('-').map(Number);
    let guess = Date.UTC(year, month - 1, day, 20, 0, 0);
    for (let i = 0; i < 25; i++) {
      const h = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
          hour: 'numeric',
          hour12: false,
        }).format(new Date(guess))
      );
      const ph = h === 24 ? 0 : h;
      const diff = nextOffPeak.startHour - ph;
      if (diff === 0) break;
      guess += diff * 3_600_000;
    }
    return new Date(guess);
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
      className={`w-full rounded-lg border px-4 py-3 text-sm ${COLOR[period]}`}
    >
      <p data-testid="tip-message">{message}</p>
    </div>
  );
}
