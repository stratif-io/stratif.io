import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@stratif-io/design-system";
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
          className="flex flex-col items-start gap-1 px-3 py-2 rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors min-w-[100px] cursor-pointer"
        >
          <div className="flex items-center gap-1.5 w-full">
            <span className="text-xs font-semibold text-foreground capitalize">
              {axis.label}
            </span>
            <svg
              viewBox="0 0 52 28"
              width={28}
              height={11}
              aria-hidden="true"
              className="shrink-0 ml-auto"
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
          <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">
            {current.label}
          </span>
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
