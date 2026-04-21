import { useMemo, useState } from "react";
import type { SimulationAnomaly } from "@/types/simulation";
import { ChevronRight } from "lucide-react";
import { AXIS_DISPLAY, STRIP_AXIS_IDS } from "./axisDisplaySpec";
import { AxisAccordion } from "./AxisAccordion";
import { AnomalySidebarItem } from "@/features/anomalies/AnomalySidebarItem";
import { useSeederStore } from "@/stores/seederStore";
import { AXIS_SPEC, ANOMALY_SPEC, defaultAnomaly } from "@/lib/twin";
import { resolveScale } from "@/lib/twin/utils";

const EMPTY_ANOMALIES: SimulationAnomaly[] = [];

interface Props {
  defaultOpen?: boolean;
}

export function AxisSidebar({ defaultOpen = true }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultOpen);
  const [openAxes, setOpenAxes] = useState<Set<string>>(new Set());
  const [openAnomalies, setOpenAnomalies] = useState<Set<number>>(new Set());
  const axes = useSeederStore((s) => s.config.axes);
  const setAxis = useSeederStore((s) => s.setAxis);
  const anomalies = useSeederStore(
    (s) => s.config.anomalies ?? EMPTY_ANOMALIES,
  );
  const setAnomalies = useSeederStore((s) => s.setAnomalies);
  const scaleAxis = useSeederStore((s) => s.config.axes.scale ?? "small");
  const scaleOverride = useSeederStore((s) => s.config.scale_config);
  const { window_days } = useMemo(
    () => resolveScale(scaleAxis, scaleOverride),
    [scaleAxis, scaleOverride],
  );

  const addAnomaly = (type: string) => {
    const duration = Math.max(5, Math.floor(window_days * 0.1));
    const maxStart = Math.max(0, window_days - duration - 1);
    const start = Math.floor(Math.random() * maxStart);
    const next = [...anomalies, defaultAnomaly(type, start, duration)];
    setAnomalies(next);
    setOpenAnomalies((prev) => new Set([...prev, next.length - 1]));
  };

  const updateAnomaly = (idx: number, next: SimulationAnomaly) => {
    const copy = anomalies.slice();
    copy[idx] = next;
    setAnomalies(copy);
  };

  const deleteAnomaly = (idx: number) => {
    setAnomalies(anomalies.filter((_, i) => i !== idx));
    setOpenAnomalies((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < idx) next.add(i);
        else if (i > idx) next.add(i - 1);
      }
      return next;
    });
  };

  const allExpanded = openAxes.size === STRIP_AXIS_IDS.length;

  const toggleAxis = (id: string, open: boolean) => {
    setOpenAxes((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <aside
      style={{
        width: sidebarOpen
          ? "var(--sidebar-expanded, 220px)"
          : "var(--sidebar-collapsed, 60px)",
      }}
      className="flex flex-col border-r bg-background transition-[width] duration-200 shrink-0 overflow-hidden"
    >
      {sidebarOpen && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-2 pt-2 pb-0.5">
            <button
              type="button"
              aria-label="collapse axes"
              onClick={() => setSidebarOpen(false)}
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
            >
              Axes
            </button>
            <button
              type="button"
              onClick={() =>
                setOpenAxes(allExpanded ? new Set() : new Set(STRIP_AXIS_IDS))
              }
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {allExpanded ? "collapse all" : "expand all"}
            </button>
          </div>
          <div className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1">
            {STRIP_AXIS_IDS.map((id) => {
              const display = AXIS_DISPLAY[id];
              const current =
                axes[id] ?? AXIS_SPEC[id]?.default ?? display.values[0].value;
              return (
                <AxisAccordion
                  key={id}
                  axisDisplay={display}
                  currentValue={current}
                  onChange={(v) => setAxis(id, v)}
                  open={openAxes.has(id)}
                  onOpenChange={(o) => toggleAxis(id, o)}
                />
              );
            })}

            <div className="mt-2 pt-2 border-t border-border/50">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 block mb-1">
                Anomalies
              </span>
              <div className="flex flex-col gap-0.5">
                {anomalies.map((a, i) => (
                  <AnomalySidebarItem
                    key={i}
                    anomaly={a}
                    open={openAnomalies.has(i)}
                    onOpenChange={(o) =>
                      setOpenAnomalies((prev) => {
                        const next = new Set(prev);
                        if (o) next.add(i);
                        else next.delete(i);
                        return next;
                      })
                    }
                    onChange={(next) => updateAnomaly(i, next)}
                    onDelete={() => deleteAnomaly(i)}
                  />
                ))}
                <div className="flex flex-col gap-0.5 mt-1">
                  {Object.values(ANOMALY_SPEC).map((spec) => (
                    <button
                      key={spec.type}
                      type="button"
                      onClick={() => addAnomaly(spec.type)}
                      className="text-[10px] px-2 py-1 rounded-md text-left text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      + {spec.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!sidebarOpen && (
        <button
          type="button"
          aria-label="expand axes"
          onClick={() => setSidebarOpen(true)}
          className="flex items-center justify-center flex-1 w-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </aside>
  );
}
