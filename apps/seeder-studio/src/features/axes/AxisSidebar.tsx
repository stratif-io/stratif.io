import { useState } from "react";
import { AXIS_DISPLAY, STRIP_AXIS_IDS } from "./axisDisplaySpec";
import { AxisDropdown } from "./AxisDropdown";
import { useSeederStore } from "@/stores/seederStore";
import { AXIS_SPEC } from "@/lib/twin";

interface Props {
  defaultOpen?: boolean;
}

export function AxisSidebar({ defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const axes = useSeederStore((s) => s.config.axes);
  const setAxis = useSeederStore((s) => s.setAxis);

  return (
    <aside
      className={[
        "flex flex-col border-r bg-muted/10 transition-all duration-200 shrink-0",
        open ? "w-52" : "w-8",
      ].join(" ")}
    >
      {/* Toggle button */}
      <button
        type="button"
        aria-label={open ? "collapse axes" : "expand axes"}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center h-8 w-full border-b text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors text-xs shrink-0"
      >
        {open ? "‹ axes" : "›"}
      </button>

      {open && (
        <div className="flex flex-col gap-2 p-2 overflow-y-auto">
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
      )}
    </aside>
  );
}
