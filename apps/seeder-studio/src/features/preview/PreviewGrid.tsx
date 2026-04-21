import { useMemo, useRef } from "react";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@stratif-io/web";
import { useTwinOutput } from "./useTwinOutput";
import { KpiChart, type KpiBand } from "./KpiChart";
import { useSeederStore } from "@/stores/seederStore";
import { anomalyTypeColor } from "@/lib/twin";
import { parseDays, resolveScale } from "@/lib/twin/utils";
import { resolveDateRange } from "@/lib/time/dateRange";
import { useHoverGuide } from "./useHoverGuide";
import { formatNum } from "@/lib/format";
import type { SimulationConfig } from "@/types/simulation";

type AnomalyList = NonNullable<SimulationConfig["anomalies"]>;

export function headlineStat(
  values: number[],
  kind: "count" | "ratio",
): string {
  if (values.length === 0) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (kind === "ratio") return `avg ${formatNum(avg)}`;
  return `peak ${formatNum(max)} · avg ${formatNum(avg)} · min ${formatNum(min)}`;
}

const EMPTY_ANOMALIES: AnomalyList = [];

export function PreviewGrid() {
  const out = useTwinOutput();
  const anomalies = useSeederStore(
    (s) => s.config.anomalies ?? EMPTY_ANOMALIES,
  );
  const uiStartDate = useSeederStore((s) => s.uiStartDate);
  const uiEndDate = useSeederStore((s) => s.uiEndDate);
  const scaleOverride = useSeederStore((s) => s.config.scale_config);
  const scaleAxis = useSeederStore((s) => s.config.axes.scale ?? "small");
  const { window_days } = useMemo(
    () => resolveScale(scaleAxis, scaleOverride),
    [scaleAxis, scaleOverride],
  );
  const { start: chartStart, end: chartEnd } = useMemo(
    () => resolveDateRange(uiStartDate, uiEndDate, window_days),
    [uiStartDate, uiEndDate, window_days],
  );
  const guideIndex = useHoverGuide((s) => s.index);
  const setIndex = useHoverGuide((s) => s.setIndex);
  const clearIndex = useHoverGuide((s) => s.clear);
  const gridRef = useRef<HTMLDivElement>(null);

  const bands: KpiBand[] = useMemo(
    () =>
      anomalies.flatMap((a) => {
        if (!a.start || !a.duration) return [];
        const rawStart = parseDays(a.start);
        const rawDur = parseDays(a.duration);
        if (rawStart == null || rawDur == null || rawDur <= 0) return [];
        const start =
          rawStart < 0
            ? Math.max(0, out.days + rawStart)
            : Math.max(0, rawStart);
        const end = Math.min(out.days, start + rawDur);
        if (end <= start) return [];
        return [{ start, end, color: anomalyTypeColor(a.type) }];
      }),
    [anomalies, out.days],
  );

  const allZero =
    out.events.every((v) => v === 0) && out.activeUsers.every((v) => v === 0);

  const stats = useMemo(
    () => ({
      events: headlineStat(out.events, "count"),
      active: headlineStat(out.activeUsers, "count"),
      news: headlineStat(out.newUsers, "count"),
      stickiness: headlineStat(out.stickiness, "ratio"),
    }),
    [out],
  );

  const handleMove = (e: React.PointerEvent) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect || out.days <= 0) return;
    const rel = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setIndex(Math.floor(rel * (out.days - 1)));
  };

  return (
    <section
      aria-labelledby="preview-heading"
      className="flex flex-col gap-2 lg:flex-1 lg:overflow-hidden p-2"
    >
      <header className="flex items-center justify-between">
        <h2
          id="preview-heading"
          className="text-xs uppercase text-muted-foreground font-semibold"
        >
          Preview
        </h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="rounded px-2 py-0.5 text-[10px] font-medium cursor-help"
                style={{
                  backgroundColor: "hsl(var(--warning) / 0.15)",
                  color: "hsl(var(--warning))",
                }}
              >
                approximate
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Preview uses a coarse TS twin of the axis math. Actual seed output
              may vary — the twin is directionally correct within ~2× envelope.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </header>
      {allZero ? (
        <div className="flex-1 flex items-center justify-center text-[13px] text-muted-foreground p-6 text-center">
          Preview is empty. Try a non-zero scale tier or increase total users in
          Tuning overrides.
        </div>
      ) : (
        <div
          ref={gridRef}
          data-testid="preview-grid-canvas"
          onPointerMove={handleMove}
          onPointerLeave={clearIndex}
          className="grid grid-cols-2 gap-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto"
        >
          <KpiChart
            title="Events/day"
            values={out.events}
            headline={stats.events}
            color="hsl(var(--chart-6))"
            bands={bands}
            guideIndex={guideIndex}
            startDate={chartStart}
            endDate={chartEnd}
          />
          <KpiChart
            title="Active users"
            values={out.activeUsers}
            headline={stats.active}
            color="hsl(var(--chart-8))"
            bands={bands}
            guideIndex={guideIndex}
            startDate={chartStart}
            endDate={chartEnd}
          />
          <KpiChart
            title="New users/day"
            values={out.newUsers}
            headline={stats.news}
            color="hsl(var(--chart-3))"
            bands={bands}
            guideIndex={guideIndex}
            startDate={chartStart}
            endDate={chartEnd}
          />
          <KpiChart
            title="Stickiness"
            values={out.stickiness}
            headline={stats.stickiness}
            color="hsl(var(--chart-7))"
            bands={bands}
            guideIndex={guideIndex}
            startDate={chartStart}
            endDate={chartEnd}
          />
        </div>
      )}
    </section>
  );
}
