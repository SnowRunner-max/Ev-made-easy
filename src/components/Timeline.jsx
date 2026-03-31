import { useState, useEffect } from 'react';
import { getDaySchedule } from '../engine/rateEngine';
import { getPacificFractionalHour } from '../utils/pacificTime';
import { PERIOD_COLORS } from '../constants/periodColors';

function hourToLabel(hour) {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export default function Timeline({ planConfig }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // E-1 tiered plan — no time-based schedule to display
  if (!planConfig.touPeriods) {
    return (
      <div data-testid="timeline" className="w-full">
        <div className="h-14 rounded-lg bg-gray-200 flex items-center justify-center">
          <span className="text-sm text-gray-500">No time-based pricing — rate is the same all day</span>
        </div>
      </div>
    );
  }

  const schedule = getDaySchedule(now, planConfig);
  const markerPercent = (getPacificFractionalHour(now) / 24) * 100;

  // Derive boundary hours from block boundaries; filter out labels too close to neighbors
  const allBoundaryHours = [0, ...schedule.map(b => b.endHour)];
  const boundaryHours = allBoundaryHours.filter((h, i, arr) => {
    if (i === 0 || i === arr.length - 1) return true;
    return (h - arr[i - 1]) >= 2;
  });

  return (
    <div data-testid="timeline" className="w-full">
      {/* Outer wrapper is relative so the caret can sit above the bar */}
      <div className="relative">
        {/* Downward-pointing caret above the bar */}
        <div
          data-testid="timeline-marker-caret"
          className="absolute -top-4 -translate-x-1/2 pointer-events-none z-10 text-blue-500 text-sm leading-none select-none"
          style={{ left: `${markerPercent}%` }}
        >
          ▼
        </div>

        {/* Segmented bar */}
        <div className="relative flex h-14 rounded-lg overflow-hidden">
          {schedule.map((block, i) => {
            const widthPct = ((block.endHour - block.startHour) / 24) * 100;
            return (
              <div
                key={i}
                data-testid={`segment-${block.period}-${i}`}
                style={{ width: `${widthPct}%` }}
                className={`${PERIOD_COLORS[block.period].bg} flex items-center justify-center overflow-hidden`}
                title={`${block.periodLabel}: ${block.startHour}:00–${block.endHour}:00`}
              >
                <span className="text-xs font-bold text-white drop-shadow select-none">
                  ${block.rate.toFixed(2)}
                </span>
              </div>
            );
          })}

          {/* Blue vertical line */}
          <div
            data-testid="timeline-marker"
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none"
            style={{ left: `${markerPercent}%` }}
          />
        </div>
      </div>

      {/* Boundary time labels */}
      <div className="relative h-5 mt-1">
        {boundaryHours.map((hour, i) => {
          const isFirst = i === 0;
          const isLast  = i === boundaryHours.length - 1;
          return (
            <span
              key={hour}
              className={`absolute text-xs text-gray-400 ${
                isFirst ? '' : isLast ? '-translate-x-full' : '-translate-x-1/2'
              }`}
              style={{ left: `${(hour / 24) * 100}%` }}
            >
              {hourToLabel(hour)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
