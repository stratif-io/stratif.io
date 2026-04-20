import { useMemo } from "react";
import { Button } from "@stratif-io/web";
import { AnomalyPill } from "./AnomalyPill";
import { useSeederStore } from "@/stores/seederStore";
import { resolveScale } from "@/lib/twin/utils";
import { defaultAnomaly } from "@/lib/twin";

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

  const updateAnomaly = (idx: number, next: (typeof anomalies)[number]) => {
    const copy = anomalies.slice();
    copy[idx] = next;
    setAnomalies(copy);
  };

  const addAnomaly = () => {
    const start = Math.floor(window_days / 3);
    const next = defaultAnomaly("marketing_campaign", start, 10);
    setAnomalies([...anomalies, next]);
  };

  return (
    <div className="flex items-center gap-2 p-1 border-y">
      <svg
        viewBox={`0 0 300 ${TRACK_HEIGHT}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: TRACK_HEIGHT }}
      >
        <rect
          x={0}
          y={0}
          width={300}
          height={TRACK_HEIGHT}
          fill="rgba(0,0,0,0.04)"
        />
        {anomalies.map((a, i) => (
          <AnomalyPill
            key={`${a.name}-${i}`}
            anomaly={a}
            windowDays={window_days}
            trackWidth={300}
            onChange={(next) => updateAnomaly(i, next)}
            onSelect={() => onEdit(i)}
          />
        ))}
      </svg>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addAnomaly}
        className="shrink-0 border-dashed"
      >
        + Anomaly
      </Button>
    </div>
  );
}
