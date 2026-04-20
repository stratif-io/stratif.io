import { useMemo, useState } from "react";
import { PresetLibrary } from "./features/presets/PresetLibrary";
import { YamlPanel } from "./features/presets/YamlPanel";
import { usePresets } from "./features/presets/usePresets";
import { useSeederStore, blankConfig } from "./stores/seederStore";
import { stringifyConfigYaml } from "./lib/yaml/roundTrip";

export default function App() {
  const { presets, loading, error } = usePresets();
  const config = useSeederStore((s) => s.config);
  const dirty = useSeederStore((s) => s.dirty);
  const loadPreset = useSeederStore((s) => s.loadPreset);
  const setConfig = useSeederStore((s) => s.setConfig);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const yaml = useMemo(() => stringifyConfigYaml(config), [config]);

  const handleSelect = (name: string) => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    const preset = presets.find((p) => p.name === name);
    if (!preset) return;
    loadPreset(preset.config);
    setSelectedName(name);
  };

  const handleNewBlank = () => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    loadPreset(blankConfig());
    setSelectedName(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b p-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold">Seeder Studio</h1>
        <span className="text-xs text-muted-foreground">{config.name}</span>
        {dirty && <span className="text-xs text-amber-500">● modified</span>}
      </header>
      <main className="flex-1 flex overflow-hidden">
        {loading && <div className="p-4 text-sm">Loading presets…</div>}
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
            <section className="flex-1 flex">
              <div className="flex-1 p-4 text-sm text-muted-foreground">
                Editor coming in Plan 02.
              </div>
              <YamlPanel yaml={yaml} onValidConfig={setConfig} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
