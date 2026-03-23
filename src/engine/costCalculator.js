import { getRate, getNextRateChange, getPacificDateStr } from './rateEngine';

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
 * Builds a Date at the given Pacific wall-clock hour on the same Pacific
 * calendar day as the reference date. Uses iterative Intl correction for
 * DST safety.
 */
function buildPacificHour(dateStr, targetHour) {
  const [year, month, day] = dateStr.split('-').map(Number);
  let guess = Date.UTC(year, month - 1, day, 20, 0, 0); // UTC noon-ish Pacific

  for (let i = 0; i < 25; i++) {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
    }).format(new Date(guess));
    const pacificHour = parseInt(formatted) === 24 ? 0 : parseInt(formatted);
    const diff = targetHour - pacificHour;
    if (diff === 0) break;
    guess += diff * 3_600_000;
  }

  return new Date(guess);
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
    const start = buildPacificHour(dateStr, hour);
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
