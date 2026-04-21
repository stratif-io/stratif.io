import { AXIS_DISPLAY, STRIP_AXIS_IDS } from "./axisDisplaySpec";
import { AxisDropdown } from "./AxisDropdown";
import { useSeederStore } from "@/stores/seederStore";
import { AXIS_SPEC } from "@/lib/twin";

export function AxisStrip() {
  const axes = useSeederStore((s) => s.config.axes);
  const setAxis = useSeederStore((s) => s.setAxis);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-1.5 bg-muted/20">
      {STRIP_AXIS_IDS.map((id) => {
        const display = AXIS_DISPLAY[id];
        const current =
          axes[id] ?? AXIS_SPEC[id]?.default ?? display.values[0].value;
        return (
          <AxisDropdown
            key={id}
            axisDisplay={display}
            currentValue={current}
            onChange={(v) => setAxis(id, v)}
          />
        );
      })}
    </div>
  );
}
