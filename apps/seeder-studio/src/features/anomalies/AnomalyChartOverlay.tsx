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
}

const PILL_H = 14;

export function AnomalyChartOverlay({
  offset,
  anomalies,
  windowDays,
  onAnomalyChange,
}: Props) {
  const pxPerDay = offset.width / Math.max(1, windowDays);
  return (
    <g>
      {anomalies.map((a, i) => (
        <ChartPill
          key={i}
          index={i}
          anomaly={a}
          offset={offset}
          pxPerDay={pxPerDay}
          windowDays={windowDays}
          onChange={(next) => onAnomalyChange(i, next)}
        />
      ))}
    </g>
  );
}

interface PillProps {
  index: number;
  anomaly: SimulationAnomaly;
  offset: ChartOffset;
  pxPerDay: number;
  windowDays: number;
  onChange: (next: SimulationAnomaly) => void;
}

type DragMode = "body" | "left" | "right" | null;

function ChartPill({
  anomaly,
  offset,
  pxPerDay,
  windowDays,
  onChange,
}: PillProps) {
  const parsedStart = parseDays(anomaly.start ?? "0d") ?? 0;
  const startDay = Math.max(
    0,
    parsedStart < 0 ? windowDays + parsedStart : parsedStart,
  );
  const durationDays = Math.max(1, parseDays(anomaly.duration ?? "1d") ?? 1);

  const x = offset.left + startDay * pxPerDay;
  const pillWidth = Math.max(4, durationDays * pxPerDay);
  const y = offset.top;
  const color = anomalyTypeColor(anomaly.type);

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    origStart: number;
    origDuration: number;
  }>({
    mode: null,
    startX: 0,
    origStart: startDay,
    origDuration: durationDays,
  });
  const [dragging, setDragging] = useState(false);

  const begin = (mode: DragMode) => (e: React.PointerEvent) => {
    e.stopPropagation();
    dragRef.current = {
      mode,
      startX: e.clientX,
      origStart: startDay,
      origDuration: durationDays,
    };
    setDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    if (!dragRef.current.mode) return;
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

  const end = () => {
    dragRef.current.mode = null;
    setDragging(false);
  };

  return (
    <g onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <rect
        data-testid="chart-pill-body"
        role="button"
        aria-label={anomaly.name}
        tabIndex={0}
        x={x}
        y={y}
        width={pillWidth}
        height={PILL_H}
        rx={3}
        style={{
          fill: color,
          fillOpacity: 0.85,
          cursor: dragging ? "grabbing" : "grab",
        }}
        onPointerDown={begin("body")}
      />
      <rect
        data-testid="chart-pill-handle-left"
        x={x - 3}
        y={y}
        width={6}
        height={PILL_H}
        fill="transparent"
        style={{ cursor: "ew-resize" }}
        onPointerDown={begin("left")}
      />
      <rect
        data-testid="chart-pill-handle-right"
        x={x + pillWidth - 3}
        y={y}
        width={6}
        height={PILL_H}
        fill="transparent"
        style={{ cursor: "ew-resize" }}
        onPointerDown={begin("right")}
      />
      <text
        x={x + pillWidth / 2}
        y={y + PILL_H / 2 + 3}
        fontSize={9}
        textAnchor="middle"
        fill="hsl(var(--primary-foreground))"
        pointerEvents="none"
      >
        {anomaly.name}
      </text>
    </g>
  );
}
