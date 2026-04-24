import { useRef, useState } from "react";
import type { SimulationAnomaly } from "@/types/simulation";
import { anomalyTypeColor } from "@/lib/twin";
import { parseDays } from "@/lib/twin/utils";

export interface ChartOffset {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  offset: ChartOffset;
  anomalies: SimulationAnomaly[];
  windowDays: number;
  onAnomalyChange: (index: number, next: SimulationAnomaly) => void;
  onSelect?: (index: number, x: number, y: number) => void;
}

const HANDLE_W = 10;
const LABEL_FONT = 9;

export function AnomalyChartOverlay({
  offset,
  anomalies,
  windowDays,
  onAnomalyChange,
  onSelect,
}: Props) {
  const pxPerDay = offset.width / Math.max(1, windowDays);
  return (
    <g>
      {anomalies.map((a, i) => (
        <ChartBand
          key={i}
          index={i}
          anomaly={a}
          offset={offset}
          pxPerDay={pxPerDay}
          windowDays={windowDays}
          onChange={(next) => onAnomalyChange(i, next)}
          onSelect={onSelect}
        />
      ))}
    </g>
  );
}

interface BandProps {
  index: number;
  anomaly: SimulationAnomaly;
  offset: ChartOffset;
  pxPerDay: number;
  windowDays: number;
  onChange: (next: SimulationAnomaly) => void;
  onSelect?: (index: number, x: number, y: number) => void;
}

type DragMode = "body" | "left" | "right" | null;

const CLICK_THRESHOLD = 4;

function ChartBand({
  index,
  anomaly,
  offset,
  pxPerDay,
  windowDays,
  onChange,
  onSelect,
}: BandProps) {
  const parsedStart = parseDays(anomaly.start ?? "0d") ?? 0;
  const startDay = Math.max(
    0,
    parsedStart < 0 ? windowDays + parsedStart : parsedStart,
  );
  const durationDays = Math.max(1, parseDays(anomaly.duration ?? "1d") ?? 1);

  const x = offset.left + startDay * pxPerDay;
  const w = Math.max(HANDLE_W * 2 + 2, durationDays * pxPerDay);
  const y = offset.top;
  const h = offset.height;
  const hw = Math.min(HANDLE_W, w / 3); // clamp handle width when band is narrow

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
      onChange({ ...anomaly, start: `${s}d` });
    } else if (mode === "right") {
      const d = Math.max(1, origDuration + deltaDays);
      onChange({ ...anomaly, duration: `${d}d` });
    } else if (mode === "left") {
      const s = Math.max(0, origStart + deltaDays);
      const d = Math.max(1, origDuration - deltaDays);
      onChange({ ...anomaly, start: `${s}d`, duration: `${d}d` });
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

  const bodyCursor =
    dragMode === "body" ? "grabbing" : dragMode ? "ew-resize" : "grab";

  const cancel = () => {
    dragRef.current.mode = null;
    setDragMode(null);
  };

  return (
    <g onPointerMove={move} onPointerUp={end} onPointerCancel={cancel}>
      {/* Full-height semi-transparent band (body — drag to slide) */}
      <rect
        data-testid="chart-pill-body"
        role="button"
        aria-label={anomaly.name}
        tabIndex={0}
        x={x}
        y={y}
        width={w}
        height={h}
        style={{ fill: color, fillOpacity: 0.13, cursor: bodyCursor }}
        onPointerDown={begin("body")}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      />

      {/* Left edge handle */}
      <rect
        data-testid="chart-pill-handle-left"
        x={x}
        y={y}
        width={hw}
        height={h}
        style={{ fill: color, fillOpacity: 0.45, cursor: "ew-resize" }}
        onPointerDown={begin("left")}
      />

      {/* Right edge handle */}
      <rect
        data-testid="chart-pill-handle-right"
        x={x + w - hw}
        y={y}
        width={hw}
        height={h}
        style={{ fill: color, fillOpacity: 0.45, cursor: "ew-resize" }}
        onPointerDown={begin("right")}
      />

      {/* Label near top */}
      {w > 24 && (
        <text
          x={x + w / 2}
          y={y + LABEL_FONT + 2}
          fontSize={LABEL_FONT}
          textAnchor="middle"
          style={{ fill: color, fillOpacity: 0.9 }}
          pointerEvents="none"
        >
          {anomaly.name}
        </text>
      )}

      {/* Hover tooltip */}
      {hovered && !dragMode && (
        <AnomalyTooltip
          anomaly={anomaly}
          color={color}
          x={x + w / 2}
          y={y}
          height={h}
        />
      )}
    </g>
  );
}

const TOOLTIP_PAD = 5;
const TOOLTIP_LINE_H = 12;
const TOOLTIP_FONT = 9;

function AnomalyTooltip({
  anomaly,
  color,
  x,
  y,
  height,
}: {
  anomaly: SimulationAnomaly;
  color: string;
  x: number;
  y: number;
  height: number;
}) {
  const lines = [anomaly.name, anomaly.type.replace(/_/g, " ")];
  if (anomaly.effect) {
    for (const [k, v] of Object.entries(anomaly.effect)) {
      if (v !== undefined && v !== null)
        lines.push(`${k.replace(/_/g, " ")}: ${v}`);
    }
  }

  const tw =
    Math.max(...lines.map((l) => l?.length ?? 0)) * 5.5 + TOOLTIP_PAD * 2;
  const th = lines.length * TOOLTIP_LINE_H + TOOLTIP_PAD * 2;
  const ty = y + height / 2 - th / 2;

  return (
    <g pointerEvents="none">
      <rect
        x={x - tw / 2}
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
          x={x}
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
    </g>
  );
}
