import ratesData from '../data/rates.json';
import { useCurrentRate } from '../hooks/useCurrentRate';

function savingsPct(cheapRate, expensiveRate) {
  return Math.round((1 - cheapRate / expensiveRate) * 100);
}

const COLOR = {
  offPeak:  'bg-emerald-50 border-emerald-300 text-emerald-800',
  partPeak: 'bg-amber-50 border-amber-300 text-amber-800',
  peak:     'bg-red-50 border-red-300 text-red-800',
};

function buildMessage(period, season, rate, nextChange) {
  const offPeakRate  = ratesData.rates[season].offPeak.combined;
  const partPeakRate = ratesData.rates[season].partPeak.combined;

  const pctVsOffPeak  = savingsPct(offPeakRate, rate);
  const pctVsPartPeak = savingsPct(partPeakRate, rate);

  if (period === 'offPeak') {
    return "You're in the cheapest charging window. Now is the best time to charge your EV.";
  }

  if (period === 'peak') {
    return (
      `Electricity is at its most expensive right now. ` +
      `Part-peak starts at 9 PM — saving ~${pctVsPartPeak}% over current rates. ` +
      `Wait until midnight for off-peak: the cheapest rates, ~${pctVsOffPeak}% cheaper than peak.`
    );
  }

  // partPeak — afternoon (3-4 PM) next period is peak; evening (9 PM-midnight) next is off-peak
  if (nextChange.newPeriod === 'peak') {
    return (
      `Peak pricing starts at 4 PM. ` +
      `If you can wait until midnight, off-peak rates are ~${pctVsOffPeak}% cheaper than right now.`
    );
  }

  return (
    `Rates drop at midnight! ` +
    `Off-peak rates are ~${pctVsOffPeak}% cheaper — worth waiting if you can.`
  );
}

export default function ChargingTip() {
  const { period, season, rate, nextChange } = useCurrentRate();
  const message = buildMessage(period, season, rate, nextChange);

  return (
    <div
      data-testid="charging-tip"
      className={`w-full rounded-lg border px-4 py-3 text-sm ${COLOR[period]}`}
    >
      <p data-testid="tip-message">{message}</p>
    </div>
  );
}
