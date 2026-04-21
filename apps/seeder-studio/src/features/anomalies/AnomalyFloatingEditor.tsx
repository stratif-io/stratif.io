import { useEffect, useState } from "react";
import type { SimulationAnomaly } from "@/types/simulation";
import { Input } from "@stratif-io/web";
import { Label } from "@stratif-io/web";

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
  const [name, setName] = useState(anomaly.name ?? "");

  useEffect(() => {
    setName(anomaly.name ?? "");
  }, [anomaly.name]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setName(next);
    onChange({ ...anomaly, name: next });
  };

  return (
    <div
      style={{ position: "fixed", left: x, top: y, zIndex: 50 }}
      className="rounded-lg border bg-popover text-popover-foreground shadow-md p-3 w-52 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Edit anomaly</span>
        <button
          aria-label="close"
          className="text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="floating-anomaly-name" className="text-xs">
          Name
        </Label>
        <Input
          id="floating-anomaly-name"
          aria-label="name"
          value={name}
          onChange={handleNameChange}
          className="h-7 text-xs"
        />
      </div>
      <button
        aria-label="delete anomaly"
        className="text-left text-xs text-destructive hover:underline"
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}
