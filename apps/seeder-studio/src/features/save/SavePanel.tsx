import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Input, Label, Textarea } from "@stratif-io/web";
import { useSeederStore } from "@/stores/seederStore";

interface SavePanelProps {
  yaml: string;
  defaultOpen?: boolean;
}

type CopyState = "idle" | "copied" | "error";

export function SavePanel({ yaml, defaultOpen = false }: SavePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const name = useSeederStore((s) => s.config.name);
  const description = useSeederStore((s) => s.config.description ?? "");
  const setName = useSeederStore((s) => s.setName);
  const setDescription = useSeederStore((s) => s.setDescription);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  function handleCopy() {
    navigator.clipboard.writeText(yaml).then(
      () => {
        setCopyState("copied");
        setTimeout(() => setCopyState("idle"), 1500);
      },
      () => {
        setCopyState("error");
        setTimeout(() => setCopyState("idle"), 3000);
      },
    );
  }

  return (
    <aside
      style={{
        width: open ? "var(--sidebar-expanded, 220px)" : "auto",
      }}
      className="flex border-l bg-background shrink-0"
    >
      {/* Toggle strip */}
      <button
        type="button"
        aria-label={open ? "collapse save panel" : "expand save panel"}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-8 border-r text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors shrink-0 self-stretch"
      >
        {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {open && (
        <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
          <div className="flex items-center justify-between pb-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Save
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="preset-name" className="text-xs">
              Name
            </Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="preset-desc" className="text-xs">
              Description
            </Label>
            <Textarea
              id="preset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs resize-none"
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">YAML</Label>
            <pre className="text-[10px] bg-muted rounded p-2 overflow-x-auto whitespace-pre font-mono max-h-48 overflow-y-auto">
              {yaml}
            </pre>
            <Button
              size="sm"
              variant={copyState === "error" ? "destructive" : "outline"}
              className="h-7 text-xs"
              onClick={handleCopy}
            >
              {copyState === "copied"
                ? "✓ Copied"
                : copyState === "error"
                  ? "✕ Copy failed"
                  : "Copy YAML"}
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
