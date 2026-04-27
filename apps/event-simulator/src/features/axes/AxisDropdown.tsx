import { useEffect, useRef, useState } from "react";
import type { AxisDisplay } from "./axisDisplaySpec";
import { cn } from "@/lib/cn";

interface Props {
  axisDisplay: AxisDisplay;
  currentValue: string;
  onChange: (value: string) => void;
}

export function AxisDropdown({ axisDisplay, currentValue, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentDisplay =
    axisDisplay.values.find((v) => v.value === currentValue) ??
    axisDisplay.values[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  const handleSelect = (value: string) => {
    onChange(value);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={axisDisplay.label}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs transition-colors hover:bg-muted",
          open && "bg-muted border-ring",
        )}
      >
        <span className="text-muted-foreground w-16 shrink-0 text-left">
          {axisDisplay.label}
        </span>
        <svg
          viewBox="0 0 52 28"
          className="w-7 h-3.5 flex-shrink-0"
          aria-hidden
        >
          <polyline
            points={currentDisplay.sparkPoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-primary"
          />
        </svg>
        {!open && (
          <span className="font-medium text-foreground flex-1 text-left truncate">
            {currentDisplay.label}
          </span>
        )}
        <span className="text-muted-foreground/50 text-[10px] shrink-0">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={axisDisplay.label}
          className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {axisDisplay.values.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-label={opt.label}
              aria-selected={opt.value === currentValue}
              onClick={() => handleSelect(opt.value)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted",
                opt.value === currentValue && "bg-accent",
              )}
            >
              <svg
                viewBox="0 0 52 28"
                className="w-14 h-7 flex-shrink-0"
                aria-hidden
              >
                <polyline
                  points={opt.sparkPoints}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={
                    opt.value === currentValue
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    opt.value === currentValue
                      ? "text-primary"
                      : "text-foreground",
                  )}
                >
                  {opt.label}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {opt.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
