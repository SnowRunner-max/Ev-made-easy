import { useState, useEffect } from 'react';
import { getRate, getNextRateChange } from '../engine/rateEngine';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function useCurrentRate() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let id;

    function schedule() {
      const current = new Date();
      const { time: nextChange } = getNextRateChange(current);
      const msUntilChange = nextChange.getTime() - current.getTime();
      const interval = msUntilChange <= FIVE_MINUTES_MS ? 1_000 : 60_000;

      id = setInterval(() => {
        setNow(new Date());
        // Reschedule to pick up the correct interval after each tick
        clearInterval(id);
        schedule();
      }, interval);
    }

    schedule();
    return () => clearInterval(id);
  }, []);

  return { ...getRate(now), nextChange: getNextRateChange(now) };
}
