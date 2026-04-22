import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@stratif-io/web";
import type { AxisDisplay } from "@/features/axes/axisDisplaySpec";
import { AxisPopover } from "./AxisPopover";

interface Props {
  axis: AxisDisplay;
  currentValue: string;
  onSelect: (value: string) => void;
}

export function AxisChip({ axis, currentValue, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const current =
    axis.values.find((v) => v.value === currentValue) ?? axis.values[0];

  function handleSelect(value: string) {
    onSelect(value);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={`${axis.label}: ${current.label}`}
          className="flex flex-col items-start gap-0.5 px-3 py-2 rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors min-w-[90px] cursor-pointer"
        >
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            {axis.label}
          </span>
          <div className="flex items-center gap-1.5">
            <svg
              viewBox="0 0 52 28"
              width={36}
              height={14}
              aria-hidden="true"
              className="shrink-0"
            >
              <polyline
                points={current.sparkPoints}
                stroke="currentColor"
                strokeWidth={1.5}
                fill="none"
                className="text-primary"
              />
            </svg>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <AxisPopover
          axis={axis}
          currentValue={currentValue}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
