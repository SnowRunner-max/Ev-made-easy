import { getRate, getNextIntegrationBoundary } from './rateEngine';
import { getPacificHour } from '../utils/pacificTime';

const DEFAULT_CHARGING_KW = 7.7;
const HOUR_MS = 3_600_000;
const MAX_SESSION_HOURS = 366 * 24;

function sessionInputs(startTime, kwhNeeded, chargingKw, options) {
  const efficiency = options.chargingEfficiency ?? 1;
  if (!Number.isFinite(startTime?.getTime()) || !Number.isFinite(kwhNeeded) || kwhNeeded < 0
    || !Number.isFinite(chargingKw) || chargingKw <= 0
    || !Number.isFinite(efficiency) || efficiency <= 0 || efficiency > 1) {
    throw new RangeError('A valid clock, nonnegative energy, positive power and efficiency in (0, 1] are required.');
  }
  const meteredKwh = kwhNeeded / efficiency;
  const hoursNeeded = meteredKwh / chargingKw;
  if (!Number.isFinite(hoursNeeded) || hoursNeeded > MAX_SESSION_HOURS) {
    throw new RangeError('Charging session exceeds the supported one-year horizon.');
  }
  return { meteredKwh, hoursNeeded };
}

function nextBoundaryMs(currentTime, planConfig) {
  const next = getNextIntegrationBoundary(new Date(currentTime), planConfig)?.time?.getTime();
  if (!Number.isFinite(next) || next <= currentTime) {
    throw new RangeError('Integration boundary must be finite and strictly in the future.');
  }
  return next;
}

/** kwhNeeded is battery energy; chargingKw is wall/meter power. Default efficiency is 100%. */
export function calcChargeCost(startTime, kwhNeeded, chargingKw = DEFAULT_CHARGING_KW, planConfig, options = {}) {
  const { meteredKwh, hoursNeeded } = sessionInputs(startTime, kwhNeeded, chargingKw, options);
  let remainingKwh = meteredKwh;
  let currentTime = startTime.getTime();
  let totalCost = 0;
  const componentCosts = {};
  const initialBaseline = planConfig._baselineRemainingKwh;
  const crossesBaseline = Number.isFinite(initialBaseline) && initialBaseline > 0;
  let remainingBaseline = initialBaseline;
  let iterations = 0;

  while (remainingKwh > 1e-9) {
    if (++iterations > 20_000) throw new RangeError('Charging integration exceeded its boundary limit.');
    const info = getRate(new Date(currentTime), planConfig);
    if (!Number.isFinite(info.rate)) throw new RangeError('A finite effective rate is required.');
    const components = { ...(info.components ?? { delivery: info.delivery, generation: info.generation }) };
    let rate = info.rate;
    if (crossesBaseline && remainingBaseline <= 1e-9) {
      const delta = planConfig._aboveBaselineDelta ?? 0;
      const key = planConfig._aboveBaselineComponent ?? 'delivery';
      rate += delta;
      components[key] = (components[key] ?? 0) + delta;
    }
    if (Object.values(components).some(value => !Number.isFinite(value))
      || Math.abs(Object.values(components).reduce((a, b) => a + b, 0) - rate) > 1e-7) {
      throw new RangeError('Rate components must be finite and reconcile with the total rate.');
    }
    const boundary = nextBoundaryMs(currentTime, planConfig);
    let energy = Math.min(remainingKwh, (boundary - currentTime) / HOUR_MS * chargingKw);
    if (crossesBaseline && remainingBaseline > 1e-9) energy = Math.min(energy, remainingBaseline);
    const nextTime = currentTime + energy / chargingKw * HOUR_MS;
    if (!(energy > 0) || nextTime <= currentTime) throw new RangeError('Charging integration did not advance.');
    totalCost += energy * rate;
    for (const [key, value] of Object.entries(components)) {
      componentCosts[key] = (componentCosts[key] ?? 0) + energy * value;
    }
    remainingKwh -= energy;
    if (crossesBaseline) remainingBaseline = Math.max(0, remainingBaseline - energy);
    currentTime = nextTime;
  }
  return { totalCost, hoursNeeded, meteredKwh, componentCosts };
}

/**
 * Search the next 24 elapsed hours, including starts whose finish or baseline
 * crossing meets a tariff boundary. Absolute timestamps disambiguate DST days.
 */
export function findCheapestWindow(date, kwhNeeded, chargingKw = DEFAULT_CHARGING_KW, planConfig, options = {}) {
  const { hoursNeeded } = sessionInputs(date, kwhNeeded, chargingKw, options);
  const startMs = date.getTime();
  const horizon = startMs + 24 * HOUR_MS;
  const duration = hoursNeeded * HOUR_MS;
  const baselineDuration = Number.isFinite(planConfig._baselineRemainingKwh)
    ? Math.min(duration, planConfig._baselineRemainingKwh / chargingKw * HOUR_MS) : 0;
  const candidates = new Set([startMs, horizon]);
  let cursor = startMs;
  let iterations = 0;
  while (cursor < horizon + duration) {
    if (++iterations > 20_000) throw new RangeError('Window search exceeded its boundary limit.');
    cursor = nextBoundaryMs(cursor, planConfig);
    for (const candidate of [cursor, cursor - duration, cursor - baselineDuration]) {
      if (candidate >= startMs && candidate <= horizon) candidates.add(candidate);
    }
  }
  let best = null;
  for (const timestamp of [...candidates].sort((a, b) => a - b)) {
    const startTime = new Date(timestamp);
    const { totalCost } = calcChargeCost(startTime, kwhNeeded, chargingKw, planConfig, options);
    if (!best || totalCost < best.totalCost - 1e-9) {
      best = { startTime, startHour: Math.floor(getPacificHour(startTime)), totalCost };
    }
  }
  return best;
}

/** Compute battery/meter energy, reconciled components, and feasible savings. */
export function calcChargeSummary(startTime, batteryKwh, currentPct, chargingKw = DEFAULT_CHARGING_KW, planConfig, options = {}) {
  if (!Number.isFinite(batteryKwh) || batteryKwh <= 0 || !Number.isFinite(currentPct)
    || currentPct < 0 || currentPct > 100) throw new RangeError('Invalid battery capacity or charge percentage.');
  function forTarget(targetPct) {
    if (currentPct >= targetPct) return null;
    const kwhNeeded = batteryKwh * (targetPct - currentPct) / 100;
    const { totalCost: costNow, hoursNeeded, meteredKwh, componentCosts } =
      calcChargeCost(startTime, kwhNeeded, chargingKw, planConfig, options);
    const { totalCost: cheapestCost, startHour: cheapestHour, startTime: cheapestStartTime } =
      options.optimize === false
        ? { totalCost: null, startHour: null, startTime: null }
        : findCheapestWindow(startTime, kwhNeeded, chargingKw, planConfig, options);
    return { kwhNeeded, meteredKwh, componentCosts, hoursNeeded, costNow,
      cheapestCost, cheapestHour, cheapestStartTime, savings: cheapestCost === null ? null : costNow - cheapestCost };
  }
  return { to80: forTarget(80), to100: forTarget(100) };
}
