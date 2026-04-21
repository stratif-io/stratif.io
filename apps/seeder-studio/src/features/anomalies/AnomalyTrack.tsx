import { useMemo, useRef, useState, useEffect } from "react";
import { AnomalyPill } from "./AnomalyPill";
import { useSeederStore } from "@/stores/seederStore";
import { resolveScale } from "@/lib/twin/utils";
import { defaultAnomaly, ANOMALY_SPEC } from "@/lib/twin";

interface Props {
  onEdit: (index: number) => void;
}

const TRACK_HEIGHT = 32;

export function AnomalyTrack({ onEdit }: Props) {
  const config = useSeederStore((s) => s.config);
  const setAnomalies = useSeederStore((s) => s.setAnomalies);
  const anomalies = config.anomalies ?? [];
  const { window_days } = useMemo(
    () => resolveScale(config.axes.scale ?? "small", config.scale_config),
    [config.axes.scale, config.scale_config],
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

  const addAnomaly = (type: string) => {
    const duration = Math.max(5, Math.floor(window_days * 0.1));
    const maxStart = Math.max(0, window_days - duration - 1);
    const start = Math.floor(Math.random() * maxStart);
    const next = defaultAnomaly(type, start, duration);
    setAnomalies([...anomalies, next]);
  };

  return (
    <div className="flex items-center gap-2 p-1 border-y min-w-0 overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 min-w-0 overflow-hidden"
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
              onChange={(next) => updateAnomaly(i, next)}
              onSelect={() => onEdit(i)}
            />
          ))}
        </svg>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {Object.values(ANOMALY_SPEC).map((spec) => (
          <button
            key={spec.type}
            type="button"
            onClick={() => addAnomaly(spec.type)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-left"
          >
            + {spec.label}
          </button>
        ))}
      </div>
    </div>
  );
}
