import type { AxisDisplay } from "@/features/axes/axisDisplaySpec";

interface Props {
  axis: AxisDisplay;
  currentValue: string;
  onSelect: (value: string) => void;
}

export function AxisPopover({ axis, currentValue, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-1 mb-1">
        {axis.label}
      </p>
      {axis.values.map((v) => (
        <button
          key={v.value}
          onClick={() => onSelect(v.value)}
          className={`flex items-center gap-3 px-2 py-1.5 rounded-md text-left transition-colors w-full ${
            v.value === currentValue
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-foreground"
          }`}
        >
          <svg
            viewBox="0 0 52 28"
            width={40}
            height={16}
            aria-hidden="true"
            className="shrink-0"
          >
            <polyline
              points={v.sparkPoints}
              stroke={
                v.value === currentValue
                  ? "hsl(var(--primary))"
                  : "currentColor"
              }
              strokeWidth={1.5}
              fill="none"
            />
          </svg>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium">{v.label}</span>
            <span className="text-[10px] text-muted-foreground truncate">
              {v.description}
            </span>
          </div>
          {v.value === currentValue && (
            <span className="ml-auto text-primary text-xs shrink-0">✓</span>
          )}
        </button>
      ))}
    </div>
  );
}
