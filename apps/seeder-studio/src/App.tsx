import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@stratif-io/web";
import { PresetLibrary } from "./features/presets/PresetLibrary";
import { YamlPanel } from "./features/presets/YamlPanel";
import { usePresets } from "./features/presets/usePresets";
import { useSeederStore, blankConfig } from "./stores/seederStore";
import { stringifyConfigYaml } from "./lib/yaml/roundTrip";
import { IdentitySection } from "./features/editor/IdentitySection";
import { AxesSection } from "./features/editor/AxesSection";
import { TuningSection } from "./features/editor/TuningSection";
import { PreviewGrid } from "./features/preview/PreviewGrid";
import { AnomaliesPane } from "./features/anomalies/AnomaliesPane";

export default function App() {
  const { presets, loading, error } = usePresets();
  const config = useSeederStore((s) => s.config);
  const dirty = useSeederStore((s) => s.dirty);
  const loadPreset = useSeederStore((s) => s.loadPreset);
  const setConfig = useSeederStore((s) => s.setConfig);
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

  const handleSelect = (name: string) => {
    const intent = { kind: "load" as const, name };
    if (dirty) {
      setPendingIntent(intent);
      return;
    }
    confirmAndRun(intent);
  };

  const handleNewBlank = () => {
    const intent = { kind: "blank" as const };
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

  const handleCancelDiscard = () => setPendingIntent(null);

  // Sync from URL on initial load (after presets are available)
  useEffect(() => {
    if (loading || presets.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get("preset");
    if (urlName && !selectedName && presets.some((p) => p.name === urlName)) {
      const preset = presets.find((p) => p.name === urlName);
      if (preset) {
        loadPreset(preset.config);
        setSelectedName(urlName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, presets.length]);

  // Keep URL in sync when selectedName changes
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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b p-3 flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Seeder Studio</h1>
        <span className="text-xs text-muted-foreground">{config.name}</span>
        {dirty && (
          <Badge variant="outline" className="text-xs">
            Modified
          </Badge>
        )}
        {!loading && !error && presets.length > 0 && (
          <div className="md:hidden ml-auto w-[180px]">
            <Select
              value={selectedName ?? ""}
              onValueChange={(name) => handleSelect(name)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pick preset…" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </header>
      <main className="flex-1 flex overflow-hidden">
        {loading && (
          <aside className="hidden md:flex w-[200px] lg:w-[220px] border-r p-3 flex-col gap-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <div className="flex gap-1 flex-wrap">
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <div className="space-y-2 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </aside>
        )}
        {error && (
          <div className="p-4 text-sm text-destructive">
            Error: {error.message}
          </div>
        )}
        {!loading && !error && (
          <>
            <PresetLibrary
              presets={presets}
              selectedName={selectedName}
              onSelect={handleSelect}
              onNewBlank={handleNewBlank}
            />
            <section className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className="flex-1 min-w-0 overflow-y-auto px-4 [&>*]:py-6 [&>*:not(:last-child)]:border-b">
                  {selectedName === null && (
                    <div className="bg-muted/40 border-b px-4 py-2 text-[13px] text-muted-foreground -mx-4 !py-2">
                      <strong className="text-foreground">New preset.</strong>{" "}
                      Pick a domain and axes below, or load an existing preset
                      from the library.
                    </div>
                  )}
                  <IdentitySection />
                  <AxesSection />
                  <TuningSection />
                </div>
                <div className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l overflow-y-auto">
                  <PreviewGrid />
                </div>
              </div>
              <div className="border-t">
                <AnomaliesPane />
              </div>
              <div className="border-t h-[220px] flex">
                <YamlPanel yaml={yaml} onValidConfig={setConfig} />
              </div>
            </section>
          </>
        )}
      </main>

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
              first if you want to keep them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDiscard}>
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
