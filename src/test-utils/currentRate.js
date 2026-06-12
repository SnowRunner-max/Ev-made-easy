import { getRate, getNextRateChange } from '../engine/rateEngine';

/**
 * Builds the same shape App.jsx passes down as the `currentRate` prop,
 * for components that no longer call useCurrentRate themselves.
 */
export function buildCurrentRate(planConfig, now = new Date()) {
  return { ...getRate(now, planConfig), nextChange: getNextRateChange(now, planConfig), now };
}
