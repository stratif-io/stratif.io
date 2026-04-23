import { AXIS_DISPLAY, STRIP_AXIS_IDS } from "@/features/axes/axisDisplaySpec";
import { resolveAxes } from "@/lib/twin";
import { useSeederStore } from "@/stores/seederStore";
import { AxisChip } from "./AxisChip";

export function AxisStrip() {
  const rawAxes = useSeederStore((s) => s.config.axes);
  const setAxis = useSeederStore((s) => s.setAxis);
  const axes = resolveAxes(rawAxes);

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
    </div>
  );
}
