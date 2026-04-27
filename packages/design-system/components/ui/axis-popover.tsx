import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../../lib/utils";

export interface AxisDisplayValue {
  value: string;
  label: string;
  description: string;
  sparklinePoints: string;
}

export interface AxisPopoverProps {
  axisId: string;
  values: AxisDisplayValue[];
  currentValue: string;
  onSelect: (value: string) => void;
  children: ReactNode;
}

export function AxisPopover({
  axisId,
  values,
  currentValue,
  onSelect,
  children,
}: AxisPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-60 p-1.5">
        <div role="listbox" aria-label={`Select ${axisId} value`}>
          {values.map((v) => {
            const selected = v.value === currentValue;
            return (
              <button
                key={v.value}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelect(v.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left transition-colors",
                  selected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-foreground",
                )}
              >
                <svg
                  viewBox="0 0 52 28"
                  width="40"
                  height="22"
                  className={cn(
                    "shrink-0 rounded-sm border",
                    selected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-muted/30",
                  )}
                  aria-hidden="true"
                >
                  <polyline
                    points={v.sparklinePoints || "0,14 52,14"}
                    fill="none"
                    stroke={
                      selected
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground))"
                    }
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-[11px] font-medium truncate",
                      selected && "font-semibold",
                    )}
                  >
                    {v.label}
                  </div>
                  <div
                    className={cn(
                      "text-[10px] truncate",
                      selected ? "text-primary/70" : "text-muted-foreground",
                    )}
                  >
                    {v.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
