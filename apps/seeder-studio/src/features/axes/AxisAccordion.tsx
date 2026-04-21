import { ChevronDown } from "lucide-react";
import type { AxisDisplay } from "./axisDisplaySpec";
import { cn } from "@/lib/cn";

interface Props {
  axisDisplay: AxisDisplay;
  currentValue: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Spark({
  points,
  active,
  size = "sm",
}: {
  points: string;
  active: boolean;
  size?: "sm" | "md";
}) {
  return (
    <svg
      viewBox="0 0 52 28"
      className={cn("flex-shrink-0", size === "sm" ? "w-6 h-3" : "w-8 h-4")}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={size === "sm" ? "1.5" : "2"}
        className={active ? "text-primary" : "text-muted-foreground/50"}
      />
    </svg>
  );
}

export function AxisAccordion({
  axisDisplay,
  currentValue,
  onChange,
  open,
  onOpenChange,
}: Props) {
  const currentDisplay =
    axisDisplay.values.find((v) => v.value === currentValue) ??
    axisDisplay.values[0];

  const handleSelect = (value: string) => {
    onChange(value);
    onOpenChange(false);
  };

  return (
    <div onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}>
      <button
        type="button"
        aria-label={axisDisplay.label}
        aria-expanded={open}
        aria-controls={`axis-options-${axisDisplay.id}`}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/60",
          open ? "bg-muted/60" : "bg-transparent",
        )}
      >
        <span className="text-muted-foreground w-16 shrink-0 text-left">
          {axisDisplay.label}
        </span>
        <Spark points={currentDisplay.sparkPoints} active={!open} />
        {!open && (
          <span className="flex-1 text-left font-medium text-foreground truncate">
            {currentDisplay.label}
          </span>
        )}
        <ChevronDown
          size={11}
          className={cn(
            "shrink-0 text-muted-foreground/60 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          id={`axis-options-${axisDisplay.id}`}
          role="listbox"
          aria-label={axisDisplay.label}
          className="mt-0.5 flex flex-col"
        >
          {axisDisplay.values.map((opt) => {
            const selected = opt.value === currentValue;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors text-xs",
                  selected
                    ? "bg-primary/8 text-primary"
                    : "hover:bg-muted/60 text-foreground",
                )}
              >
                <Spark points={opt.sparkPoints} active={selected} size="md" />
                <span
                  className={cn(
                    "flex-1 truncate",
                    selected ? "font-semibold" : "font-normal",
                  )}
                >
                  {opt.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
