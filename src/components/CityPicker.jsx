export default function CityPicker({ cityId, cities, onChange }) {
  return (
    <select
      data-testid="city-select"
      value={cityId}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 text-sm text-[var(--text-primary)] bg-white border-[1.5px] border-pewter-light rounded-lg appearance-none focus:outline-none focus:border-paprika focus:ring-2 focus:ring-paprika/15 cursor-pointer transition-colors"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236B6B7B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      {cities.map(c => (
        <option key={c.id} value={c.id}>{c.name}, CA</option>
      ))}
    </select>
  );
}
