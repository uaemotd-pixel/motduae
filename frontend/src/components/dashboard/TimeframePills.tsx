"use client";

type Timeframe = "week" | "month" | "year";

type TimeframePillsProps = {
  value: Timeframe;
  onChange: (v: Timeframe) => void;
  labels?: { week: string; month: string; year: string };
};

export default function TimeframePills({
  value,
  onChange,
  labels = { week: "Week", month: "Month", year: "Year" },
}: TimeframePillsProps) {
  const options: Timeframe[] = ["week", "month", "year"];

  return (
    <div className="inline-flex rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition [font-family:var(--font-ui)] uppercase tracking-wider ${
            value === opt
              ? "bg-[var(--dash-charcoal)] text-[var(--dash-gold)] shadow-sm"
              : "text-[var(--dash-muted)] hover:text-[var(--dash-ink)]"
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}
