import { useMemo, useRef } from 'react';
import { getRate, getPacificDateStr } from '../engine/rateEngine';
import { buildPacificTime } from '../utils/pacificTime';
import { getWindowSegments } from '../engine/chargingWindow';
import { PERIOD_COLORS } from '../constants/periodColors';
import AppIcon from './AppIcon';

function timeValue(hour) {
  const minutes = Math.round(hour * 60) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function timeLabel(hour) {
  const minutes = Math.round(hour * 60) % 1440,
    h = Math.floor(minutes / 60),
    m = minutes % 60;
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
}
function WindowHandle({ kind, value, onChange, plotRef, nextDay, close }) {
  const drag = useRef(null);
  const position = kind === 'end' && value === 0 ? 24 : value;
  const update = (hour) => {
    const h = Math.round(Math.max(0, Math.min(kind === 'start' ? 23.75 : 24, hour)) * 4) / 4;
    onChange(h === 24 ? 0 : h);
  };
  return (
    <button
      type="button"
      className={`window-handle ${kind}-handle${close ? ' close-handle' : ''}`}
      role="slider"
      style={{ left: `${(position / 24) * 100}%` }}
      aria-label={`Charging window ${kind} on chart`}
      aria-valuemin={0}
      aria-valuemax={kind === 'start' ? 23.75 : 24}
      aria-valuenow={position}
      aria-valuetext={`${timeLabel(value)}${nextDay ? ' next day' : ''}`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        drag.current = {
          x: e.clientX,
          hour: position,
          width: plotRef.current.getBoundingClientRect().width,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.focus();
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (drag.current)
          update(drag.current.hour + ((e.clientX - drag.current.x) / drag.current.width) * 24);
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        const delta = {
          ArrowRight: 0.25,
          ArrowUp: 0.25,
          ArrowLeft: -0.25,
          ArrowDown: -0.25,
          PageUp: 1,
          PageDown: -1,
        }[e.key];
        if (delta === undefined && e.key !== 'Home' && e.key !== 'End') return;
        e.preventDefault();
        update(e.key === 'Home' ? 0 : e.key === 'End' ? 24 : position + delta);
      }}
    >
      <span />
    </button>
  );
}

export default function ChargingWindow({
  planConfig,
  now,
  startHour,
  endHour,
  onStartChange,
  onEndChange,
  result,
  error,
}) {
  const plotRef = useRef(null),
    date = getPacificDateStr(now);
  // Quarter-hour samples preserve utilities with half-hour tariff boundaries.
  const bars = useMemo(
    () =>
      Array.from({ length: 96 }, (_, i) => ({
        hour: i / 4,
        slots: 1,
        ...getRate(
          buildPacificTime(date, i / 4, endHour <= startHour && i / 4 < endHour),
          planConfig,
        ),
      })).reduce((groups, bar) => {
        const previous = groups.at(-1);
        if (
          previous &&
          Math.floor(previous.hour) === Math.floor(bar.hour) &&
          previous.rate === bar.rate &&
          previous.period === bar.period
        )
          previous.slots++;
        else groups.push(bar);
        return groups;
      }, []),
    [date, planConfig, startHour, endHour],
  );
  const max = Math.max(10, Math.ceil(Math.max(...bars.map((b) => b.rate)) * 10) * 10);
  const legend = [...new Map(bars.map((b) => [`${b.period}:${b.rate}`, b])).values()];
  const segments = getWindowSegments(startHour, endHour);
  const endPosition = endHour === 0 ? 24 : endHour,
    close = Math.abs(startHour - endPosition) < 2;
  const finish = result?.finish.toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
  });
  return (
    <section className="card schedule" aria-labelledby="scheduleTitle">
      <div className="schedule-heading">
        <h2 id="scheduleTitle">Charging window</h2>
        <span className="schedule-plan">{planConfig.rateDesignation} · ¢/kWh</span>
      </div>
      <div className="window-controls">
        {[
          ['Start', startHour, onStartChange],
          ['End', endHour, onEndChange],
        ].map(([label, hour, change], i) => (
          <div className="time-field" key={label}>
            {i === 1 && <AppIcon name="chevron" />}
            <label>
              <span>{label}</span>
              <input
                type="time"
                step="900"
                aria-label={`Charging window ${label.toLowerCase()}`}
                value={timeValue(hour)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [h, m] = e.target.value.split(':').map(Number);
                    change(h + m / 60);
                  }
                }}
              />
            </label>
          </div>
        ))}
        {endHour <= startHour && <span className="next-day">+1 day</span>}
      </div>
      <p
        className={`window-result${result && !result.complete ? ' incomplete' : ''}`}
        role="status"
      >
        {error ||
          (!result
            ? 'Enter your location in Setup'
            : result.requiredKwh === 0
              ? 'Target already reached'
              : result.complete
                ? `${Math.round(result.finalPct)}% ready at ${finish}${getPacificDateStr(result.finish) !== date ? ' tomorrow' : ''}`
                : `Reaches ${Math.round(result.finalPct)}% · window too short`)}
      </p>
      <div
        className="rate-chart"
        data-testid="timeline"
        role="group"
        aria-label="Hourly electricity prices and charging window"
      >
        <div className="chart-y" aria-hidden="true">
          <span>{max}¢</span>
          <span>{max / 2}¢</span>
          <span>0</span>
        </div>
        <div className="chart-plot" ref={plotRef}>
          <div className="chart-grid" aria-hidden="true" />
          <div className="window-shade" aria-hidden="true">
            {segments.map(([a, b]) => (
              <span
                key={a}
                style={{ left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%` }}
              />
            ))}
          </div>
          <div
            className="hour-bars"
            role="img"
            aria-label={`Prices for ${date}, Pacific Time. ${legend.map((b) => `${b.periodLabel} ${(b.rate * 100).toFixed(2)} cents per kilowatt-hour`).join('; ')}. Window ${timeLabel(startHour)} to ${timeLabel(endHour)}${endHour <= startHour ? ' next day' : ''}.`}
          >
            {bars.map((b) => (
              <span
                key={b.hour}
                className="hour-bar"
                style={{
                  gridColumn: `span ${b.slots}`,
                  height: `${((b.rate * 100) / max) * 100}%`,
                  backgroundColor: PERIOD_COLORS[b.period]?.timelineColor || 'var(--blue)',
                  opacity: segments.some(([a, c]) => b.hour < c && b.hour + b.slots / 4 > a)
                    ? 1
                    : 0.4,
                }}
                title={`${timeLabel(b.hour)} · ${(b.rate * 100).toFixed(2)}¢/kWh`}
              />
            ))}
          </div>
          <WindowHandle
            kind="start"
            value={startHour}
            onChange={onStartChange}
            plotRef={plotRef}
            close={close}
          />
          <WindowHandle
            kind="end"
            value={endHour}
            onChange={onEndChange}
            plotRef={plotRef}
            close={close}
            nextDay={endHour <= startHour}
          />
        </div>
        <div className="chart-x" aria-hidden="true">
          {['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'].map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
      </div>
      <div className="rate-legend" aria-label="Price per kilowatt-hour">
        {legend.map((b) => (
          <div key={`${b.period}:${b.rate}`}>
            <span>
              <i
                style={{ backgroundColor: PERIOD_COLORS[b.period]?.timelineColor || 'var(--blue)' }}
              />
              {b.periodLabel}
            </span>
            <strong>{(b.rate * 100).toFixed(2)}¢</strong>
          </div>
        ))}
      </div>
      <p className="schedule-footnote">
        Today · Pacific Time. Drag handles in 15-minute steps.
        {endHour <= startHour && ' Highlighted morning hours use tomorrow’s rates.'}
        {!planConfig.touPeriods && ' No time-based pricing.'}
      </p>
    </section>
  );
}
