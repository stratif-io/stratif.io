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

const HANDLE_W = 10;
const LABEL_FONT = 9;

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
        <ChartBand
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

interface BandProps {
  index: number;
  anomaly: SimulationAnomaly;
  offset: ChartOffset;
  pxPerDay: number;
  windowDays: number;
  onChange: (next: SimulationAnomaly) => void;
}

type DragMode = "body" | "left" | "right" | null;

function ChartBand({
  anomaly,
  offset,
  pxPerDay,
  windowDays,
  onChange,
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
    origStart: number;
    origDuration: number;
  }>({
    mode: null,
    startX: 0,
    origStart: startDay,
    origDuration: durationDays,
  });
  const [dragMode, setDragMode] = useState<DragMode>(null);

  const begin = (mode: DragMode) => (e: React.PointerEvent) => {
    e.stopPropagation();
    dragRef.current = {
      mode,
      startX: e.clientX,
      origStart: startDay,
      origDuration: durationDays,
    };
    setDragMode(mode);
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
    setDragMode(null);
  };

  const bodyCursor =
    dragMode === "body" ? "grabbing" : dragMode ? "ew-resize" : "grab";

  return (
    <g onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
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
    </g>
  );
}
