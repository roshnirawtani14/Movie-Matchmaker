interface OptionPillsProps<T extends string> {
  options: T[];
  selected: T[];
  onToggle: (value: T) => void;
  columns?: number;
}

export function OptionPills<T extends string>({ options, selected, onToggle, columns = 3 }: OptionPillsProps<T>) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-95 ${
              active
                ? "border-glow-400 bg-glow-500/20 text-white shadow-[0_0_0_1px_rgba(124,92,255,0.5)]"
                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
