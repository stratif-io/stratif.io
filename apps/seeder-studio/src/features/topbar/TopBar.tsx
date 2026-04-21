import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@stratif-io/web";
import { Users } from "lucide-react";
import { useSeederStore } from "@/stores/seederStore";
import type { PresetEntry } from "@/lib/api/presets";

interface Props {
  presets: PresetEntry[];
  selectedName: string | null;
  onSelectPreset: (name: string | null) => void;
}

export function TopBar({ presets, selectedName, onSelectPreset }: Props) {
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
      const delta = new Date(uiEndDate).getTime() - new Date(value).getTime();
      if (delta <= 0) return;
      const days = Math.max(1, Math.round(delta / 86_400_000));
      setScaleConfig({ ...config.scale_config, window_days: days });
    }
  };

  const handleEndDate = (value: string) => {
    setUiEndDate(value);
    if (uiStartDate && value) {
      const delta = new Date(value).getTime() - new Date(uiStartDate).getTime();
      if (delta <= 0) return;
      const days = Math.max(1, Math.round(delta / 86_400_000));
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
    <header className="flex items-center gap-3 border-b px-4 bg-background h-14 shrink-0">
      <Select
        value={presets.length === 0 ? undefined : (selectedName ?? "__blank__")}
        onValueChange={(val) =>
          onSelectPreset(val === "__blank__" ? null : val)
        }
        disabled={presets.length === 0}
      >
        <SelectTrigger className="w-40 h-8 text-xs">
          <SelectValue
            placeholder={presets.length === 0 ? "Loading…" : "Select preset…"}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__blank__">New blank</SelectItem>
          {presets.map((p) => (
            <SelectItem key={p.name} value={p.name}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-sm font-semibold tracking-tight">
        Seeder Studio
      </span>

      {dirty && (
        <Badge variant="outline" className="text-[10px] h-5">
          Modified
        </Badge>
      )}

      <div className="flex items-center gap-1.5">
        <label htmlFor="start-date" className="sr-only">
          Start date
        </label>
        <input
          id="start-date"
          type="text"
          placeholder="YYYY-MM-DD"
          value={uiStartDate ?? ""}
          onChange={(e) => handleStartDate(e.target.value)}
          className="h-8 rounded-md border border-border bg-muted/40 px-2 text-xs text-foreground w-28"
        />
        <span className="text-muted-foreground text-xs">→</span>
        <label htmlFor="end-date" className="sr-only">
          End date
        </label>
        <input
          id="end-date"
          type="text"
          placeholder="YYYY-MM-DD"
          value={uiEndDate ?? ""}
          onChange={(e) => handleEndDate(e.target.value)}
          className="h-8 rounded-md border border-border bg-muted/40 px-2 text-xs text-foreground w-28"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Users
          size={13}
          className="text-muted-foreground shrink-0"
          aria-hidden="true"
        />
        <label htmlFor="total-users" className="sr-only">
          Total users
        </label>
        <input
          id="total-users"
          type="number"
          min={1}
          placeholder="users"
          value={config.scale_config?.total_users ?? ""}
          onChange={(e) => handleTotalUsers(e.target.value)}
          className="h-8 w-24 rounded-md border border-border bg-muted/40 px-2 text-xs text-foreground"
        />
      </div>

      <div className="flex-1" />
    </header>
  );
}
