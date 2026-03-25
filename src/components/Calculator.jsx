import { useState } from 'react';
import vehiclesData from '../data/vehicles.json';
import { calcChargeSummary } from '../engine/costCalculator';

const CUSTOM_ID = 'custom';

function CostBlock({ prefix, label, data }) {
  if (!data) return null;
  return (
    <div data-testid={`${prefix}-block`} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{label}</h3>
      <div className="space-y-1 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-800" data-testid={`${prefix}-kwh`}>
            {data.kwhNeeded.toFixed(1)}
          </span>{' '}
          kWh needed &middot;{' '}
          <span data-testid={`${prefix}-hours`}>{data.hoursNeeded.toFixed(2)}</span> hrs
        </p>
        <p>
          Charge now:{' '}
          <span className="font-semibold text-gray-800" data-testid={`${prefix}-cost-now`}>
            ${data.costNow.toFixed(2)}
          </span>
        </p>
        <p>
          Best price:{' '}
          <span className="font-semibold text-emerald-700" data-testid={`${prefix}-cheapest-cost`}>
            ${data.cheapestCost.toFixed(2)}
          </span>
        </p>
        {data.savings > 0.005 && (
          <p className="text-emerald-600">
            Save{' '}
            <span className="font-semibold" data-testid={`${prefix}-savings`}>
              ${data.savings.toFixed(2)}
            </span>{' '}
            by waiting
          </p>
        )}
        {data.savings <= 0.005 && (
          <p className="text-emerald-600">
            <span data-testid={`${prefix}-savings`}>${data.savings.toFixed(2)}</span> savings — now is optimal!
          </p>
        )}
      </div>
    </div>
  );
}

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
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Cost to Charge</h2>

      <select
        data-testid="vehicle-select"
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {vehiclesData.vehicles.map(v => (
          <option key={v.id} value={v.id}>
            {v.make} {v.model}{v.trim ? ` (${v.trim})` : ''} — {v.usableBatteryKwh} kWh
          </option>
        ))}
        <option value={CUSTOM_ID}>Custom battery size…</option>
      </select>

      {isCustom && (
        <div className="mt-3 flex items-center gap-2">
          <input
            data-testid="custom-kwh-input"
            type="number"
            min="1"
            max="500"
            value={customKwh}
            onChange={e => setCustomKwh(e.target.value)}
            placeholder="Battery size"
            aria-label="Custom battery size in kWh"
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">kWh</span>
        </div>
      )}

      <p data-testid="battery-display" className="mt-3 text-sm text-gray-600">
        Battery: <span className="font-semibold text-gray-800">{batteryKwh} kWh</span>
      </p>

      <div className="mt-4">
        <label className="text-sm text-gray-600">
          Current charge:{' '}
          <span className="font-semibold text-gray-800" data-testid="charge-label">
            {currentPct}%
          </span>
        </label>
        <input
          data-testid="charge-slider"
          type="range"
          min="0"
          max="100"
          value={currentPct}
          onChange={e => setCurrentPct(Number(e.target.value))}
          aria-label="Current charge percentage"
          className="w-full mt-1 accent-blue-500"
        />
      </div>

      {summary && (
        <div data-testid="cost-output" className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CostBlock prefix="to80" label="To charge to 80%" data={summary.to80} />
          <CostBlock prefix="to100" label="To charge to 100%" data={summary.to100} />
        </div>
      )}
    </div>
  );
}
