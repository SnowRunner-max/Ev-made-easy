const CHARGER_SPEEDS = [
  { kw: 1.4, label: '1.4 kW · Level 1 (120V)' },
  { kw: 3.8, label: '3.8 kW · L2 (240V/16A)' },
  { kw: 7.2, label: '7.2 kW · L2 (240V/30A)' },
  { kw: 7.7, label: '7.7 kW · L2 (240V/32A)' },
  { kw: 9.6, label: '9.6 kW · L2 (240V/40A)' },
  { kw: 11.5, label: '11.5 kW · L2 (240V/48A)' },
  { kw: 19.2, label: '19.2 kW · L2 (240V/80A)' },
];

export default function ChargerSpeedInput({ chargerKw, vehicleMaxKw, onChange, disabled = false }) {
  // Build options: ensure vehicleMaxKw is always included, sorted ascending
  const hasCustomMax = vehicleMaxKw != null && !CHARGER_SPEEDS.some(s => s.kw === vehicleMaxKw);
  const allSpeeds = hasCustomMax
    ? [...CHARGER_SPEEDS, { kw: vehicleMaxKw, label: `${vehicleMaxKw} kW` }].sort((a, b) => a.kw - b.kw)
    : CHARGER_SPEEDS;

  // For known vehicles, cap options at vehicleMaxKw
  const displaySpeeds = vehicleMaxKw != null
    ? allSpeeds.filter(s => s.kw <= vehicleMaxKw)
    : allSpeeds;

  return (
    <select
      data-testid="charger-speed-select"
      value={chargerKw}
      onChange={e => onChange(parseFloat(e.target.value))}
      disabled={disabled}
      className={`w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-surface-container-highest border-none rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-paprika/20 transition-colors font-medium ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236B6B7B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      {displaySpeeds.map(({ kw, label }) => (
        <option key={kw} value={kw}>
          {vehicleMaxKw != null && kw === vehicleMaxKw ? `${label} (max)` : label}
        </option>
      ))}
    </select>
  );
}
