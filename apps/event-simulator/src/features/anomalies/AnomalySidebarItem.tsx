import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
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
import { anomalyTypeColor } from "@/lib/twin";
import { cn } from "@/lib/cn";

interface Props {
  anomaly: SimEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: SimEvent) => void;
  onDelete: () => void;
}

export function AnomalySidebarItem({
  anomaly,
  open,
  onOpenChange,
  onChange,
  onDelete,
}: Props) {
  const [local, setLocal] = useState<SimEvent>(anomaly);
  useEffect(() => setLocal(anomaly), [anomaly]);

  const emit = (next: SimEvent) => {
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
    <div>
      <button
        type="button"
        aria-label={local.name || "anomaly"}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/60",
          open ? "bg-muted/60" : "bg-transparent",
        )}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="flex-1 text-left truncate font-medium">
          {local.name || spec.label}
        </span>
        <ChevronDown
          size={11}
          className={cn(
            "shrink-0 text-muted-foreground/60 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2 px-2 pb-2">
          <div className="flex flex-col gap-0.5">
            <Label
              htmlFor={`a-type-${local.name}`}
              className="text-[10px] text-muted-foreground"
            >
              Type
            </Label>
            <Select value={local.type} onValueChange={setType}>
              <SelectTrigger
                id={`a-type-${local.name}`}
                aria-label="type"
                className="h-8 text-[11px]"
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
            <Label
              htmlFor={`a-name-${local.name}`}
              className="text-[10px] text-muted-foreground"
            >
              Name
            </Label>
            <Input
              id={`a-name-${local.name}`}
              aria-label="name"
              value={local.name ?? ""}
              onChange={(e) => emit({ ...local, name: e.target.value })}
              className="h-8 text-[11px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor={`a-start-date-${local.name}`}
                className="text-[10px] text-muted-foreground"
              >
                Start date
              </Label>
              <Input
                id={`a-start-date-${local.name}`}
                aria-label="start date"
                type="date"
                value={local.start_date ?? ""}
                onChange={(e) => emit({ ...local, start_date: e.target.value })}
                className="h-8 text-[11px]"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor={`a-end-date-${local.name}`}
                className="text-[10px] text-muted-foreground"
              >
                End date
              </Label>
              <Input
                id={`a-end-date-${local.name}`}
                aria-label="end date"
                type="date"
                value={local.end_date ?? ""}
                onChange={(e) => emit({ ...local, end_date: e.target.value })}
                className="h-8 text-[11px]"
              />
            </div>
          </div>

          {spec.effectFields.map((f) => (
            <div key={f.key} className="flex flex-col gap-0.5">
              <Label
                htmlFor={`a-${f.key}-${local.name}`}
                className="text-[10px] text-muted-foreground"
              >
                {f.label}
              </Label>
              <Input
                id={`a-${f.key}-${local.name}`}
                aria-label={f.label}
                type="number"
                step="0.1"
                min={f.min}
                max={f.max}
                value={local.effect[f.key] ?? f.default}
                onChange={(e) =>
                  emit({
                    ...local,
                    effect: {
                      ...local.effect,
                      [f.key]: Number(e.target.value),
                    },
                  })
                }
                className="h-8 text-[11px]"
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
      )}
    </div>
  );
}
