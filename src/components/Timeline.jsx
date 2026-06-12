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
          className="absolute -top-4 -translate-x-1/2 pointer-events-none z-20 text-[var(--text-secondary)] text-[10px] leading-none select-none"
          style={{ left: `${markerPercent}%` }}
        >
          ▼
        </div>

        {/* ── Layer 1: colored background bar (overflow-hidden for rounded corners) ── */}
        <div className="relative flex h-10 rounded-lg overflow-hidden">
          {schedule.map((block, i) => {
            const widthPct = ((block.endHour - block.startHour) / 24) * 100;
            return (
              <div
                key={i}
                data-testid={`segment-${block.period}-${i}`}
                data-period={block.period}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: PERIOD_COLORS[block.period].timelineColor,
                  borderRight: i < schedule.length - 1 ? '2px solid rgba(255,255,255,0.25)' : 'none',
                }}
              />
            );
          })}
        </div>

        {/* ── Layer 2: price labels (absolute overlay, overflow-visible) ── */}
        <div className="absolute inset-0 flex pointer-events-none">
          {schedule.map((block, i) => {
            const widthPct = ((block.endHour - block.startHour) / 24) * 100;
            const segmentHours = block.endHour - block.startHour;
            // For very narrow segments (< 1.5 hours), skip the inline label to avoid
            // severe overlap — the bar color + legend still communicate the period.
            if (segmentHours < 1.5) return <div key={i} style={{ width: `${widthPct}%` }} />;
            return (
              <div
                key={i}
                data-testid={`segment-price-${block.period}-${i}`}
                className="flex items-center justify-center overflow-visible"
                style={{ width: `${widthPct}%` }}
              >
                <span
                  className="font-display text-[11px] font-bold text-white whitespace-nowrap"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
                >
                  ${block.rate.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Current time marker (line) ── */}
        <div
          data-testid="timeline-marker"
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_6px_rgba(255,255,255,0.5)] pointer-events-none z-10"
          style={{ left: `${markerPercent}%` }}
        />
      </div>

      {/* Boundary time labels */}
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

      {/* Legend — only show periods present in today's schedule */}
      <div className="flex gap-4 mt-3 text-[11px] text-[var(--text-secondary)]">
        {[...new Set(schedule.map(b => b.period))].map(period => (
          <span key={period} className="flex items-center gap-1.5 font-medium">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: PERIOD_COLORS[period].timelineColor }}
            />
            {PERIOD_COLORS[period].label}
          </span>
        ))}
      </div>
    </div>
  );
}
