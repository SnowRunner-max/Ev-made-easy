import { useState } from 'react';
import { getRate, getNextRateChange } from '../engine/rateEngine';
import { useSmartInterval } from './useSmartInterval';

export function useCurrentRate(planConfig) {
  const [now, setNow] = useState(() => new Date());

  useSmartInterval(
    () => setNow(new Date()),
    () => {
      const current = new Date();
      return getNextRateChange(current, planConfig).time.getTime() - current.getTime();
    },
    [planConfig]
  );

  return { ...getRate(now, planConfig), nextChange: getNextRateChange(now, planConfig) };
}
