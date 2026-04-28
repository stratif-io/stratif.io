import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@stratif-io/design-system";
import type { SimEvent } from "@/types/simulation";
import { ANOMALY_SPEC } from "@/lib/twin";

interface Props {
  anomaly: SimEvent;
  onChange: (next: SimEvent) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function AnomalyEditor({ anomaly, onChange, onDelete, onClose }: Props) {
  const [local, setLocal] = useState<SimEvent>(anomaly);
  useEffect(() => setLocal(anomaly), [anomaly]);

  const emit = (next: SimEvent) => {
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
    <Card className="w-[280px] shadow-md">
      <CardContent className="p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Anomaly</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 text-xs px-2"
          >
            close
          </Button>
        </div>

        <div className="flex flex-col gap-1 text-xs">
          <Label htmlFor="anomaly-type" className="text-xs">
            Type
          </Label>
          <Select value={local.type} onValueChange={setType}>
            <SelectTrigger
              id="anomaly-type"
              aria-label="type"
              className="h-8 text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ANOMALY_SPEC).map((s) => (
                <SelectItem key={s.type} value={s.type}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="anomaly-name" className="text-xs">
            Name
          </Label>
          <Input
            id="anomaly-name"
            aria-label="name"
            value={local.name ?? ""}
            onChange={(e) => emit({ ...local, name: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="anomaly-start" className="text-xs">
              Start (e.g. 10d, -30d)
            </Label>
            <Input
              id="anomaly-start"
              aria-label="start"
              value={local.start ?? ""}
              onChange={(e) => emit({ ...local, start: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="anomaly-duration" className="text-xs">
              Duration (e.g. 5d)
            </Label>
            <Input
              id="anomaly-duration"
              aria-label="duration"
              value={local.duration ?? ""}
              onChange={(e) => emit({ ...local, duration: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {spec.effectFields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <Label htmlFor={`anomaly-effect-${f.key}`} className="text-xs">
              {f.label}
            </Label>
            <Input
              id={`anomaly-effect-${f.key}`}
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
              className="h-8 text-xs"
            />
          </div>
        ))}

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="mt-1"
        >
          Delete
        </Button>
      </CardContent>
    </Card>
  );
}
