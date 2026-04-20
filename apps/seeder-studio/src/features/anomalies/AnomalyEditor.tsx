import { useState, useEffect } from "react";
import type { SimulationAnomaly } from "@/types/simulation";
import { ANOMALY_SPEC } from "@/lib/twin";

interface Props {
  anomaly: SimulationAnomaly;
  onChange: (next: SimulationAnomaly) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function AnomalyEditor({ anomaly, onChange, onDelete, onClose }: Props) {
  const [local, setLocal] = useState<SimulationAnomaly>(anomaly);
  useEffect(() => setLocal(anomaly), [anomaly]);

  const emit = (next: SimulationAnomaly) => {
    setLocal(next);
    onChange(next);
  };

  const spec = ANOMALY_SPEC[local.type] ?? ANOMALY_SPEC.marketing_campaign;

  const setType = (newType: string) => {
    const newSpec = ANOMALY_SPEC[newType] ?? spec;
    const effect: Record<string, number> = {};
    for (const f of newSpec.effectFields) effect[f.key] = f.default;
    emit({ ...local, type: newType, effect });
  };

  return (
    <div className="rounded border bg-background shadow-md p-3 flex flex-col gap-2 w-[280px]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Anomaly</h3>
        <button type="button" onClick={onClose} className="text-xs">
          close
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        Type
        <select
          aria-label="type"
          value={local.type}
          onChange={(e) => setType(e.target.value)}
          className="rounded border px-2 py-1"
        >
          {Object.values(ANOMALY_SPEC).map((s) => (
            <option key={s.type} value={s.type}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs">
        Name
        <input
          aria-label="name"
          value={local.name ?? ""}
          onChange={(e) => emit({ ...local, name: e.target.value })}
          className="rounded border px-2 py-1"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          Start (e.g. 10d, -30d)
          <input
            aria-label="start"
            value={local.start ?? ""}
            onChange={(e) => emit({ ...local, start: e.target.value })}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Duration (e.g. 5d)
          <input
            aria-label="duration"
            value={local.duration ?? ""}
            onChange={(e) => emit({ ...local, duration: e.target.value })}
            className="rounded border px-2 py-1"
          />
        </label>
      </div>

      {spec.effectFields.map((f) => (
        <label key={f.key} className="flex flex-col gap-1 text-xs">
          {f.label}
          <input
            aria-label={f.label}
            type="number"
            step="0.1"
            min={f.min}
            max={f.max}
            value={local.effect[f.key] ?? f.default}
            onChange={(e) =>
              emit({
                ...local,
                effect: { ...local.effect, [f.key]: Number(e.target.value) },
              })
            }
            className="rounded border px-2 py-1"
          />
        </label>
      ))}

      <button
        type="button"
        onClick={onDelete}
        className="rounded border border-destructive text-destructive text-xs px-2 py-1"
      >
        Delete
      </button>
    </div>
  );
}
