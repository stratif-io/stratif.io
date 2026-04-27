import { KpiGrid } from "./KpiGrid";
import { EventsTab } from "@/features/events/EventsTab";

interface Props {
  activeSection: string;
}

export function StudioLayout({ activeSection }: Props) {
  if (activeSection === "events") {
    return (
      <div className="h-full overflow-y-auto">
        <EventsTab />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto">
      <KpiGrid />
    </div>
  );
}
