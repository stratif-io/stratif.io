import { useMemo, useRef, useState, useEffect, useCallback } from "react";
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
import {
  CardLoadingBar,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@stratif-io/design-system";
import { formatNum } from "@/lib/format";
import type { SimulationAnomaly } from "@/types/simulation";
import { AnomalyChartOverlay } from "@/features/anomalies/AnomalyChartOverlay";
import { MathFormula } from "@/lib/math/MathFormula";

export interface KpiBand {
  start: number;
  end: number;
  color: string;
  alpha?: number;
}

// Must match the LineChart margin and XAxis height below.
const CM = { top: 4, right: 4, left: 4, bottom: 4 } as const;
const X_AXIS_H = 20;
const Y_AXIS_W = 48; // matches width prop on YAxis when ghost lines are shown

export interface GhostLine {
  key: string;
  label: string;
  values: (number | null)[];
  color: string;
}

interface Props {
  title: string;
  values: (number | null)[];
  headline?: string;
  color?: string;
  bands?: KpiBand[];
  ghostLines?: GhostLine[];
  anomalies?: SimulationAnomaly[];
  windowDays?: number;
  onAnomalyChange?: (index: number, next: SimulationAnomaly) => void;
  onAnomalySelect?: (index: number, x: number, y: number) => void;
  startDate?: Date;
  endDate?: Date;
  valueSuffix?: string;
  className?: string;
  chartHeight?: string;
  formulaLatex?: string;
  formulaWhere?: string;
  formulaExplanation?: string;
  /** Controlled focused line key — when provided, overrides internal state */
  focusedLineKey?: string | null;
  onFocusedLineKeyChange?: (key: string | null) => void;
  isLoading?: boolean;
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
  ghostLines,
  anomalies,
  windowDays,
  onAnomalyChange,
  onAnomalySelect,
  startDate,
  endDate,
  valueSuffix = "",
  className = "",
  chartHeight = "h-32",
  formulaLatex = "",
  formulaWhere = "",
  formulaExplanation = "",
  focusedLineKey,
  onFocusedLineKeyChange,
  isLoading = false,
}: Props) {
  const [internalFocusedKey, setInternalFocusedKey] = useState<string | null>(
    null,
  );
  const focusedKey =
    focusedLineKey !== undefined ? focusedLineKey : internalFocusedKey;
  const toggleFocus = useCallback(
    (key: string) => {
      if (onFocusedLineKeyChange) {
        onFocusedLineKeyChange(focusedKey === key ? null : key);
      } else {
        setInternalFocusedKey((prev) => (prev === key ? null : key));
      }
    },
    [focusedKey, onFocusedLineKeyChange],
  );

  const mainMax = useMemo(
    () => Math.max(...values.filter((v): v is number => v !== null), 1),
    [values],
  );

  // Per-ghost max, used for normalization and Y-axis remapping
  const ghostMaxMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of ghostLines ?? []) {
      m[g.key] = Math.max(
        ...g.values.filter((x): x is number => x !== null),
        1,
      );
    }
    return m;
  }, [ghostLines]);

  const data = useMemo(() => {
    return values.map((v, i) => {
      const row: Record<string, number | undefined> = {
        idx: i,
        value: v ?? undefined,
      };
      for (const g of ghostLines ?? []) {
        const gMax = ghostMaxMap[g.key] ?? 1;
        const raw = g.values[i];
        const normalized =
          raw !== null && raw !== undefined
            ? (raw / gMax) * mainMax
            : undefined;
        row[g.key] = normalized;
        row[`${g.key}_raw`] =
          raw !== null && raw !== undefined ? raw : undefined;
      }
      return row;
    });
  }, [values, ghostLines, mainMax, ghostMaxMap]);

  // Y-axis tick formatter: when a ghost is focused, remap normalized→raw scale
  const yTickFormatter = useMemo(() => {
    if (!focusedKey || focusedKey === "__main__" || !ghostMaxMap[focusedKey]) {
      return (v: number) => formatNum(Math.round(v));
    }
    const gMax = ghostMaxMap[focusedKey];
    return (v: number) => formatNum(Math.round((v / mainMax) * gMax));
  }, [focusedKey, ghostMaxMap, mainMax]);

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
    containerSize.w > 0 &&
    containerSize.h > 0;

  const hasYAxis = !!ghostLines && ghostLines.length > 0;
  const yAxisW = hasYAxis ? Y_AXIS_W : 0;
  const overlayOffset = {
    left: CM.left + yAxisW,
    top: CM.top,
    width: containerSize.w - CM.left - CM.right - yAxisW,
    height: containerSize.h - CM.top - CM.bottom - X_AXIS_H,
  };

  return (
    <div
      className={`rounded-lg border bg-card p-3 flex flex-col gap-2 overflow-hidden relative ${className}`}
    >
      <CardLoadingBar loading={isLoading} />
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold">{title}</span>
          {formulaExplanation && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  aria-label="info"
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors leading-none"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
                    <path
                      d="M6 5.5v3M6 3.5v.5"
                      stroke="currentColor"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 p-4 flex flex-col gap-3"
                side="top"
                align="start"
              >
                <p className="text-xs font-semibold">{title}</p>
                {formulaLatex && (
                  <MathFormula
                    latex={formulaLatex}
                    display
                    className="overflow-x-auto"
                  />
                )}
                {formulaWhere && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {formulaWhere}
                  </p>
                )}
                {formulaExplanation && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {formulaExplanation}
                  </p>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
        {headline && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {headline}
          </span>
        )}
      </div>

      {/* position:relative wrapper so the overlay can be positioned absolutely */}
      <div
        ref={containerRef}
        className={`${chartHeight} w-full relative transition-opacity duration-300 ${isLoading ? "opacity-40" : ""}`}
      >
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
            {ghostLines && ghostLines.length > 0 ? (
              <YAxis
                domain={[0, mainMax]}
                tickFormatter={yTickFormatter}
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickCount={4}
              />
            ) : (
              <YAxis hide />
            )}
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
              formatter={(v: number, _name: string, item) => {
                const dk = String(item.dataKey ?? "");
                const ghost = ghostLines?.find((g) => g.key === dk);
                if (ghost) {
                  const raw = (
                    item.payload as Record<string, number | undefined>
                  )[`${dk}_raw`];
                  return [`${formatNum(raw ?? v)}`, ghost.label];
                }
                return [`${formatNum(v)}${valueSuffix}`, title];
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={
                focusedKey !== null && focusedKey !== "__main__" ? 1 : 1.5
              }
              strokeOpacity={
                focusedKey !== null && focusedKey !== "__main__" ? 0.25 : 0.4
              }
              dot={false}
              isAnimationActive={false}
            />
            {ghostLines?.map((g) => {
              const isFocused = focusedKey === g.key;
              const isDimmed = focusedKey !== null && !isFocused;
              return (
                <Line
                  key={g.key}
                  type="monotone"
                  dataKey={g.key}
                  stroke={g.color}
                  strokeWidth={isFocused ? 2 : 1.5}
                  strokeDasharray={isFocused ? "none" : "6 3"}
                  strokeOpacity={isDimmed ? 0.12 : isFocused ? 1 : 0.75}
                  dot={false}
                  isAnimationActive={false}
                  legendType="none"
                  name={g.label}
                />
              );
            })}
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

      {ghostLines && ghostLines.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={() => toggleFocus("__main__")}
            className={`flex items-center gap-1 transition-opacity ${focusedKey !== null && focusedKey !== "__main__" ? "opacity-30" : "opacity-100"}`}
          >
            <span
              className="inline-block w-3 h-0.5 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-muted-foreground">
              {title || "value"}
            </span>
          </button>
          {ghostLines.map((g) => {
            const isFocused = focusedKey === g.key;
            const isDimmed =
              focusedKey !== null && !isFocused && focusedKey !== "__main__";
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => toggleFocus(g.key)}
                className={`flex items-center gap-1 transition-opacity ${isDimmed ? "opacity-30" : "opacity-100"}`}
              >
                <svg width="16" height="5" aria-hidden>
                  <line
                    x1="0"
                    y1="2.5"
                    x2="16"
                    y2="2.5"
                    stroke={g.color}
                    strokeWidth={isFocused ? "2" : "1.5"}
                    strokeDasharray={isFocused ? "none" : "4 2"}
                    strokeOpacity="0.9"
                  />
                </svg>
                <span
                  className={`text-[10px] ${isFocused ? "text-foreground font-medium" : "text-muted-foreground/70"}`}
                >
                  {g.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {formulaLatex && (
        <div className="flex flex-col gap-0.5 mt-1">
          <MathFormula
            latex={formulaLatex}
            className="text-[11px] text-muted-foreground/70 overflow-x-auto"
          />
          {formulaWhere && (
            <p
              data-testid="kpi-formula-where"
              className="text-[10px] text-muted-foreground/50 font-mono leading-tight"
            >
              {formulaWhere}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
