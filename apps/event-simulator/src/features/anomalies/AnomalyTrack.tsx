import { useMemo, useRef, useState, useEffect } from "react";
import { AnomalyPill } from "./AnomalyPill";
import { useSeederStore } from "@/stores/seederStore";
import { resolveScale } from "@/lib/twin/utils";

const TRACK_HEIGHT = 32;

export function AnomalyTrack() {
  const config = useSeederStore((s) => s.config);
  const setAnomalies = useSeederStore((s) => s.setAnomalies);
  const uiStartDate = useSeederStore((s) => s.uiStartDate);
  const anomalies = config.anomalies ?? [];
  const { window_days } = useMemo(
    () => resolveScale(config.axes.scale ?? "small", config.scale_config),
    [config.axes.scale, config.scale_config],
  );
  const windowStart = useMemo(
    () => (uiStartDate ? new Date(uiStartDate + "T00:00:00") : undefined),
    [uiStartDate],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setTrackWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateAnomaly = (idx: number, next: (typeof anomalies)[number]) => {
    const copy = anomalies.slice();
    copy[idx] = next;
    setAnomalies(copy);
  };

  return (
    <div className="p-1 border-y min-w-0 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full overflow-hidden"
        style={{ height: TRACK_HEIGHT }}
      >
        <svg
          viewBox={`0 0 ${trackWidth} ${TRACK_HEIGHT}`}
          width={trackWidth}
          height={TRACK_HEIGHT}
        >
          <rect
            x={0}
            y={0}
            width={trackWidth}
            height={TRACK_HEIGHT}
            fill="rgba(0,0,0,0.04)"
          />
          {anomalies.map((a, i) => (
            <AnomalyPill
              key={`${a.name}-${i}`}
              anomaly={a}
              windowDays={window_days}
              trackWidth={trackWidth}
              windowStart={windowStart}
              onChange={(next) => updateAnomaly(i, next)}
              onSelect={() => {}}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
