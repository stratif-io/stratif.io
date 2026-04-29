import { useId, useRef, useState } from "react";
import type { SimEvent } from "@/types/simulation";
import { anomalyTypeColor } from "@/lib/twin";

export interface ChartOffset {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Parse an ISO date string (YYYY-MM-DD) as UTC midnight. */
const parseISO = (s: string) => new Date(s + "T00:00:00Z");

const toISO = (d: Date) => d.toISOString().slice(0, 10);

interface Props {
  offset: ChartOffset;
  anomalies: SimEvent[];
  windowDays: number;
  windowStart?: Date;
  /** Day index of the zoom start; bands subtract this so they align correctly */
  dayOffset?: number;
  onAnomalyChange: (index: number, next: SimEvent) => void;
  onSelect?: (index: number, x: number, y: number) => void;
  readOnly?: boolean;
  /** Look up the chart value (main series) at a given day index (0 = window start) */
  getValueAtDay?: (day: number) => number | null;
  valueSuffix?: string;
}

const HANDLE_W = 8;
const LABEL_FONT = 9;

export function AnomalyChartOverlay({
  offset,
  anomalies,
  windowDays,
  windowStart,
  dayOffset = 0,
  onAnomalyChange,
  onSelect,
  readOnly = false,
  getValueAtDay,
  valueSuffix = "",
}: Props) {
  const pxPerDay = offset.width / Math.max(1, windowDays);
  const uid = useId();
  const clipId = `anomaly-clip-${uid.replace(/:/g, "")}`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={offset.left}
            y={offset.top}
            width={offset.width}
            height={offset.height}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {anomalies.map((a, i) => (
          <ChartBand
            key={i}
            index={i}
            anomaly={a}
            offset={offset}
            pxPerDay={pxPerDay}
            windowDays={windowDays}
            windowStart={windowStart}
            dayOffset={dayOffset}
            onChange={(next) => onAnomalyChange(i, next)}
            onSelect={onSelect}
            readOnly={readOnly}
            getValueAtDay={getValueAtDay}
            valueSuffix={valueSuffix}
          />
        ))}
      </g>
    </g>
  );
}

interface BandProps {
  index: number;
  anomaly: SimEvent;
  offset: ChartOffset;
  pxPerDay: number;
  windowDays: number;
  windowStart?: Date;
  dayOffset?: number;
  onChange: (next: SimEvent) => void;
  onSelect?: (index: number, x: number, y: number) => void;
  readOnly?: boolean;
  getValueAtDay?: (day: number) => number | null;
  valueSuffix?: string;
}

type DragMode = "body" | "left" | "right" | null;

const CLICK_THRESHOLD = 4;

function ChartBand({
  index,
  anomaly,
  offset,
  pxPerDay,
  windowDays,
  windowStart,
  dayOffset = 0,
  onChange,
  onSelect,
  readOnly = false,
  getValueAtDay,
  valueSuffix = "",
}: BandProps) {
  const ws = windowStart ?? new Date();
  const startDay =
    Math.max(
      0,
      Math.round(
        (parseISO(anomaly.start_date).getTime() - ws.getTime()) / 86_400_000,
      ),
    ) - dayOffset;
  const endDay =
    Math.max(
      0,
      Math.round(
        (parseISO(anomaly.end_date).getTime() - ws.getTime()) / 86_400_000,
      ),
    ) - dayOffset;
  const durationDays = Math.max(1, endDay - startDay);

  const x = offset.left + startDay * pxPerDay;
  const w = Math.max(HANDLE_W * 2 + 2, durationDays * pxPerDay);
  const y = offset.top;
  const h = offset.height;
  const hw = Math.min(HANDLE_W, w / 3);

  const color = anomalyTypeColor(anomaly.type);

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startClientX: number;
    startClientY: number;
    origStart: number;
    origDuration: number;
    hasDragged: boolean;
  }>({
    mode: null,
    startX: 0,
    startClientX: 0,
    startClientY: 0,
    origStart: startDay,
    origDuration: durationDays,
    hasDragged: false,
  });
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [hovered, setHovered] = useState(false);
  const [hoverX, setHoverX] = useState<number>(x + w / 2);

  const begin = (mode: DragMode) => (e: React.PointerEvent) => {
    e.stopPropagation();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origStart: startDay,
      origDuration: durationDays,
      hasDragged: false,
    };
    setDragMode(mode);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    if (!dragRef.current.mode) return;
    const dx = Math.abs(e.clientX - dragRef.current.startClientX);
    if (dx > CLICK_THRESHOLD) dragRef.current.hasDragged = true;
    if (!dragRef.current.hasDragged) return;
    const deltaDays = Math.round(
      (e.clientX - dragRef.current.startX) / pxPerDay,
    );
    const { mode, origStart, origDuration } = dragRef.current;
    if (mode === "body") {
      const s = Math.max(
        0,
        Math.min(windowDays - origDuration, origStart + deltaDays),
      );
      const newStart = new Date(ws.getTime() + (s + dayOffset) * 86_400_000);
      const newEnd = new Date(newStart.getTime() + origDuration * 86_400_000);
      onChange({
        ...anomaly,
        start_date: toISO(newStart),
        end_date: toISO(newEnd),
      });
    } else if (mode === "right") {
      const d = Math.max(1, origDuration + deltaDays);
      const start = parseISO(anomaly.start_date);
      const newEnd = new Date(start.getTime() + d * 86_400_000);
      onChange({ ...anomaly, end_date: toISO(newEnd) });
    } else if (mode === "left") {
      const s = Math.max(0, origStart + deltaDays);
      const d = Math.max(1, origDuration - deltaDays);
      const newStart = new Date(ws.getTime() + (s + dayOffset) * 86_400_000);
      const newEnd = new Date(newStart.getTime() + d * 86_400_000);
      onChange({
        ...anomaly,
        start_date: toISO(newStart),
        end_date: toISO(newEnd),
      });
    }
  };

  const end = (_e: React.PointerEvent) => {
    const { mode, hasDragged, startClientX, startClientY } = dragRef.current;
    dragRef.current.mode = null;
    setDragMode(null);
    if (mode === "body" && !hasDragged) {
      onSelect?.(index, startClientX, startClientY);
    }
  };

  const bodyCursor = readOnly
    ? "default"
    : dragMode === "body"
      ? "grabbing"
      : dragMode
        ? "ew-resize"
        : "grab";

  const cancel = () => {
    dragRef.current.mode = null;
    setDragMode(null);
  };

  // Compute chart value at the hovered day
  const hoverDay = getValueAtDay
    ? Math.round((hoverX - offset.left) / pxPerDay) + dayOffset
    : null;
  const chartValue =
    getValueAtDay && hoverDay !== null ? getValueAtDay(hoverDay) : null;

  const updateHoverX = (e: React.PointerEvent) => {
    const svgEl = (e.currentTarget as SVGElement).ownerSVGElement;
    if (svgEl) {
      const rect = svgEl.getBoundingClientRect();
      setHoverX(e.clientX - rect.left);
    }
  };

  return (
    <g
      onPointerMove={(e) => {
        updateHoverX(e);
        move(e);
      }}
      onPointerUp={end}
      onPointerCancel={cancel}
    >
      {/* Full-height semi-transparent band (body — drag to slide) */}
      <rect
        data-testid="chart-pill-body"
        role={readOnly ? undefined : "button"}
        aria-label={anomaly.name}
        tabIndex={readOnly ? undefined : 0}
        x={x}
        y={y}
        width={w}
        height={h}
        style={{ fill: color, fillOpacity: 0.12, cursor: bodyCursor }}
        onPointerDown={readOnly ? undefined : begin("body")}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      />

      {/* Left edge handle — invisible but interactive */}
      {!readOnly && (
        <rect
          data-testid="chart-pill-handle-left"
          x={x}
          y={y}
          width={hw}
          height={h}
          style={{ fill: color, fillOpacity: 0.0, cursor: "ew-resize" }}
          onPointerDown={begin("left")}
          onPointerEnter={() => setHovered(false)}
        />
      )}

      {/* Right edge handle — invisible but interactive */}
      {!readOnly && (
        <rect
          data-testid="chart-pill-handle-right"
          x={x + w - hw}
          y={y}
          width={hw}
          height={h}
          style={{ fill: color, fillOpacity: 0.0, cursor: "ew-resize" }}
          onPointerDown={begin("right")}
          onPointerEnter={() => setHovered(false)}
        />
      )}

      {/* Left edge accent line */}
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={y + h}
        stroke={color}
        strokeOpacity={0.3}
        strokeWidth={1}
        pointerEvents="none"
      />

      {/* Right edge accent line */}
      <line
        x1={x + w}
        y1={y}
        x2={x + w}
        y2={y + h}
        stroke={color}
        strokeOpacity={0.3}
        strokeWidth={1}
        pointerEvents="none"
      />

      {/* Label near top */}
      {w > 24 && (
        <text
          x={x + w / 2}
          y={y + LABEL_FONT + 2}
          fontSize={LABEL_FONT}
          textAnchor="middle"
          style={{ fill: color, fillOpacity: 0.7 }}
          pointerEvents="none"
        >
          {anomaly.name}
        </text>
      )}

      {/* Hover tooltip */}
      {hovered && !dragMode && (
        <AnomalyTooltip
          anomaly={anomaly}
          startDay={startDay}
          durationDays={durationDays}
          windowStart={windowStart}
          color={color}
          x={hoverX}
          bandLeft={x}
          bandRight={x + w}
          y={y}
          height={h}
          chartValue={chartValue}
          valueSuffix={valueSuffix}
        />
      )}
    </g>
  );
}

const TOOLTIP_PAD = 5;
const TOOLTIP_LINE_H = 12;
const TOOLTIP_FONT = 9;

function formatDateRange(
  startDay: number,
  durationDays: number,
  windowStart?: Date,
): string | null {
  if (!windowStart) return null;
  const start = new Date(windowStart.getTime() + startDay * 86_400_000);
  const end = new Date(start.getTime() + (durationDays - 1) * 86_400_000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return durationDays <= 1 ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

function AnomalyTooltip({
  anomaly,
  startDay,
  durationDays,
  windowStart,
  color,
  x,
  bandLeft,
  bandRight,
  y,
  height,
  chartValue,
  valueSuffix,
}: {
  anomaly: SimEvent;
  startDay: number;
  durationDays: number;
  windowStart?: Date;
  color: string;
  x: number;
  bandLeft: number;
  bandRight: number;
  y: number;
  height: number;
  chartValue: number | null;
  valueSuffix: string;
}) {
  const dateRange = formatDateRange(startDay, durationDays, windowStart);
  const lines = [
    anomaly.name,
    ...(dateRange ? [dateRange] : []),
    anomaly.type.replace(/_/g, " "),
  ];
  if (anomaly.effect) {
    for (const [k, v] of Object.entries(anomaly.effect)) {
      if (v !== undefined && v !== null)
        lines.push(`${k.replace(/_/g, " ")}: ×${v}`);
    }
  }

  const tw =
    Math.max(...lines.map((l) => l?.length ?? 0)) * 5.5 + TOOLTIP_PAD * 2;
  const th = lines.length * TOOLTIP_LINE_H + TOOLTIP_PAD * 2;

  // Value bubble
  const showValue = chartValue !== null;
  const valText = showValue
    ? `${Math.round(chartValue!).toLocaleString()}${valueSuffix}`
    : null;
  const valW = valText ? valText.length * 6 + TOOLTIP_PAD * 2 : 0;
  const valH = TOOLTIP_LINE_H + TOOLTIP_PAD;
  const valX = x;
  const valY = y + 2;

  // Center anomaly tooltip on cursor; push to lower half when value bubble is visible
  const bandMid = (bandLeft + bandRight) / 2;
  const tooltipX = x > bandMid ? x - tw / 2 - 4 : x + tw / 2 + 4;
  const tooltipClamped = Math.max(
    bandLeft + tw / 2,
    Math.min(bandRight - tw / 2, tooltipX),
  );
  const tyBase = showValue
    ? y + height * 0.6 - th / 2
    : y + height / 2 - th / 2;
  const ty = Math.max(
    y + (showValue ? valH + 4 : 0),
    Math.min(y + height - th, tyBase),
  );

  return (
    <g pointerEvents="none">
      {/* Main anomaly tooltip */}
      <rect
        x={tooltipClamped - tw / 2}
        y={ty}
        width={tw}
        height={th}
        rx={3}
        fill="hsl(var(--popover))"
        stroke={color}
        strokeOpacity={0.4}
        strokeWidth={1}
        opacity={0.95}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={tooltipClamped}
          y={ty + TOOLTIP_PAD + (i + 1) * TOOLTIP_LINE_H - 2}
          fontSize={TOOLTIP_FONT}
          textAnchor="middle"
          fill="hsl(var(--popover-foreground))"
          opacity={i === 0 ? 1 : 0.7}
          fontWeight={i === 0 ? "600" : "400"}
        >
          {line}
        </text>
      ))}

      {/* Chart value bubble above cursor */}
      {showValue && valText && (
        <>
          <rect
            x={valX - valW / 2}
            y={valY}
            width={valW}
            height={valH}
            rx={3}
            fill="hsl(var(--popover))"
            stroke={color}
            strokeOpacity={0.5}
            strokeWidth={1}
            opacity={0.95}
          />
          <text
            x={valX}
            y={valY + valH - TOOLTIP_PAD / 2}
            fontSize={TOOLTIP_FONT}
            textAnchor="middle"
            fill="hsl(var(--popover-foreground))"
            fontWeight="600"
          >
            {valText}
          </text>
          {/* Vertical cursor line from bubble bottom to band bottom */}
          <line
            x1={valX}
            y1={valY + valH + 1}
            x2={valX}
            y2={y + height}
            stroke={color}
            strokeOpacity={0.3}
            strokeWidth={1}
            strokeDasharray="3 2"
          />
        </>
      )}
    </g>
  );
}
