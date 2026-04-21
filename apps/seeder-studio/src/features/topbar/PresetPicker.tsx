import { useEffect, useRef, useState } from "react";
import { Button } from "@stratif-io/web";
import type { PresetEntry } from "@/lib/api/presets";

interface Props {
  presets: PresetEntry[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  onNewBlank: () => void;
}

export function PresetPicker({
  presets,
  selectedName,
  onSelect,
  onNewBlank,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (name: string) => {
    onSelect(name);
    setOpen(false);
  };

  const handleNewBlank = () => {
    onNewBlank();
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="preset"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted transition-colors"
      >
        <span className="text-muted-foreground text-[10px]">preset</span>
        <span className="font-semibold text-foreground">
          {selectedName ?? "New preset"}
        </span>
        <span className="text-muted-foreground/50 text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-border bg-popover p-1 shadow-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="new blank"
            className="w-full justify-start text-muted-foreground hover:text-foreground mb-1"
            onClick={handleNewBlank}
          >
            + New blank
          </Button>
          <div className="border-t border-border mb-1" />
          <ul role="listbox" aria-label="presets">
            {presets.map((p) => (
              <li key={p.name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={p.name === selectedName}
                  onClick={() => handleSelect(p.name)}
                  className="w-full text-left rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors aria-selected:bg-accent"
                >
                  <p className="font-medium text-foreground">{p.name}</p>
                  {p.description && (
                    <p className="text-muted-foreground truncate">
                      {p.description}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
