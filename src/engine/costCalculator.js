import { getRate, getNextRateChange, getPacificDateStr } from './rateEngine';
import { buildPacificTime } from '../utils/pacificTime';

const DEFAULT_CHARGING_KW = 7.7;

/**
 * Calculates the total cost to add kwhNeeded kWh starting at startTime,
 * walking forward through TOU periods until the energy is fully delivered.
 *
 * @param {Date} startTime
 * @param {number} kwhNeeded
 * @param {number} chargingKw
 * @param {Object} planConfig
 * @returns {{ totalCost: number, hoursNeeded: number }}
 */
export function calcChargeCost(startTime, kwhNeeded, chargingKw = DEFAULT_CHARGING_KW, planConfig) {
  const hoursNeeded = kwhNeeded / chargingKw;
  let remainingHours = hoursNeeded;
  let currentTime = startTime.getTime();
  let totalCost = 0;

  while (remainingHours > 0) {
    const { rate } = getRate(new Date(currentTime), planConfig);
    const { time: nextBoundary } = getNextRateChange(new Date(currentTime), planConfig);
    const hoursUntilBoundary = (nextBoundary.getTime() - currentTime) / 3_600_000;
    const hoursThisPeriod = Math.min(remainingHours, hoursUntilBoundary);
    totalCost += hoursThisPeriod * chargingKw * rate;
    remainingHours -= hoursThisPeriod;
    currentTime += hoursThisPeriod * 3_600_000;
  }

  return { totalCost, hoursNeeded };
}

/**
 * Finds the cheapest 24-hour starting window for charging kwhNeeded kWh,
 * trying each Pacific hour of the day of the given date.
 *
 * @param {Date} date
 * @param {number} kwhNeeded
 * @param {number} chargingKw
 * @param {Object} planConfig
 * @returns {{ startHour: number, totalCost: number }}
 */
export function findCheapestWindow(date, kwhNeeded, chargingKw = DEFAULT_CHARGING_KW, planConfig) {
  const dateStr = getPacificDateStr(date);
  let best = null;

  for (let hour = 0; hour < 24; hour++) {
    const start = buildPacificTime(dateStr, hour);
    const { totalCost } = calcChargeCost(start, kwhNeeded, chargingKw, planConfig);
    if (!best || totalCost < best.totalCost) {
      best = { startHour: hour, totalCost };
    }
  }

  return best;
}

/**
 * Convenience wrapper that computes full charge summaries for 80% and 100% targets.
 *
 * @param {Date} startTime
 * @param {number} batteryKwh   — total usable battery capacity
 * @param {number} currentPct   — current state of charge (0–100)
 * @param {number} chargingKw
 * @param {Object} planConfig
 * @returns {{ to80: object|null, to100: object|null }}
 */
export function calcChargeSummary(startTime, batteryKwh, currentPct, chargingKw = DEFAULT_CHARGING_KW, planConfig) {
  function forTarget(targetPct) {
    if (currentPct >= targetPct) return null;
    const kwhNeeded = batteryKwh * (targetPct - currentPct) / 100;
    const { totalCost: costNow, hoursNeeded } = calcChargeCost(startTime, kwhNeeded, chargingKw, planConfig);
    const { totalCost: cheapestCost, startHour: cheapestHour } =
      findCheapestWindow(startTime, kwhNeeded, chargingKw, planConfig);
    return {
      kwhNeeded,
      hoursNeeded,
      costNow,
      cheapestCost,
      cheapestHour,
      savings: costNow - cheapestCost,
    };
  }

  return { to80: forTarget(80), to100: forTarget(100) };
}
