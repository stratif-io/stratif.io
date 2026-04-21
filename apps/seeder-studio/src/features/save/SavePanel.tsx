import { useState } from "react";
import { Button, Input, Label, Textarea } from "@stratif-io/web";
import { useSeederStore } from "@/stores/seederStore";

interface SavePanelProps {
  yaml: string;
}

type CopyState = "idle" | "copied" | "error";

export function SavePanel({ yaml }: SavePanelProps) {
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
      style={{ width: "var(--sidebar-expanded, 220px)" }}
      className="flex flex-col gap-3 border-l bg-background p-3 shrink-0 overflow-y-auto"
    >
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
    </aside>
  );
}
