import { useState, useEffect } from 'react';
import { getDaySchedule } from '../engine/rateEngine';

const BG_COLORS = {
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
};

// Dropped "4 PM" — too close to "3 PM" to render without overlap.
// The amber→red color transition makes the 4 PM boundary visually clear.
const BOUNDARY_LABELS = [
  { hour: 0,  label: '12 AM' },
  { hour: 15, label: '3 PM'  },
  { hour: 21, label: '9 PM'  },
  { hour: 24, label: '12 AM' },
];

function getPacificFractionalHour(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find(p => p.type === 'hour').value);
  const minute = parseInt(parts.find(p => p.type === 'minute').value);
  return (hour === 24 ? 0 : hour) + minute / 60;
}

export default function Timeline() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const schedule = getDaySchedule(now);
  const markerPercent = (getPacificFractionalHour(now) / 24) * 100;

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
                className={`${BG_COLORS[block.colorScheme]} flex items-center justify-center overflow-hidden`}
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
        {BOUNDARY_LABELS.map(({ hour, label }) => {
          const isFirst = hour === 0;
          const isLast  = hour === 24;
          return (
            <span
              key={hour}
              className={`absolute text-xs text-gray-400 ${
                isFirst ? '' : isLast ? '-translate-x-full' : '-translate-x-1/2'
              }`}
              style={{ left: `${(hour / 24) * 100}%` }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
