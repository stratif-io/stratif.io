import { Button, Badge } from "@stratif-io/web";
import { PresetPicker } from "./PresetPicker";
import { useSeederStore } from "@/stores/seederStore";
import type { PresetEntry } from "@/lib/api/presets";

interface Props {
  presets: PresetEntry[];
  selectedName: string | null;
  onSelectPreset: (name: string) => void;
  onNewBlank: () => void;
  onSave: () => void;
}

export function TopBar({
  presets,
  selectedName,
  onSelectPreset,
  onNewBlank,
  onSave,
}: Props) {
  const dirty = useSeederStore((s) => s.dirty);
  const uiStartDate = useSeederStore((s) => s.uiStartDate);
  const uiEndDate = useSeederStore((s) => s.uiEndDate);
  const setUiStartDate = useSeederStore((s) => s.setUiStartDate);
  const setUiEndDate = useSeederStore((s) => s.setUiEndDate);
  const setScaleConfig = useSeederStore((s) => s.setScaleConfig);
  const config = useSeederStore((s) => s.config);

  const handleStartDate = (value: string) => {
    setUiStartDate(value);
    if (value && uiEndDate) {
      const days = Math.max(
        1,
        Math.round(
          (new Date(uiEndDate).getTime() - new Date(value).getTime()) /
            86_400_000,
        ),
      );
      setScaleConfig({ ...config.scale_config, window_days: days });
    }
  };

  const handleEndDate = (value: string) => {
    setUiEndDate(value);
    if (uiStartDate && value) {
      const days = Math.max(
        1,
        Math.round(
          (new Date(value).getTime() - new Date(uiStartDate).getTime()) /
            86_400_000,
        ),
      );
      setScaleConfig({ ...config.scale_config, window_days: days });
    }
  };

  const handleTotalUsers = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n > 0) {
      setScaleConfig({ ...config.scale_config, total_users: n });
    }
  };

  return (
    <header className="flex flex-wrap items-center gap-2 border-b px-3 py-1.5 bg-background">
      <span className="text-sm font-bold tracking-tight mr-1">
        Seeder Studio
      </span>

      <PresetPicker
        presets={presets}
        selectedName={selectedName}
        onSelect={onSelectPreset}
        onNewBlank={onNewBlank}
      />

      {dirty && (
        <Badge variant="outline" className="text-[10px] h-5">
          Modified
        </Badge>
      )}

      <div className="flex items-center gap-1 ml-1">
        <label htmlFor="start-date" className="sr-only">
          Start date
        </label>
        <input
          id="start-date"
          aria-label="start date"
          type="text"
          placeholder="YYYY-MM-DD"
          value={uiStartDate ?? ""}
          onChange={(e) => handleStartDate(e.target.value)}
          className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-xs text-foreground"
        />
        <span className="text-muted-foreground text-xs">→</span>
        <label htmlFor="end-date" className="sr-only">
          End date
        </label>
        <input
          id="end-date"
          aria-label="end date"
          type="text"
          placeholder="YYYY-MM-DD"
          value={uiEndDate ?? ""}
          onChange={(e) => handleEndDate(e.target.value)}
          className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-xs text-foreground"
        />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground">👥</span>
        <label htmlFor="total-users" className="sr-only">
          Total users
        </label>
        <input
          id="total-users"
          aria-label="total users"
          type="number"
          min={1}
          placeholder="users"
          value={config.scale_config?.total_users ?? ""}
          onChange={(e) => handleTotalUsers(e.target.value)}
          className="w-24 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-xs text-foreground"
        />
      </div>

      <div className="flex-1" />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-6 text-xs"
        onClick={onSave}
        aria-label="save preset"
      >
        💾 Save preset
      </Button>
    </header>
  );
}
