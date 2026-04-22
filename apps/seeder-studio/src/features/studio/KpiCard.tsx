import { useMemo } from "react";
import { LineChart, Line, ReferenceArea, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/cn";

export interface Band {
  start: number;
  end: number;
  color: string;
  index: number;
}

interface Props {
  title: string;
  values: (number | null)[];
  headline: string;
  color: string;
  expanded: boolean;
  onExpand: () => void;
  bands?: Band[];
  onBandClick?: (index: number, x: number, y: number) => void;
  valueSuffix?: string;
  className?: string;
}

export function KpiCard({
  title,
  values,
  headline,
  color,
  expanded,
  onExpand,
  bands,
  onBandClick,
  valueSuffix: _valueSuffix,
  className,
}: Props) {
  const data = useMemo(
    () => values.map((v, i) => ({ i, v: v === null ? undefined : v })),
    [values],
  );

  return (
    <button
      aria-label={title}
      aria-expanded={expanded}
      onClick={onExpand}
      className={cn(
        "flex flex-col gap-1 p-3 rounded-lg border bg-card text-left cursor-pointer transition-colors w-full",
        expanded
          ? "border-primary ring-1 ring-primary/30"
          : "border-border hover:border-muted-foreground/40",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <span aria-hidden="true" className="text-[10px] text-muted-foreground">
          {expanded ? "▲" : "▼"}
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground font-mono">
        {headline}
      </span>
      <div className="h-16 w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
          >
            {bands?.map((b) => (
              <ReferenceArea
                key={`${b.start}-${b.end}`}
                x1={b.start}
                x2={b.end}
                dataKey="i"
                fill={b.color}
                fillOpacity={0.25}
                stroke={b.color}
                strokeOpacity={0.5}
                strokeWidth={1}
                onClick={
                  onBandClick
                    ? (_, e) => {
                        e?.stopPropagation();
                        const rect = (
                          e?.currentTarget as HTMLElement | undefined
                        )
                          ?.closest("svg")
                          ?.getBoundingClientRect();
                        onBandClick(
                          b.index,
                          (e as MouseEvent).clientX,
                          rect ? rect.top : (e as MouseEvent).clientY,
                        );
                      }
                    : undefined
                }
                style={onBandClick ? { cursor: "pointer" } : undefined}
              />
            ))}
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
}
