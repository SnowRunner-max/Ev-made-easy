import { useEffect, useMemo, useState } from 'react';
import { getRate, getNextRateChange, getNextIntegrationBoundary } from '../engine/rateEngine';
import { useSmartInterval } from './useSmartInterval';

export function useCurrentRate(planConfig) {
  const [now, setNow] = useState(() => new Date());

  const nextChange = useMemo(() => getNextRateChange(now, planConfig), [now, planConfig]);
  const nextBoundary = getNextIntegrationBoundary(now, planConfig).time.getTime();
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useSmartInterval(
    () => setNow(new Date()),
    wallNow => nextBoundary - wallNow,
    [planConfig, nextBoundary]
  );

  return { ...getRate(now, planConfig), nextChange, now };
}
