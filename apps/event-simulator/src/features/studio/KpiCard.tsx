import { useMemo, useRef, useState, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { CardLoadingBar } from "@stratif-io/design-system";
import { cn } from "@/lib/cn";
import { formatNum } from "@/lib/format";
import type { SimulationAnomaly } from "@/types/simulation";
import { AnomalyChartOverlay } from "@/features/anomalies/AnomalyChartOverlay";

export interface Band {
  start: number;
  end: number;
  color: string;
  index: number;
}

const CM = { top: 2, right: 2, left: 2, bottom: 2 } as const;

interface Props {
  title: string;
  values: (number | null)[];
  headline: string;
  color: string;
  expanded: boolean;
  onExpand: () => void;
  anomalies?: SimulationAnomaly[];
  windowDays?: number;
  onAnomalyChange?: (index: number, next: SimulationAnomaly) => void;
  onAnomalySelect?: (index: number, x: number, y: number) => void;
  valueSuffix?: string;
  className?: string;
  isLoading?: boolean;
  isPrimary?: boolean;
}

export function KpiCard({
  title,
  values,
  headline,
  color,
  expanded,
  onExpand,
  anomalies,
  windowDays,
  onAnomalyChange,
  onAnomalySelect,
  valueSuffix = "",
  className,
  isLoading = false,
  isPrimary = false,
}: Props) {
  const data = useMemo(
    () => values.map((v, i) => ({ i, v: v === null ? undefined : v })),
    [values],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showOverlay =
    !!anomalies?.length &&
    !!windowDays &&
    containerSize.w > 0 &&
    containerSize.h > 0;

  const overlayOffset = {
    left: CM.left,
    top: CM.top,
    width: containerSize.w - CM.left - CM.right,
    height: containerSize.h - CM.top - CM.bottom,
  };

  return (
    <button
      aria-label={title}
      aria-expanded={expanded}
      onClick={onExpand}
      className={cn(
        "flex flex-col gap-1 p-3 rounded-lg border bg-card text-left cursor-pointer transition-colors w-full overflow-hidden relative",
        expanded
          ? "border-primary ring-1 ring-primary/30"
          : isPrimary
            ? "border-primary/30 hover:border-primary/50"
            : "border-border hover:border-muted-foreground/40",
        className,
      )}
    >
      <CardLoadingBar loading={isLoading} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <span aria-hidden="true" className="text-[10px] text-muted-foreground">
          {expanded ? "▲" : "▼"}
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground font-mono">
        {headline}
      </span>
      <div ref={containerRef} className="h-16 w-full mt-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CM}>
            <Tooltip
              cursor={{
                stroke: "currentColor",
                strokeDasharray: "2 2",
                opacity: 0.4,
              }}
              contentStyle={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 5,
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
                border: "1px solid hsl(var(--border))",
              }}
              formatter={(v: number) => [
                `${formatNum(v)}${valueSuffix}`,
                title,
              ]}
              labelFormatter={() => ""}
            />
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

        {showOverlay && (
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none",
            }}
            width={containerSize.w}
            height={containerSize.h}
          >
            <g style={{ pointerEvents: onAnomalyChange ? "all" : "none" }}>
              <AnomalyChartOverlay
                offset={overlayOffset}
                anomalies={anomalies!}
                windowDays={windowDays!}
                onAnomalyChange={onAnomalyChange ?? (() => {})}
                onSelect={onAnomalySelect}
                readOnly={!onAnomalyChange}
              />
            </g>
          </svg>
        )}
      </div>
    </button>
  );
}
