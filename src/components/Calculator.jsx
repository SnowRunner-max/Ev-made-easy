import { useState } from 'react';
import vehiclesData from '../data/vehicles.json';
import { calcChargeSummary } from '../engine/costCalculator';

const CUSTOM_ID = 'custom';

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
}) {
  const isCustom = selectedId === CUSTOM_ID;

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-1.5">
          Electric vehicle
        </label>
        <select
          data-testid="vehicle-select"
          value={selectedId}
          onChange={e => onSelectedIdChange(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm text-[var(--text-primary)] bg-white border-[1.5px] border-pewter-light rounded-lg appearance-none focus:outline-none focus:border-paprika focus:ring-2 focus:ring-paprika/15 cursor-pointer transition-colors"
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
              className="w-28 px-3 py-2 text-sm border-[1.5px] border-pewter-light rounded-lg focus:outline-none focus:border-paprika focus:ring-2 focus:ring-paprika/15"
            />
            <span className="text-sm text-[var(--text-muted)]">kWh</span>
          </div>
        )}

        <p data-testid="battery-display" className="mt-1.5 text-xs text-[var(--text-muted)]">
          Battery: <span className="font-semibold text-[var(--text-secondary)]">{batteryKwh} kWh</span>
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-[13px] font-semibold text-[var(--text-primary)]">
            Current charge
          </label>
          <strong
            data-testid="charge-label"
            className="font-serif text-[22px] text-[var(--text-primary)] leading-none"
          >
            {currentPct}%
          </strong>
        </div>
        <input
          data-testid="charge-slider"
          type="range"
          min="0"
          max="100"
          value={currentPct}
          onChange={e => onCurrentPctChange(Number(e.target.value))}
          aria-label="Current charge percentage"
          className="w-full h-1.5 appearance-none bg-pewter-light rounded-full outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-paprika [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(207,92,54,0.3)]"
        />
        <div className="flex justify-between mt-1 text-[11px] text-[var(--text-muted)]">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
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
      className="bg-ink-light border border-white/[0.06] rounded-xl p-4"
    >
      <div className="text-[12px] font-semibold text-pewter uppercase tracking-[0.8px] mb-2">
        {label}
      </div>
      <div
        data-testid={`${prefix}-cost-now`}
        className="font-serif text-[28px] tracking-tight leading-none mb-1 text-white"
      >
        ${data.costNow.toFixed(2)}
      </div>
      <div className="text-[12px] text-[var(--text-muted)] mt-1">
        <span data-testid={`${prefix}-kwh`}>{data.kwhNeeded.toFixed(1)} kWh</span>
        {' · '}
        <span data-testid={`${prefix}-hours`}>{data.hoursNeeded.toFixed(2)}</span> hrs at 7.7 kW
      </div>
      <div className="mt-2 text-[11px]">
        <span className="text-[var(--text-muted)]">Best: </span>
        <span
          data-testid={`${prefix}-cheapest-cost`}
          className="font-semibold text-emerald-400"
        >
          ${data.cheapestCost.toFixed(2)}
        </span>
        {data.savings > 0.005 ? (
          <span data-testid={`${prefix}-savings`} className="ml-2 text-emerald-400">
            ↓ save ${data.savings.toFixed(2)}
          </span>
        ) : (
          <span data-testid={`${prefix}-savings`} className="ml-2 text-apricot">
            ✓ now is optimal
          </span>
        )}
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

  const summary = batteryKwh > 0 && currentPct < 100
    ? calcChargeSummary(new Date(), batteryKwh, currentPct, 7.7, planConfig)
    : null;

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
