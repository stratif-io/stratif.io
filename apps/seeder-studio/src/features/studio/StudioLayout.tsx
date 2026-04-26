import { useState } from "react";
import { cn } from "@/lib/cn";
import { AxisStrip } from "./AxisStrip";
import { KpiGrid } from "./KpiGrid";
import { EventsTab } from "@/features/events/EventsTab";

type Tab = "simulation" | "events";

export function StudioLayout() {
  const [tab, setTab] = useState<Tab>("simulation");

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-border shrink-0">
        {(["simulation", "events"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-t-md -mb-px border border-transparent transition-colors",
              tab === t
                ? "border-border border-b-background bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "simulation" ? "Simulation" : "Events"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {tab === "simulation" ? (
          <>
            <AxisStrip />
            <KpiGrid />
          </>
        ) : (
          <EventsTab />
        )}
      </div>
    </div>
  );
}
