import { AxisStrip } from "./AxisStrip";
import { KpiGrid } from "./KpiGrid";

export function StudioLayout() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <AxisStrip />
      <KpiGrid />
    </div>
  );
}
