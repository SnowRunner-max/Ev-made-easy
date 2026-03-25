import { useState } from 'react';
import { useSmartInterval } from './useSmartInterval';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function formatTimeRemaining(ms) {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((ms % 60_000) / 1_000);

  if (ms < FIVE_MINUTES_MS) {
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function useCountdown(targetTime) {
  const [now, setNow] = useState(() => new Date());

  useSmartInterval(
    () => setNow(new Date()),
    () => targetTime.getTime() - Date.now(),
    [targetTime]
  );

  const msRemaining = Math.max(0, targetTime.getTime() - now.getTime());
  return { msRemaining, formatted: formatTimeRemaining(msRemaining) };
}
