import { useEffect, useState } from "react";
import { ResizablePanel } from "@stratif-io/design-system";
import { KpiGrid } from "./KpiGrid";
import { EventsTab } from "@/features/events/EventsTab";

interface Props {
  activeSection: string;
}

const AXIS_SECTIONS = [
  "growth",
  "retention",
  "engagement",
  "virality",
  "scale",
];

const AXIS_LABELS: Record<string, string> = {
  growth: "Growth",
  retention: "Retention",
  engagement: "Engagement",
  virality: "Virality",
  scale: "Scale",
};

export function StudioLayout({ activeSection }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (AXIS_SECTIONS.includes(activeSection)) {
      setPanelOpen(true);
    } else {
      setPanelOpen(false);
    }
  }, [activeSection]);

  if (activeSection === "events") {
    return (
      <div className="h-full overflow-y-auto">
        <EventsTab />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <KpiGrid />
      </div>
      <ResizablePanel
        open={panelOpen}
        defaultWidth={320}
        minWidth={200}
        maxWidth={600}
      >
        <div className="p-5">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground/70 mb-4">
            {AXIS_LABELS[activeSection] ?? activeSection}
          </p>
          <p className="text-sm text-muted-foreground">
            Configuration for {activeSection}
          </p>
        </div>
      </ResizablePanel>
    </div>
  );
}
