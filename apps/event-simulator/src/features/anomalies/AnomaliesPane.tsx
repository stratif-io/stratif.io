import { useSeederStore } from "@/stores/seederStore";
import { AnomalyTrack } from "./AnomalyTrack";

const EMPTY: NonNullable<
  ReturnType<typeof useSeederStore.getState>["config"]["events"]
> = [];

export function AnomaliesPane() {
  const anomalies = useSeederStore((s) => s.config.events ?? EMPTY);

  return (
    <div className="flex flex-col min-w-0">
      {anomalies.length === 0 && (
        <div className="px-3 py-1.5 text-[13px] text-muted-foreground">
          No events yet — add one from the left sidebar.
        </div>
      )}
      <AnomalyTrack />
    </div>
  );
}
