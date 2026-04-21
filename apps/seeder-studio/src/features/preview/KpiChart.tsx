import { useMemo, useRef, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import { formatNum } from "@/lib/format";
import type { SimulationAnomaly } from "@/types/simulation";
import { AnomalyChartOverlay } from "@/features/anomalies/AnomalyChartOverlay";

export interface KpiBand {
  start: number;
  end: number;
  color: string;
  alpha?: number;
}

// Must match the LineChart margin and XAxis height below.
const CM = { top: 4, right: 4, left: 4, bottom: 4 } as const;
const X_AXIS_H = 20;

interface Props {
  title: string;
  values: (number | null)[];
  headline?: string;
  color?: string;
  bands?: KpiBand[];
  anomalies?: SimulationAnomaly[];
  windowDays?: number;
  onAnomalyChange?: (index: number, next: SimulationAnomaly) => void;
  onAnomalySelect?: (index: number, x: number, y: number) => void;
  startDate?: Date;
  endDate?: Date;
  valueSuffix?: string;
  className?: string;
  chartHeight?: string;
  formula?: string;
}

const fmt = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    d,
  );

function dateFor(
  idx: number,
  startDate?: Date,
  endDate?: Date,
  total?: number,
) {
  if (!startDate || !endDate || !total || total < 2) return "";
  const rel = idx / (total - 1);
  const ms =
    startDate.getTime() + rel * (endDate.getTime() - startDate.getTime());
  return fmt(new Date(ms));
}

export function KpiChart({
  title,
  values,
  headline,
  color = "#2563eb",
  bands,
  anomalies,
  windowDays,
  onAnomalyChange,
  onAnomalySelect,
  startDate,
  endDate,
  valueSuffix = "",
  className = "",
  chartHeight = "h-32",
  formula = "",
}: Props) {
  const data = useMemo(
    () => values.map((v, i) => ({ idx: i, value: v })),
    [values],
  );

  const ticks = useMemo(() => {
    if (values.length === 0) return [];
    return [0, Math.floor((values.length - 1) / 2), values.length - 1];
  }, [values.length]);

  // Track chart container pixel size for the overlay.
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
    !!onAnomalyChange &&
    containerSize.w > 0 &&
    containerSize.h > 0;

  const overlayOffset = {
    left: CM.left,
    top: CM.top,
    width: containerSize.w - CM.left - CM.right,
    height: containerSize.h - CM.top - CM.bottom - X_AXIS_H,
  };

  return (
    <div
      className={`rounded-lg border bg-card p-3 flex flex-col gap-2 ${className}`}
    >
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold">{title}</span>
        </div>
        {headline && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {headline}
          </span>
        )}
      </div>

      {/* position:relative wrapper so the overlay can be positioned absolutely */}
      <div ref={containerRef} className={`${chartHeight} w-full relative`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CM} syncId="preview">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              opacity={0.08}
              vertical={false}
            />
            {bands?.map((b) => (
              <ReferenceArea
                key={`${b.start}-${b.end}-${b.color}`}
                x1={b.start}
                x2={b.end}
                fill={b.color}
                fillOpacity={b.alpha ?? 0.18}
                stroke="none"
                data-testid="kpi-band"
              />
            ))}
            <XAxis
              dataKey="idx"
              type="number"
              domain={[0, Math.max(0, values.length - 1)]}
              ticks={ticks}
              tickFormatter={(idx: number) =>
                dateFor(idx, startDate, endDate, values.length)
              }
              stroke="currentColor"
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
              axisLine={false}
              tickLine={false}
              height={X_AXIS_H}
            />
            <YAxis hide />
            <Tooltip
              cursor={{
                stroke: "currentColor",
                strokeDasharray: "2 2",
                opacity: 0.4,
              }}
              contentStyle={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 6,
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
                border: "1px solid hsl(var(--border))",
              }}
              labelFormatter={(idx: number) =>
                dateFor(idx, startDate, endDate, values.length) || `day ${idx}`
              }
              formatter={(v: number) => [
                `${formatNum(v)}${valueSuffix}`,
                title,
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Direct SVG overlay — sits on top of the chart, not inside Recharts */}
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
            <g style={{ pointerEvents: "all" }}>
              <AnomalyChartOverlay
                offset={overlayOffset}
                anomalies={anomalies!}
                windowDays={windowDays!}
                onAnomalyChange={onAnomalyChange!}
                onSelect={onAnomalySelect}
              />
            </g>
          </svg>
        )}
      </div>
      {formula && (
        <p
          data-testid="kpi-formula"
          className="text-[10px] text-muted-foreground/60 font-mono leading-tight mt-1 truncate"
          title={formula}
        >
          {formula}
        </p>
      )}
    </div>
  );
}
