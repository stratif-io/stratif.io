import { AXIS_DISPLAY, STRIP_AXIS_IDS } from "@/features/axes/axisDisplaySpec";
import { useSeederStore } from "@/stores/seederStore";
import { AxisChip } from "./AxisChip";

export function AxisStrip() {
  const axes = useSeederStore((s) => s.config.axes);
  const setAxis = useSeederStore((s) => s.setAxis);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background overflow-x-auto shrink-0">
      {STRIP_AXIS_IDS.map((id) => {
        const axisDisplay = AXIS_DISPLAY[id];
        const currentValue = axes[id] ?? axisDisplay.values[0].value;
        return (
          <AxisChip
            key={id}
            axis={axisDisplay}
            currentValue={currentValue}
            onSelect={(value) => setAxis(id, value)}
          />
        );
      })}
    </div>
  );
}
