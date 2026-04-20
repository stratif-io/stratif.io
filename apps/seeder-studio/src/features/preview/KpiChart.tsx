import { useMemo } from "react";

interface Props {
  title: string;
  values: number[];
  headline?: string;
  color?: string;
}

export function KpiChart({
  title,
  values,
  headline,
  color = "currentColor",
}: Props) {
  const { path, max } = useMemo(() => {
    if (values.length === 0) return { path: "", max: 0 };
    const mx = Math.max(1, ...values);
    const w = 300;
    const h = 80;
    const step = w / Math.max(1, values.length - 1);
    const points = values
      .map((v, i) => `${i * step},${h - (v / mx) * h}`)
      .join(" L ");
    return { path: `M ${points}`, max: mx };
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
        viewBox="0 0 300 80"
        preserveAspectRatio="none"
        className="w-full h-20"
        role="img"
        aria-label={`${title} chart`}
      >
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          data-testid="kpi-line"
        />
      </svg>
      <span className="sr-only">max {max}</span>
    </div>
  );
}
