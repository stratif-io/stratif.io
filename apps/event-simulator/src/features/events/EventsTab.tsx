import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@stratif-io/design-system";
import { useSeederStore } from "@/stores/seederStore";
import { MARKOV_PRESETS, MARKOV_PRESET_LABELS } from "./markovPresets";
import { MarkovMatrix } from "./MarkovMatrix";
import { MarkovGraph } from "./MarkovGraph";
import { validateMarkovConfig } from "./markovValidation";

export function EventsTab() {
  const markov = useSeederStore((s) => s.config.markov);
  const setMarkovConfig = useSeederStore((s) => s.setMarkovConfig);
  const [presetKey, setPresetKey] = useState<string>("");

  const errors = validateMarkovConfig(markov);

  function handlePresetChange(value: string) {
    const preset = MARKOV_PRESETS[value];
    if (preset) {
      setMarkovConfig(preset);
      setPresetKey(value);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3 p-4 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground font-medium shrink-0">
          Preset
        </label>
        <Select
          value={presetKey || undefined}
          onValueChange={handlePresetChange}
        >
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Load a preset…" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MARKOV_PRESET_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.length > 0 && (
          <span className="text-xs text-destructive">
            {errors.length} validation error{errors.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Main split: graph left, matrix right */}
      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
        <div className="flex-1 min-w-0 rounded-lg border border-border overflow-hidden bg-muted">
          <MarkovGraph config={markov} />
        </div>
        <div className="flex-1 min-w-0 overflow-auto">
          <MarkovMatrix config={markov} onChange={setMarkovConfig} />
        </div>
      </div>

      {/* Bottom bar — start distribution */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-2">
        <span className="font-medium">Start:</span>
        {Object.entries(markov.start).map(([ev, prob]) => (
          <span key={ev} className="font-mono">
            {ev} {(prob * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
