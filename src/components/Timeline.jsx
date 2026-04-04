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

  if (!planConfig.touPeriods) {
    return (
      <div data-testid="timeline" className="w-full">
        <div className="h-11 rounded-lg bg-pewter-light flex items-center justify-center">
          <span className="text-sm text-[var(--text-muted)]">No time-based pricing — rate is the same all day</span>
        </div>
      </div>
    );
  }

  const schedule = getDaySchedule(now, planConfig);
  const markerPercent = (getPacificFractionalHour(now) / 24) * 100;

  const allBoundaryHours = [0, ...schedule.map(b => b.endHour)];
  const boundaryHours = allBoundaryHours.filter((h, i, arr) => {
    if (i === 0 || i === arr.length - 1) return true;
    return (h - arr[i - 1]) >= 2;
  });

  return (
    <div data-testid="timeline" className="w-full">
      <div className="relative">
        {/* Downward caret above bar */}
        <div
          data-testid="timeline-marker-caret"
          className="absolute -top-4 -translate-x-1/2 pointer-events-none z-10 text-white text-[10px] leading-none select-none drop-shadow"
          style={{ left: `${markerPercent}%` }}
        >
          ▼
        </div>

        {/* Segmented bar */}
        <div className="relative flex h-11 rounded-lg overflow-hidden shadow-sm">
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
                <span className="text-[11px] font-bold text-white drop-shadow select-none">
                  ${block.rate.toFixed(2)}
                </span>
              </div>
            );
          })}

          {/* Current time marker */}
          <div
            data-testid="timeline-marker"
            className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.6)] pointer-events-none"
            style={{ left: `${markerPercent}%` }}
          />
        </div>
      </div>

      {/* Boundary labels */}
      <div className="relative h-5 mt-1.5">
        {boundaryHours.map((hour, i) => {
          const isFirst = i === 0;
          const isLast  = i === boundaryHours.length - 1;
          return (
            <span
              key={hour}
              className={`absolute text-[10px] text-[var(--text-muted)] ${
                isFirst ? '' : isLast ? '-translate-x-full' : '-translate-x-1/2'
              }`}
              style={{ left: `${(hour / 24) * 100}%` }}
            >
              {hourToLabel(hour)}
            </span>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-[11px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
          Off-Peak
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
          Part-Peak
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
          Peak
        </span>
      </div>
    </div>
  );
}
