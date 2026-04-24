import { useEffect, useState } from "react";
import type { SimulationAnomaly } from "@/types/simulation";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@stratif-io/web";
import { ANOMALY_SPEC, anomalyTypeColor } from "@/lib/twin";

interface Props {
  anomaly: SimulationAnomaly;
  x: number;
  y: number;
  onChange: (next: SimulationAnomaly) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function AnomalyFloatingEditor({
  anomaly,
  x,
  y,
  onChange,
  onDelete,
  onClose,
}: Props) {
  const [local, setLocal] = useState<SimulationAnomaly>(anomaly);

  useEffect(() => {
    setLocal(anomaly);
  }, [anomaly]);

  const emit = (next: SimulationAnomaly) => {
    setLocal(next);
    onChange(next);
  };

  const spec = ANOMALY_SPEC[local.type] ?? ANOMALY_SPEC.marketing_campaign;
  const color = anomalyTypeColor(local.type);

  const setType = (newType: string) => {
    const newSpec = ANOMALY_SPEC[newType] ?? spec;
    const effect: Record<string, number> = {};
    for (const f of newSpec.effectFields) effect[f.key] = f.default;
    emit({ ...local, type: newType, effect });
  };

  return (
    <div
      data-floating-editor
      style={{ position: "fixed", left: x, top: y, zIndex: 50 }}
      className="rounded-lg border bg-popover text-popover-foreground shadow-md p-3 w-56 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <span className="text-xs font-semibold">Edit event</span>
        </div>
        <button
          aria-label="close"
          className="text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        <Label htmlFor="fe-type" className="text-[10px] text-muted-foreground">
          Type
        </Label>
        <Select value={local.type} onValueChange={setType}>
          <SelectTrigger
            id="fe-type"
            aria-label="type"
            className="h-7 text-[11px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ANOMALY_SPEC).map((s) => (
              <SelectItem key={s.type} value={s.type} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-0.5">
        <Label htmlFor="fe-name" className="text-[10px] text-muted-foreground">
          Name
        </Label>
        <Input
          id="fe-name"
          aria-label="name"
          value={local.name ?? ""}
          onChange={(e) => emit({ ...local, name: e.target.value })}
          className="h-7 text-[11px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5">
          <Label
            htmlFor="fe-start"
            className="text-[10px] text-muted-foreground"
          >
            Start
          </Label>
          <Input
            id="fe-start"
            aria-label="start"
            value={local.start ?? ""}
            onChange={(e) => emit({ ...local, start: e.target.value })}
            className="h-7 text-[11px]"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="fe-dur" className="text-[10px] text-muted-foreground">
            Duration
          </Label>
          <Input
            id="fe-dur"
            aria-label="duration"
            value={local.duration ?? ""}
            onChange={(e) => emit({ ...local, duration: e.target.value })}
            className="h-7 text-[11px]"
          />
        </div>
      </div>

      {spec.effectFields.map((f) => (
        <div key={f.key} className="flex flex-col gap-0.5">
          <Label
            htmlFor={`fe-${f.key}`}
            className="text-[10px] text-muted-foreground"
          >
            {f.label}
          </Label>
          <Input
            id={`fe-${f.key}`}
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
            className="h-7 text-[11px]"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={onDelete}
        className="mt-0.5 text-[10px] text-destructive hover:text-destructive/80 text-left transition-colors"
      >
        delete
      </button>
    </div>
  );
}
