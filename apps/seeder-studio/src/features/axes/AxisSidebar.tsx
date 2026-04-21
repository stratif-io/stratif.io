import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
      style={{
        width: open ? "var(--sidebar-expanded)" : "var(--sidebar-collapsed)",
      }}
      className="flex flex-col border-r bg-background transition-[width] duration-200 shrink-0 overflow-hidden"
    >
      {open && (
        <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
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

      <button
        type="button"
        aria-label={open ? "collapse axes" : "expand axes"}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center h-9 w-full border-t text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors shrink-0"
      >
        {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </aside>
  );
}
