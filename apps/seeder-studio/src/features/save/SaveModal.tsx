import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@stratif-io/web";
import { useSeederStore } from "@/stores/seederStore";

interface Props {
  open: boolean;
  yaml: string;
  onClose: () => void;
}

export function SaveModal({ open, yaml, onClose }: Props) {
  const config = useSeederStore((s) => s.config);
  const setName = useSeederStore((s) => s.setName);
  const setDescription = useSeederStore((s) => s.setDescription);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save preset</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="save-name">Preset name</Label>
            <Input
              id="save-name"
              aria-label="preset name"
              value={config.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my_preset"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="save-desc">Description</Label>
            <Textarea
              id="save-desc"
              aria-label="description"
              value={config.description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>YAML output</Label>
              <button
                type="button"
                className="hover:bg-accent hover:text-accent-foreground text-xs h-6 px-2 rounded-md"
                aria-label="copy"
                onClick={handleCopy}
              >
                {copied ? "✓ Copied" : "⎘ Copy"}
              </button>
            </div>
            <pre className="rounded-md border border-border bg-muted p-3 text-xs overflow-x-auto font-mono max-h-48 overflow-y-auto">
              {yaml}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            aria-label="cancel"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
