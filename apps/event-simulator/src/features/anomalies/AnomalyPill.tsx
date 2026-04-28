import { useRef, useState } from "react";
import type { SimEvent } from "@/types/simulation";
import { anomalyTypeColor } from "@/lib/twin";
import { parseDays } from "@/lib/twin/utils";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Props {
  anomaly: SimEvent;
  windowDays: number;
  trackWidth: number;
  windowStart?: Date;
  onChange: (next: SimEvent) => void;
  onSelect: () => void;
}

type DragMode = "body" | "left" | "right" | null;

const TRACK_HEIGHT = 28;

export function AnomalyPill({
  anomaly,
  windowDays,
  trackWidth,
  windowStart,
  onChange,
  onSelect,
}: Props) {
  const startDay = (() => {
    const s = anomaly.start ?? "0d";
    if (ISO_DATE_RE.test(s) && windowStart) {
      const ms = new Date(s + "T00:00:00").getTime() - windowStart.getTime();
      return Math.max(0, Math.round(ms / 86_400_000));
    }
    const parsed = parseDays(s) ?? 0;
    return Math.max(0, parsed < 0 ? windowDays + parsed : parsed);
  })();
  const durationDays = Math.max(1, parseDays(anomaly.duration ?? "1d") ?? 1);
  const pxPerDay = trackWidth / Math.max(1, windowDays);
  const x = startDay * pxPerDay;
  const width = Math.max(4, durationDays * pxPerDay);

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
  const [focused, setFocused] = useState(false);

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

  const color = anomalyTypeColor(anomaly.type);

  return (
    <g onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <rect
        data-testid="pill-body"
        role="button"
        aria-label={anomaly.name}
        tabIndex={0}
        x={x}
        y={2}
        width={width}
        height={TRACK_HEIGHT - 4}
        style={{ fill: color, cursor: dragging ? "grabbing" : "grab" }}
        rx={3}
        stroke={focused ? "hsl(var(--ring))" : "none"}
        strokeWidth={focused ? 2 : 0}
        onPointerDown={begin("body")}
        onClick={onSelect}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      />
      <rect
        data-testid="pill-handle-left"
        x={x - 3}
        y={2}
        width={6}
        height={TRACK_HEIGHT - 4}
        fill="transparent"
        onPointerDown={begin("left")}
        style={{ cursor: "ew-resize" }}
      />
      <rect
        data-testid="pill-handle-right"
        x={x + width - 3}
        y={2}
        width={6}
        height={TRACK_HEIGHT - 4}
        fill="transparent"
        onPointerDown={begin("right")}
        style={{ cursor: "ew-resize" }}
      />
      <text
        x={x + width / 2}
        y={TRACK_HEIGHT / 2 + 3}
        fontSize={10}
        textAnchor="middle"
        fill="hsl(var(--primary-foreground))"
        pointerEvents="none"
      >
        {anomaly.name}
      </text>
    </g>
  );
}
