import { useState } from "react";
import { useSeederStore } from "@/stores/seederStore";

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

  return (
    <section className="rounded border">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between p-3 text-sm font-semibold"
      >
        Tuning overrides
        <span className="text-xs">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="p-3 pt-0 grid grid-cols-2 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            Total users
            <input
              aria-label="total users"
              type="number"
              value={scale?.total_users ?? ""}
              onChange={(e) =>
                setScaleConfig({
                  ...scale,
                  total_users: numberOrUndef(e.target.value),
                })
              }
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Window days
            <input
              aria-label="window days"
              type="number"
              value={scale?.window_days ?? ""}
              onChange={(e) =>
                setScaleConfig({
                  ...scale,
                  window_days: numberOrUndef(e.target.value),
                })
              }
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Growth split fraction
            <input
              aria-label="growth split fraction"
              type="number"
              step="0.01"
              value={growth?.split_fraction ?? ""}
              onChange={(e) =>
                setGrowthConfig({
                  ...growth,
                  split_fraction: numberOrUndef(e.target.value),
                })
              }
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Growth rate
            <input
              aria-label="growth rate"
              type="number"
              step="0.001"
              value={growth?.rate ?? ""}
              onChange={(e) =>
                setGrowthConfig({
                  ...growth,
                  rate: numberOrUndef(e.target.value),
                })
              }
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Start date (optional)
            <input
              aria-label="start date"
              type="date"
              value={uiStartDate ?? ""}
              onChange={(e) => setUiStartDate(e.target.value || null)}
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            End date (defaults to today)
            <input
              aria-label="end date"
              type="date"
              value={uiEndDate ?? ""}
              onChange={(e) => setUiEndDate(e.target.value || null)}
              className="rounded border px-2 py-1"
            />
          </label>
        </div>
      )}
    </section>
  );
}
