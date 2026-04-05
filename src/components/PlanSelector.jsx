const CATEGORY_ORDER = ['EV Rate', 'Residential TOU', 'Tiered (Non-TOU)'];
const CATEGORY_LABELS = {
  'EV Rate': 'EV Rates',
  'Residential TOU': 'Residential TOU Rates',
  'Tiered (Non-TOU)': 'Tiered (Non-TOU) Rates',
};

export default function PlanSelector({ planId, plans, onChange }) {
  // Group plans by category
  const grouped = {};
  for (const [id, plan] of Object.entries(plans)) {
    const cat = plan.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ id, label: plan.selectorLabel || `${plan.rateDesignation} — ${plan.name}` });
  }

  // Sort categories by defined order, unknowns at end
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => (CATEGORY_ORDER.indexOf(a) === -1 ? 99 : CATEGORY_ORDER.indexOf(a))
           - (CATEGORY_ORDER.indexOf(b) === -1 ? 99 : CATEGORY_ORDER.indexOf(b))
  );

  return (
    <select
      data-testid="plan-select"
      value={planId}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 text-sm text-[var(--text-primary)] bg-white border-[1.5px] border-pewter-light rounded-lg appearance-none focus:outline-none focus:border-paprika focus:ring-2 focus:ring-paprika/15 cursor-pointer transition-colors"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236B6B7B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      {sortedCategories.map(category => (
        <optgroup key={category} label={CATEGORY_LABELS[category] || category}>
          {grouped[category].map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
