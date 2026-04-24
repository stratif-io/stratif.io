import { Component, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
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
import { StudioLayout } from "./features/studio/StudioLayout";
import { usePresets } from "./features/presets/usePresets";
import { useSeederStore, blankConfig } from "./stores/seederStore";

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-6 text-center">
            Something went wrong. Reload the page or pick a different preset.
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { presets, loading, error } = usePresets();
  const config = useSeederStore((s) => s.config);
  const dirty = useSeederStore((s) => s.dirty);
  const loadPreset = useSeederStore((s) => s.loadPreset);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<
    { kind: "load"; name: string } | { kind: "blank" } | null
  >(null);

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

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ErrorBoundary>
          <StudioLayout />
        </ErrorBoundary>
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
              <span className="font-mono">{config.name}</span>. These changes
              will be lost.
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
