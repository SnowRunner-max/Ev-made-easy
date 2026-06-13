import { useState } from 'react';
import { getRate, getNextRateChange } from '../engine/rateEngine';
import { useSmartInterval } from './useSmartInterval';

export function useCurrentRate(planConfig) {
  const [now, setNow] = useState(() => new Date());

  const nextChange = getNextRateChange(now, planConfig);

  useSmartInterval(
    () => setNow(new Date()),
    // Read the wall clock here, not the `now` state: useSmartInterval re-invokes
    // this from a closure that effect deps only refresh after a boundary, so a
    // captured `now` would freeze the delay and never tighten to the 1s cadence.
    () => nextChange.time.getTime() - Date.now(),
    [planConfig, nextChange.time.getTime()]
  );

  return { ...getRate(now, planConfig), nextChange, now };
}
