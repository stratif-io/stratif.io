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

export function StudioLayout({ activeSection }: Props) {
  if (activeSection === "events") {
    return (
      <div className="h-full overflow-y-auto">
        <EventsTab />
      </div>
    );
  }

  if (AXIS_SECTIONS.includes(activeSection)) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <p className="text-muted-foreground text-sm">
          Configuration for {activeSection}
        </p>
      </div>
    );
  }

  // Default: studio overview
  return (
    <div className="h-full overflow-y-auto">
      <KpiGrid />
    </div>
  );
}
