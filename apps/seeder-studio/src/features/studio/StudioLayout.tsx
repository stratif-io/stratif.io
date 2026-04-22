import { AxisStrip } from "./AxisStrip";
import { KpiGrid } from "./KpiGrid";
import { AnomaliesFloatingPanel } from "./AnomaliesFloatingPanel";

export function StudioLayout() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
      <AxisStrip />
      <KpiGrid />
      <AnomaliesFloatingPanel />
    </div>
  );
}
