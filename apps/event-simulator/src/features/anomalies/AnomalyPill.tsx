import { useRef, useState } from "react";
import type { SimEvent } from "@/types/simulation";
import { anomalyTypeColor } from "@/lib/twin";

/** Parse an ISO date string (YYYY-MM-DD) as UTC midnight. */
const parseISO = (s: string) => new Date(s + "T00:00:00Z");

const toISO = (d: Date) => d.toISOString().slice(0, 10);

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
  const ws = windowStart ?? new Date();
  const startDay = Math.max(
    0,
    Math.round(
      (parseISO(anomaly.start_date).getTime() - ws.getTime()) / 86_400_000,
    ),
  );
  const durationDays = Math.max(
    1,
    Math.round(
      (parseISO(anomaly.end_date).getTime() -
        parseISO(anomaly.start_date).getTime()) /
        86_400_000,
    ),
  );
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
      const newStart = new Date(ws.getTime() + s * 86_400_000);
      const newEnd = new Date(newStart.getTime() + origDuration * 86_400_000);
      onChange({
        ...anomaly,
        start_date: toISO(newStart),
        end_date: toISO(newEnd),
      });
    } else if (mode === "right") {
      const d = Math.max(1, origDuration + deltaDays);
      const newEnd = new Date(
        parseISO(anomaly.start_date).getTime() + d * 86_400_000,
      );
      onChange({ ...anomaly, end_date: toISO(newEnd) });
    } else if (mode === "left") {
      const s = Math.max(0, origStart + deltaDays);
      const d = Math.max(1, origDuration - deltaDays);
      const newStart = new Date(ws.getTime() + s * 86_400_000);
      const newEnd = new Date(newStart.getTime() + d * 86_400_000);
      onChange({
        ...anomaly,
        start_date: toISO(newStart),
        end_date: toISO(newEnd),
      });
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
