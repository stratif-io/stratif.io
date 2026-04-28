import { useRef, useState, useEffect } from "react";
import { pixelToIndex } from "./rangeBrushMath";

interface Props {
  count: number;
  color?: string;
  onChange?: (range: [number, number] | null) => void;
}

export function RangeBrush({ count, color = "#2563eb", onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<[number, number]>([
    0,
    Math.max(0, count - 1),
  ]);

  // Reset when data length changes (e.g., after async load)
  useEffect(() => {
    setRange([0, Math.max(0, count - 1)]);
    onChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const indexToPercent = (i: number) =>
    count <= 1 ? 0 : (i / (count - 1)) * 100;

  const startDrag =
    (which: "start" | "end") => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const px = ev.clientX - rect.left;
        const idx = pixelToIndex(px, rect.width, count);
        setRange((prev) => {
          const [s, end] = prev;
          const next: [number, number] =
            which === "start"
              ? [Math.min(idx, end), end]
              : [s, Math.max(idx, s)];
          // Fire onChange on every move so the chart updates in real-time
          if (next[0] === 0 && next[1] === count - 1) {
            onChange?.(null);
          } else {
            onChange?.(next);
          }
          return next;
        });
      };

      const onUp = (ev: PointerEvent) => {
        (ev.target as HTMLDivElement).releasePointerCapture(ev.pointerId);
        (ev.target as HTMLDivElement).removeEventListener(
          "pointermove",
          onMove,
        );
        (ev.target as HTMLDivElement).removeEventListener("pointerup", onUp);
      };

      (e.currentTarget as HTMLDivElement).addEventListener(
        "pointermove",
        onMove,
      );
      (e.currentTarget as HTMLDivElement).addEventListener("pointerup", onUp);
    };

  const [start, end] = range;
  const leftPct = indexToPercent(start);
  const rightPct = indexToPercent(end);

  return (
    <div
      ref={trackRef}
      className="relative h-7 w-full select-none"
      style={{ background: "hsl(var(--muted))", borderRadius: 4 }}
    >
      {/* selection fill */}
      <div
        className="absolute inset-y-0 pointer-events-none"
        style={{
          left: `${leftPct}%`,
          right: `${100 - rightPct}%`,
          background: `${color}22`,
          borderLeft: `2px solid ${color}`,
          borderRight: `2px solid ${color}`,
        }}
      />
      {/* start handle */}
      <div
        className="absolute inset-y-0 w-3 cursor-ew-resize flex items-center justify-center touch-none"
        style={{ left: `calc(${leftPct}% - 6px)` }}
        onPointerDown={startDrag("start")}
        data-testid="brush-handle-start"
      >
        <div className="w-0.5 h-4 rounded-full" style={{ background: color }} />
      </div>
      {/* end handle */}
      <div
        className="absolute inset-y-0 w-3 cursor-ew-resize flex items-center justify-center touch-none"
        style={{ left: `calc(${rightPct}% - 6px)` }}
        onPointerDown={startDrag("end")}
        data-testid="brush-handle-end"
      >
        <div className="w-0.5 h-4 rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}
