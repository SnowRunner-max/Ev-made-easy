// Props:
//   candidates: string[]        — array of serviceAreaIds, e.g. ['pge-3ce-sb', 'sce-3ce-sb']
//   serviceAreas: object        — the serviceAreas map from serviceAreas.json
//   onSelect: (serviceAreaId) => void

export default function UtilityPicker({ candidates, serviceAreas, onSelect }) {
  return (
    <div className="mt-1 rounded-lg bg-[var(--color-surface-container)] p-3 space-y-2">
      <p className="text-[11px] font-medium text-[var(--text-primary)] leading-snug">
        Multiple service options may apply here. Which one serves your address?
      </p>
      <div className="flex flex-col gap-1.5">
        {candidates.map((id) => {
          const area = serviceAreas[id];
          if (!area) return null;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={[
                'w-full text-left px-3 py-2 rounded-md text-[12px] font-medium',
                'bg-[var(--color-offwhite)] text-[var(--text-primary)]',
                'hover:bg-[var(--color-surface-container-high)] transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-paprika)]/30',
              ].join(' ')}
            >
              {area.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
