import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PresetEntry } from "@/lib/api/presets";

interface Props {
  presets: PresetEntry[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  onNewBlank: () => void;
  defaultOpen?: boolean;
}

export function PresetSidebar({
  presets,
  selectedName,
  onSelect,
  onNewBlank,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <aside
      style={{
        width: open
          ? "var(--sidebar-expanded, 220px)"
          : "var(--sidebar-collapsed, 60px)",
      }}
      className="flex flex-col border-l bg-background transition-[width] duration-200 shrink-0 overflow-hidden"
    >
      {open && (
        <div className="flex flex-col overflow-y-auto flex-1">
          <button
            type="button"
            onClick={onNewBlank}
            aria-label="new blank"
            className="text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 border-b transition-colors"
          >
            + New blank
          </button>
          <ul role="listbox" aria-label="presets" className="flex-1">
            {presets.map((p) => (
              <li key={p.name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={p.name === selectedName}
                  onClick={() => onSelect(p.name)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted/30 transition-colors aria-selected:bg-accent border-b border-border/40"
                >
                  <p className="font-medium text-foreground truncate">
                    {p.name}
                  </p>
                  {p.description && (
                    <p className="text-muted-foreground truncate text-[10px]">
                      {p.description}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? "collapse presets" : "expand presets"}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center h-9 w-full border-t text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors shrink-0"
      >
        {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
