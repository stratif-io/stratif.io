import { useState } from "react";
import { AnomalyTrack } from "./AnomalyTrack";
import { AnomalyEditor } from "./AnomalyEditor";
import { useSeederStore } from "@/stores/seederStore";
import type { SimulationConfig } from "@/types/simulation";

type AnomalyList = NonNullable<SimulationConfig["anomalies"]>;
const EMPTY: AnomalyList = [];

export function AnomaliesPane() {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const anomalies = useSeederStore((s) => s.config.anomalies ?? EMPTY);
  const setAnomalies = useSeederStore((s) => s.setAnomalies);

  const current = editingIdx !== null ? anomalies[editingIdx] : null;

  return (
    <div className="flex flex-col">
      <AnomalyTrack onEdit={(i) => setEditingIdx(i)} />
      {current && editingIdx !== null && (
        <div className="p-2">
          <AnomalyEditor
            anomaly={current}
            onChange={(next) => {
              const copy = anomalies.slice();
              copy[editingIdx] = next;
              setAnomalies(copy);
            }}
            onDelete={() => {
              setAnomalies(anomalies.filter((_, i) => i !== editingIdx));
              setEditingIdx(null);
            }}
            onClose={() => setEditingIdx(null)}
          />
        </div>
      )}
    </div>
  );
}
