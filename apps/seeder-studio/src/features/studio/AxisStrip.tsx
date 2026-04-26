import { useMemo } from "react";
import { AXIS_DISPLAY, STRIP_AXIS_IDS } from "@/features/axes/axisDisplaySpec";
import { resolveAxes } from "@/lib/twin";
import { resolveScale } from "@/lib/twin/utils";
import { useSeederStore } from "@/stores/seederStore";
import { AxisChip } from "./AxisChip";

export function AxisStrip() {
  const rawAxes = useSeederStore((s) => s.config.axes);
  const setAxis = useSeederStore((s) => s.setAxis);
  const scaleConfig = useSeederStore((s) => s.config.scale_config);
  const setScaleConfig = useSeederStore((s) => s.setScaleConfig);
  const axes = resolveAxes(rawAxes);

  const resolvedScale = useMemo(
    () => resolveScale(rawAxes.scale ?? "small", scaleConfig),
    [rawAxes.scale, scaleConfig],
  );

  const handleStartingRate = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n > 0) {
      setScaleConfig({ ...scaleConfig, starting_rate: n });
    }
  };

  const inputBase =
    "h-8 rounded-md border border-border bg-muted/40 px-2 text-xs text-foreground transition-colors";

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background overflow-x-auto shrink-0">
      {STRIP_AXIS_IDS.map((id) => {
        const axisDisplay = AXIS_DISPLAY[id];
        return (
          <AxisChip
            key={id}
            axis={axisDisplay}
            currentValue={axes[id]}
            onSelect={(value) => setAxis(id, value)}
          />
        );
      })}
      {resolvedScale.mode === "rate" && (
        <div className="flex flex-col items-start gap-0.5 px-3 py-2 rounded-md border border-border bg-muted/40 min-w-[90px]">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            rate/day
          </span>
          <label htmlFor="starting-rate" className="sr-only">
            Starting rate
          </label>
          <input
            id="starting-rate"
            type="number"
            min={1}
            value={resolvedScale.starting_rate}
            onChange={(e) => handleStartingRate(e.target.value)}
            className={inputBase + " w-20"}
          />
        </div>
      )}
    </div>
  );
}
