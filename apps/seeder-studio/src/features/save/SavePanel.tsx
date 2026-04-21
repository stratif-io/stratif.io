import { useState } from "react";
import { Button, Input, Label, Textarea } from "@stratif-io/web";
import { useSeederStore } from "@/stores/seederStore";

interface SavePanelProps {
  yaml: string;
}

export function SavePanel({ yaml }: SavePanelProps) {
  const name = useSeederStore((s) => s.config.name);
  const description = useSeederStore((s) => s.config.description ?? "");
  const setName = useSeederStore((s) => s.setName);
  const setDescription = useSeederStore((s) => s.setDescription);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard
      .writeText(yaml)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
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
          variant="outline"
          className="h-7 text-xs"
          onClick={handleCopy}
        >
          {copied ? "✓ Copied" : "Copy YAML"}
        </Button>
      </div>
    </aside>
  );
}
