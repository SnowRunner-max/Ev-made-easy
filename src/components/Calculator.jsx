import { useMemo, useState } from 'react';
import vehiclesData from '../data/vehicles.json';
import { calcChargeSummary } from '../engine/costCalculator';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const CUSTOM_ID = 'custom';
const CHARGE_SUMMARY_DEBOUNCE_MS = 120;

/**
 * Vehicle picker + charge slider — presentational, accepts controlled props.
 * Used in the left panel of the two-panel layout.
 */
export function VehicleInputs({
  selectedId,
  customKwh,
  currentPct,
  batteryKwh,
  onSelectedIdChange,
  onCustomKwhChange,
  onCurrentPctChange,
  sliderOnly = false,
}) {
  const isCustom = selectedId === CUSTOM_ID;

  return (
    <div className="space-y-5">
      {!sliderOnly && (
        <div>
          <label className="block text-xs text-[var(--text-secondary)] font-semibold mb-1.5">
            Vehicle Type
          </label>
          <select
            data-testid="vehicle-select"
            value={selectedId}
            onChange={e => onSelectedIdChange(e.target.value)}
            className="w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-surface-container-highest border-none rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-paprika/20 cursor-pointer transition-colors font-medium"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236B6B7B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            {vehiclesData.vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model}{v.trim ? ` (${v.trim})` : ''} — {v.usableBatteryKwh} kWh
              </option>
            ))}
            <option value={CUSTOM_ID}>Custom battery size…</option>
          </select>

          {isCustom && (
            <div className="mt-2.5 flex items-center gap-2">
              <input
                data-testid="custom-kwh-input"
                type="number"
                min="1"
                max="500"
                value={customKwh}
                onChange={e => onCustomKwhChange(e.target.value)}
                placeholder="Battery size"
                aria-label="Custom battery size in kWh"
                className="w-28 px-3 py-2 text-sm bg-surface-container-highest border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-paprika/20"
              />
              <span className="text-sm text-[var(--text-muted)]">kWh</span>
            </div>
          )}

          <p data-testid="battery-display" className="mt-1.5 text-xs text-[var(--text-muted)]">
            Battery: <span className="font-semibold text-[var(--text-secondary)]">{batteryKwh} kWh</span>
          </p>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            Current Charge %
          </label>
          <strong
            data-testid="charge-label"
            className="font-display text-3xl font-black text-paprika leading-none"
          >
            {currentPct}%
          </strong>
        </div>
        {/* Slider track with fill indicator */}
        <div className="relative h-10 bg-surface-container-high rounded-full overflow-hidden flex items-center">
          <div
            className="absolute inset-y-0 left-0 bg-paprika/20 rounded-full"
            style={{ width: `calc(${currentPct}% + ${(50 - currentPct) * 0.28}px)` }}
          />
          <input
            data-testid="charge-slider"
            type="range"
            min="0"
            max="100"
            value={currentPct}
            onChange={e => onCurrentPctChange(Number(e.target.value))}
            aria-label="Current charge percentage"
            className="relative z-10 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-paprika [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg"
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <span>Empty</span>
          <span>50%</span>
          <span>Full</span>
        </div>
      </div>
    </div>
  );
}

function formatDuration(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/**
 * Cost output cards — presentational, accepts the summary object from calcChargeSummary.
 * Used in the right (dark) panel.
 */
export function CostOutput({ summary }) {
  if (!summary) return null;

  return (
    <div data-testid="cost-output" className="flex flex-col gap-3">
      {summary.to80 && <CostCard prefix="to80" label="Charge to 80%" data={summary.to80} />}
      {summary.to100 && <CostCard prefix="to100" label="Charge to 100%" data={summary.to100} />}
    </div>
  );
}

function CostCard({ prefix, label, data }) {
  return (
    <div
      data-testid={`${prefix}-block`}
      className="group bg-white/5 border border-white/10 hover:border-paprika/50 rounded-xl p-5 transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">
            {label}
          </div>
          <div
            data-testid={`${prefix}-cost-now`}
            className="font-display text-3xl font-black text-white"
          >
            ${data.costNow.toFixed(2)}
          </div>
        </div>
        <div className="text-right">
          <span
            data-testid={`${prefix}-kwh`}
            className="text-[10px] font-bold text-pewter uppercase tracking-wider block"
          >
            +{data.kwhNeeded.toFixed(1)} kWh
          </span>
          <span
            data-testid={`${prefix}-duration`}
            className="text-[10px] text-pewter/70 block mt-0.5"
          >
            ~{formatDuration(data.hoursNeeded)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Calculator — self-contained stateful component.
 * Kept for test compatibility: all testids are present when rendered standalone.
 */
export default function Calculator({ planConfig }) {
  const [selectedId, setSelectedId] = useState(vehiclesData.vehicles[0].id);
  const [customKwh, setCustomKwh] = useState('');
  const [currentPct, setCurrentPct] = useState(20);

  const isCustom = selectedId === CUSTOM_ID;
  const selectedVehicle = vehiclesData.vehicles.find(v => v.id === selectedId);
  const batteryKwh = isCustom
    ? Math.min(500, Math.max(1, parseFloat(customKwh) || 1))
    : selectedVehicle.usableBatteryKwh;
  const summaryPct = useDebouncedValue(currentPct, CHARGE_SUMMARY_DEBOUNCE_MS);

  const summary = useMemo(
    () => batteryKwh > 0 && summaryPct < 100
      ? calcChargeSummary(new Date(), batteryKwh, summaryPct, 7.7, planConfig)
      : null,
    [batteryKwh, summaryPct, planConfig]
  );

  return (
    <div data-testid="calculator" className="w-full">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Cost to Charge</h2>
      <VehicleInputs
        selectedId={selectedId}
        customKwh={customKwh}
        currentPct={currentPct}
        batteryKwh={batteryKwh}
        onSelectedIdChange={setSelectedId}
        onCustomKwhChange={setCustomKwh}
        onCurrentPctChange={setCurrentPct}
      />
      {summary && (
        <div className="mt-4">
          <CostOutput summary={summary} />
        </div>
      )}
    </div>
  );
}
