// apps/seeder-studio/src/App.tsx
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@stratif-io/web";
import { TopBar } from "./features/topbar/TopBar";
import { AxisSidebar } from "./features/axes/AxisSidebar";
import { AnomaliesPane } from "./features/anomalies/AnomaliesPane";
import { PreviewGrid } from "./features/preview/PreviewGrid";
import { SavePanel } from "./features/save/SavePanel";
import { usePresets } from "./features/presets/usePresets";
import { useSeederStore, blankConfig } from "./stores/seederStore";
import { stringifyConfigYaml } from "./lib/yaml/roundTrip";

export default function App() {
  const { presets, loading, error } = usePresets();
  const config = useSeederStore((s) => s.config);
  const dirty = useSeederStore((s) => s.dirty);
  const loadPreset = useSeederStore((s) => s.loadPreset);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<
    { kind: "load"; name: string } | { kind: "blank" } | null
  >(null);

  const yaml = useMemo(() => stringifyConfigYaml(config), [config]);

  const confirmAndRun = (
    intent: { kind: "load"; name: string } | { kind: "blank" },
  ) => {
    if (intent.kind === "load") {
      const preset = presets.find((p) => p.name === intent.name);
      if (!preset) return;
      loadPreset(preset.config);
      setSelectedName(intent.name);
    } else {
      loadPreset(blankConfig());
      setSelectedName(null);
    }
  };

  const handleSelectPreset = (name: string | null) => {
    const intent =
      name === null
        ? { kind: "blank" as const }
        : { kind: "load" as const, name };
    if (dirty) {
      setPendingIntent(intent);
      return;
    }
    confirmAndRun(intent);
  };

  const handleConfirmDiscard = () => {
    if (!pendingIntent) return;
    confirmAndRun(pendingIntent);
    setPendingIntent(null);
  };

  const urlSyncedRef = useRef(false);

  // Sync from URL on initial load
  useEffect(() => {
    if (loading || presets.length === 0 || urlSyncedRef.current) return;
    urlSyncedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get("preset");
    if (urlName && presets.some((p) => p.name === urlName)) {
      const preset = presets.find((p) => p.name === urlName);
      if (preset) {
        loadPreset(preset.config);
        setSelectedName(urlName);
      }
    }
  }, [loading, presets, loadPreset]);

  // Keep URL in sync
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedName) {
      url.searchParams.set("preset", selectedName);
    } else {
      url.searchParams.delete("preset");
    }
    window.history.replaceState({}, "", url.toString());
  }, [selectedName]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {loading ? (
        <div className="flex items-center gap-2 border-b px-3 py-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-40" />
        </div>
      ) : (
        <TopBar
          presets={presets}
          selectedName={selectedName}
          onSelectPreset={handleSelectPreset}
        />
      )}

      {error && (
        <div className="px-4 py-2 text-sm text-destructive border-b">
          Error loading presets: {error.message}
        </div>
      )}

      {/* 3-column body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AxisSidebar />

        <main className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
          <AnomaliesPane />
          <div className="flex-1 min-h-0">
            <PreviewGrid />
          </div>
        </main>

        <SavePanel yaml={yaml} />
      </div>

      <Dialog
        open={pendingIntent !== null}
        onOpenChange={(open) => !open && setPendingIntent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You&apos;ve made changes to{" "}
              <span className="font-mono">{config.name}</span>. Copy the YAML
              from the save panel first if you want to keep them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingIntent(null)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={handleConfirmDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
