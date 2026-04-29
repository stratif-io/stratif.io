import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { pixelToIndex } from "./rangeBrushMath";

interface Props {
  count: number;
  color?: string;
  /**
   * Left/right inset in px matching the chart's left margin + y-axis width and
   * right margin, so handles align precisely with the chart plot area.
   */
  paddingLeft?: number;
  paddingRight?: number;
  /** Fired on pointerup — commits the final zoomed range */
  onChange?: (range: [number, number] | null) => void;
  /** Fired on pointermove — preview only, no re-render of chart data */
  onPreview?: (range: [number, number] | null) => void;
}

export function RangeBrush({
  count,
  color = "#2563eb",
  paddingLeft = 0,
  paddingRight = 0,
  onChange,
  onPreview,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [range, setRange] = useState<[number, number]>([
    0,
    Math.max(0, count - 1),
  ]);

  // Keep trackWidth in sync with the element's rendered width
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setTrackWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset when data length changes (e.g., after async load)
  useEffect(() => {
    setRange([0, Math.max(0, count - 1)]);
    onChange?.(null);
    onPreview?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const plotWidth = Math.max(1, trackWidth - paddingLeft - paddingRight);

  // index → left-edge px within the track
  const indexToPx = (i: number): number => {
    if (count <= 1) return paddingLeft;
    return paddingLeft + (i / (count - 1)) * plotWidth;
  };

  const startDrag =
    (which: "start" | "end") => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const px = Math.max(
          paddingLeft,
          Math.min(rect.width - paddingRight, ev.clientX - rect.left),
        );
        const idx = pixelToIndex(px - paddingLeft, plotWidth, count);
        setRange((prev) => {
          const [s, end] = prev;
          const next: [number, number] =
            which === "start"
              ? [Math.min(idx, end), end]
              : [s, Math.max(idx, s)];
          onPreview?.(next[0] === 0 && next[1] === count - 1 ? null : next);
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
        setRange((prev) => {
          const [s, end] = prev;
          const committed =
            s === 0 && end === count - 1
              ? null
              : ([s, end] as [number, number]);
          onChange?.(committed);
          onPreview?.(null);
          return prev;
        });
      };

      (e.currentTarget as HTMLDivElement).addEventListener(
        "pointermove",
        onMove,
      );
      (e.currentTarget as HTMLDivElement).addEventListener("pointerup", onUp);
    };

  const [start, end] = range;
  const leftPx = indexToPx(start);
  const rightPx = indexToPx(end);

  return (
    <div
      ref={trackRef}
      className="relative h-7 w-full select-none overflow-hidden"
      style={{ background: "hsl(var(--muted))", borderRadius: 4 }}
    >
      {/* selection fill */}
      <div
        className="absolute inset-y-0 pointer-events-none"
        style={{
          left: leftPx,
          width: rightPx - leftPx,
          background: `${color}22`,
          borderLeft: `2px solid ${color}`,
          borderRight: `2px solid ${color}`,
        }}
      />
      {/* start handle */}
      <div
        className="absolute inset-y-0 w-3 cursor-ew-resize flex items-center justify-center touch-none"
        style={{ left: leftPx - 6 }}
        onPointerDown={startDrag("start")}
        data-testid="brush-handle-start"
      >
        <div className="w-0.5 h-4 rounded-full" style={{ background: color }} />
      </div>
      {/* end handle */}
      <div
        className="absolute inset-y-0 w-3 cursor-ew-resize flex items-center justify-center touch-none"
        style={{ left: rightPx - 6 }}
        onPointerDown={startDrag("end")}
        data-testid="brush-handle-end"
      >
        <div className="w-0.5 h-4 rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}
