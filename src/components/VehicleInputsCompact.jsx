import vehiclesData from '../data/vehicles.json';

const CUSTOM_ID = 'custom';

export default function VehicleInputsCompact({
  selectedId,
  customKwh,
  batteryKwh,
  onSelectedIdChange,
  onCustomKwhChange,
}) {
  const isCustom = selectedId === CUSTOM_ID;

  return (
    <div className="space-y-2">
      <select
        data-testid="vehicle-select-compact"
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
            {v.make} {v.model}{v.trim ? ` (${v.trim})` : ''} - {v.usableBatteryKwh} kWh
          </option>
        ))}
        <option value={CUSTOM_ID}>Custom battery size...</option>
      </select>
      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="500"
            value={customKwh}
            onChange={e => onCustomKwhChange(e.target.value)}
            placeholder="Battery size"
            className="w-24 px-3 py-2 text-sm bg-surface-container-highest border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-paprika/20"
          />
          <span className="text-xs text-[var(--text-muted)]">kWh</span>
        </div>
      )}
      <p data-testid="battery-display" className="text-[10px] text-[var(--text-muted)]">
        Battery: <span className="font-semibold text-[var(--text-secondary)]">{batteryKwh} kWh</span>
      </p>
    </div>
  );
}
