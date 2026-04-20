import { useState } from "react";
import { Input, Label } from "@stratif-io/web";
import { useSeederStore } from "@/stores/seederStore";
import { AXIS_SPEC } from "@/lib/twin";

function numberOrUndef(s: string): number | undefined {
  if (s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function TuningSection() {
  const [expanded, setExpanded] = useState(false);
  const scale = useSeederStore((s) => s.config.scale_config);
  const growth = useSeederStore(
    (s) =>
      s.config.growth_config as
        | { split_fraction?: number; rate?: number }
        | undefined,
  );
  const uiStartDate = useSeederStore((s) => s.uiStartDate);
  const uiEndDate = useSeederStore((s) => s.uiEndDate);
  const setScaleConfig = useSeederStore((s) => s.setScaleConfig);
  const setGrowthConfig = useSeederStore((s) => s.setGrowthConfig);
  const setUiStartDate = useSeederStore((s) => s.setUiStartDate);
  const setUiEndDate = useSeederStore((s) => s.setUiEndDate);
  const scaleAxis = useSeederStore((s) => s.config.axes.scale ?? "small");
  const scaleDefaults = AXIS_SPEC.scale.values.find(
    (v) => v.value === scaleAxis,
  )?.params ?? { total_users: 10000, window_days: 90 };
  const growthAxis = useSeederStore((s) => s.config.axes.growth ?? "strong");
  const hockeyStickDefaults =
    growthAxis === "hockey_stick"
      ? { split_fraction: 0.3, rate: 0.04 }
      : { split_fraction: undefined, rate: undefined };

  return (
    <section aria-labelledby="tuning-heading" className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between text-sm font-semibold hover:text-primary transition-colors"
        aria-expanded={expanded}
        aria-controls="tuning-body"
      >
        <h2 id="tuning-heading">Tuning overrides</h2>
        <span className="text-xs text-muted-foreground">
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded && (
        <div id="tuning-body" className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="tuning-total-users" className="text-xs">
              Total users
            </Label>
            <Input
              id="tuning-total-users"
              aria-label="total users"
              type="number"
              value={scale?.total_users ?? ""}
              placeholder={`${scaleDefaults.total_users}`}
              onChange={(e) =>
                setScaleConfig({
                  ...scale,
                  total_users: numberOrUndef(e.target.value),
                })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="tuning-window-days" className="text-xs">
              Window days
            </Label>
            <Input
              id="tuning-window-days"
              aria-label="window days"
              type="number"
              value={scale?.window_days ?? ""}
              placeholder={`${scaleDefaults.window_days}`}
              onChange={(e) =>
                setScaleConfig({
                  ...scale,
                  window_days: numberOrUndef(e.target.value),
                })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="tuning-split-fraction" className="text-xs">
              Growth split fraction
            </Label>
            <Input
              id="tuning-split-fraction"
              aria-label="growth split fraction"
              type="number"
              step="0.01"
              value={growth?.split_fraction ?? ""}
              placeholder={
                hockeyStickDefaults.split_fraction !== undefined
                  ? `${hockeyStickDefaults.split_fraction}`
                  : undefined
              }
              onChange={(e) =>
                setGrowthConfig({
                  ...growth,
                  split_fraction: numberOrUndef(e.target.value),
                })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="tuning-growth-rate" className="text-xs">
              Growth rate
            </Label>
            <Input
              id="tuning-growth-rate"
              aria-label="growth rate"
              type="number"
              step="0.001"
              value={growth?.rate ?? ""}
              placeholder={
                hockeyStickDefaults.rate !== undefined
                  ? `${hockeyStickDefaults.rate}`
                  : undefined
              }
              onChange={(e) =>
                setGrowthConfig({
                  ...growth,
                  rate: numberOrUndef(e.target.value),
                })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="tuning-start-date" className="text-xs">
              Start date (optional)
            </Label>
            <Input
              id="tuning-start-date"
              aria-label="start date"
              type="date"
              value={uiStartDate ?? ""}
              onChange={(e) => setUiStartDate(e.target.value || null)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="tuning-end-date" className="text-xs">
              End date (defaults to today)
            </Label>
            <Input
              id="tuning-end-date"
              aria-label="end date"
              type="date"
              value={uiEndDate ?? ""}
              onChange={(e) => setUiEndDate(e.target.value || null)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}
    </section>
  );
}
