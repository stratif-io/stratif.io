import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  CartesianGrid,
  Customized,
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

interface Props {
  title: string;
  values: (number | null)[];
  headline?: string;
  color?: string;
  bands?: KpiBand[];
  anomalies?: SimulationAnomaly[];
  windowDays?: number;
  onAnomalyChange?: (index: number, next: SimulationAnomaly) => void;
  startDate?: Date;
  endDate?: Date;
  valueSuffix?: string;
  className?: string;
  chartHeight?: string;
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
  startDate,
  endDate,
  valueSuffix = "",
  className = "",
  chartHeight = "h-32",
}: Props) {
  const data = useMemo(
    () => values.map((v, i) => ({ idx: i, value: v })),
    [values],
  );

  const ticks = useMemo(() => {
    if (values.length === 0) return [];
    return [0, Math.floor((values.length - 1) / 2), values.length - 1];
  }, [values.length]);

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
      <div className={`${chartHeight} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
            syncId="preview"
          >
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
              height={20}
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
            {anomalies &&
              anomalies.length > 0 &&
              windowDays &&
              onAnomalyChange && (
                <Customized
                  component={(props: Record<string, unknown>) =>
                    props.offset ? (
                      <AnomalyChartOverlay
                        offset={
                          props.offset as {
                            left: number;
                            top: number;
                            width: number;
                            height: number;
                          }
                        }
                        anomalies={anomalies}
                        windowDays={windowDays}
                        onAnomalyChange={onAnomalyChange}
                      />
                    ) : null
                  }
                />
              )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
