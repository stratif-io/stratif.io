import { useMemo } from "react";

export interface KpiBand {
  start: number;
  end: number;
  color: string;
  alpha?: number;
}

interface Props {
  title: string;
  values: number[];
  headline?: string;
  color?: string;
  bands?: KpiBand[];
  guideIndex?: number | null;
  startDate?: Date;
  endDate?: Date;
}

const fmt = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    d,
  );

function midDate(a: Date, b: Date): Date {
  return new Date(Math.floor((a.getTime() + b.getTime()) / 2));
}

const W = 300;
const H = 80;

export function KpiChart({
  title,
  values,
  headline,
  color = "currentColor",
  bands,
  guideIndex,
  startDate,
  endDate,
}: Props) {
  const { path, step, max } = useMemo(() => {
    if (values.length === 0) return { path: "", step: 0, max: 0 };
    const mx = Math.max(1, ...values);
    const st = W / Math.max(1, values.length - 1);
    const points = values
      .map((v, i) => `${i * st},${H - (v / mx) * H}`)
      .join(" L ");
    return { path: `M ${points}`, step: st, max: mx };
  }, [values]);

  return (
    <div className="rounded border p-2 flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold">{title}</span>
        {headline && (
          <span className="text-[10px] text-muted-foreground">{headline}</span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-20"
        role="img"
        aria-label={`${title} chart`}
      >
        {bands?.map((b, i) => (
          <rect
            key={i}
            data-testid="kpi-band"
            x={b.start * step}
            y={0}
            width={(b.end - b.start) * step}
            height={H}
            fill={b.color}
            opacity={b.alpha ?? 0.18}
          />
        ))}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          data-testid="kpi-line"
        />
        {guideIndex != null &&
          guideIndex >= 0 &&
          guideIndex < values.length && (
            <line
              data-testid="kpi-guide"
              x1={guideIndex * step}
              x2={guideIndex * step}
              y1={0}
              y2={H}
              stroke="#999"
              strokeDasharray="2,2"
            />
          )}
      </svg>
      {startDate && endDate && (
        <div
          data-testid="kpi-date-ticks"
          className="flex justify-between text-[9px] text-muted-foreground pt-0.5"
        >
          <span>{fmt(startDate)}</span>
          <span>{fmt(midDate(startDate, endDate))}</span>
          <span>{fmt(endDate)}</span>
        </div>
      )}
      <span className="sr-only">max {max}</span>
    </div>
  );
}
