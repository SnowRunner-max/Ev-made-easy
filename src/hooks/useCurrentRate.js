import { useState } from 'react';
import { getRate, getNextRateChange } from '../engine/rateEngine';
import { useSmartInterval } from './useSmartInterval';

export function useCurrentRate(planConfig) {
  const [now, setNow] = useState(() => new Date());

  const nextChange = getNextRateChange(now, planConfig);

  useSmartInterval(
    () => setNow(new Date()),
    () => nextChange.time.getTime() - now.getTime(),
    [planConfig, nextChange.time.getTime()]
  );

  return { ...getRate(now, planConfig), nextChange, now };
}
