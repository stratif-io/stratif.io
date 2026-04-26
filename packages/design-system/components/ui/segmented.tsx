import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  value: string;
  label: string;
  tooltip?: string;
}

interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
}

export function Segmented({
  options,
  value,
  onChange,
  className,
  defaultValue,
}: SegmentedProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="radiogroup"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border bg-background p-1",
          className,
        )}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          const isDefault =
            defaultValue !== undefined && opt.value === defaultValue && !active;
          const button = (
            <button
              type="button"
              role="radio"
              aria-checked={active}
              data-active={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                isDefault && "ring-1 ring-muted-foreground/40",
              )}
            >
              {opt.label}
            </button>
          );
          return opt.tooltip ? (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="bottom">{opt.tooltip}</TooltipContent>
            </Tooltip>
          ) : (
            <span key={opt.value}>{button}</span>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
