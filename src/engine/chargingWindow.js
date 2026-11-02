import { calcChargeCost } from './costCalculator';
import { buildPacificTime } from '../utils/pacificTime';

export function getWindowSegments(start, end) {
  if (start === end) return [[0, 24]];
  return end > start
    ? [[start, end]]
    : [
        [0, end],
        [start, 24],
      ];
}

/** Selected wall-clock times belong to one Pacific calendar day, or the following day. */
export function calculateChargingWindow({
  date,
  startHour,
  endHour,
  batteryKwh,
  currentPct,
  targetPct,
  chargingKw,
  efficiency,
  planConfig,
}) {
  if (
    ![batteryKwh, currentPct, targetPct, chargingKw, efficiency].every(Number.isFinite) ||
    batteryKwh <= 0 ||
    currentPct < 0 ||
    currentPct > 100 ||
    targetPct < 0 ||
    targetPct > 100 ||
    chargingKw <= 0 ||
    efficiency <= 0 ||
    efficiency > 1
  )
    throw new RangeError('Check battery, charger and efficiency settings.');
  const start = buildPacificTime(date, startHour);
  const end = buildPacificTime(date, endHour, endHour <= startHour);
  const windowHours = (end - start) / 3_600_000;
  if (windowHours <= 0)
    throw new RangeError(
      'This window disappears in the daylight-saving clock change. Choose different times.',
    );
  const requiredKwh = Math.max(0, (batteryKwh * (targetPct - currentPct)) / 100);
  const kwhNeeded = Math.min(requiredKwh, windowHours * chargingKw * efficiency);
  const cost = calcChargeCost(start, kwhNeeded, chargingKw, planConfig, {
    chargingEfficiency: efficiency,
  });
  return {
    ...cost,
    costNow: cost.totalCost,
    kwhNeeded,
    requiredKwh,
    windowHours,
    start,
    end,
    finish: new Date(start.getTime() + cost.hoursNeeded * 3_600_000),
    finalPct: Math.min(100, currentPct + (kwhNeeded / batteryKwh) * 100),
    complete: requiredKwh - kwhNeeded < 1e-7,
    cheapestCost: null,
    savings: null,
  };
}
