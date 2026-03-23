import { useState, useEffect } from 'react';

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

  useEffect(() => {
    let id;

    function schedule() {
      const current = new Date();
      const msRemaining = targetTime.getTime() - current.getTime();
      const interval = msRemaining <= FIVE_MINUTES_MS ? 1_000 : 60_000;

      id = setInterval(() => {
        setNow(new Date());
        clearInterval(id);
        schedule();
      }, interval);
    }

    schedule();
    return () => clearInterval(id);
  }, [targetTime]);

  const msRemaining = Math.max(0, targetTime.getTime() - now.getTime());
  return { msRemaining, formatted: formatTimeRemaining(msRemaining) };
}
