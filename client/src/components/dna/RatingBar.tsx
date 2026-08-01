interface RatingBarProps {
  label: string;
  value: number;
  delay?: number;
  /** Show as a tendency (frequency) rather than an ability rating */
  tendency?: boolean;
}

function barColor(value: number) {
  if (value >= 85) return "#7DE2FC";
  if (value >= 75) return "#22C55E";
  if (value >= 60) return "#FFC53D";
  if (value >= 45) return "#FF7A1A";
  return "#EF4444";
}

export default function RatingBar({ label, value, delay = 0, tendency = false }: RatingBarProps) {
  const color = barColor(value);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-[92px] shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-[7px] rounded-full bg-white/[0.07] overflow-hidden relative">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: tendency
              ? `linear-gradient(90deg, ${color}55, ${color})`
              : `linear-gradient(90deg, ${color}, ${color})`,
            boxShadow: `0 0 8px ${color}66`,
            animation: `barGrow 620ms cubic-bezier(0.23,1,0.32,1) ${delay}ms both`,
            transformOrigin: "left center",
          }}
        />
      </div>
      <span
        className="text-[11px] font-black tabular-nums w-[22px] text-right shrink-0"
        style={{ color }}
      >
        {value}
      </span>
      <style>{`
        @keyframes barGrow {
          from { transform: scaleX(0); opacity: 0.4; }
          to { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

