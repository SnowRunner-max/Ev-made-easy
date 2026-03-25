import { useEffect } from 'react';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Runs a callback on a self-rescheduling interval that ticks every 60s normally,
 * but switches to every 1s when the next event is within 5 minutes.
 *
 * @param {() => void} onTick - Called on each interval tick
 * @param {() => number} getMsToNext - Returns ms until the next significant event
 * @param {any[]} deps - Effect dependencies (re-creates the interval when these change)
 */
export function useSmartInterval(onTick, getMsToNext, deps) {
  useEffect(() => {
    let id;

    function schedule() {
      const interval = getMsToNext() <= FIVE_MINUTES_MS ? 1_000 : 60_000;
      id = setInterval(() => {
        onTick();
        clearInterval(id);
        schedule();
      }, interval);
    }

    schedule();
    return () => clearInterval(id);
  // deps are provided by the caller; intentionally variable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
