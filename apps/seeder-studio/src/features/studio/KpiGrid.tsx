import { useState, useMemo, useEffect } from "react";
import type { SimulationConfig } from "@/types/simulation";
import { useTwinOutput } from "@/features/preview/useTwinOutput";
import { useSeederStore } from "@/stores/seederStore";
import { resolveSimParams } from "@/lib/twin";
import { headlineStat } from "@/features/preview/headlineStat";
import { formatNum } from "@/lib/format";
import { AnomalyFloatingEditor } from "@/features/anomalies/AnomalyFloatingEditor";
import { KpiCard } from "./KpiCard";
import { KpiCardExpanded } from "./KpiCardExpanded";
import type { MetricKey } from "@/features/preview/formulaRegistry";

const EMPTY_ANOMALIES: NonNullable<SimulationConfig["anomalies"]> = [];

interface CardDef {
  key: MetricKey;
  title: string;
  color: string;
  valueSuffix?: string;
  colSpan?: number;
}

const SECTIONS: { label: string; cards: CardDef[] }[] = [
  {
    label: "Acquisition",
    cards: [
      { key: "newUsers", title: "New users/day", color: "hsl(var(--chart-3))" },
      { key: "totalUsers", title: "Total users", color: "hsl(var(--chart-2))" },
    ],
  },
  {
    label: "Retention",
    cards: [
      {
        key: "activeUsers",
        title: "Active users",
        color: "hsl(var(--chart-8))",
      },
      {
        key: "churnedUsers",
        title: "Churned/day",
        color: "hsl(var(--destructive))",
      },
      {
        key: "reactivatedUsers",
        title: "Reactivated/day",
        color: "hsl(var(--chart-4))",
      },
    ],
  },
  {
    label: "Engagement",
    cards: [
      {
        key: "stickiness",
        title: "Stickiness",
        color: "hsl(var(--chart-7))",
        valueSuffix: "%",
      },
      { key: "events", title: "Events/day", color: "hsl(var(--chart-6))" },
    ],
  },
];

export function KpiGrid() {
  const [expandedKey, setExpandedKey] = useState<MetricKey | null>(null);
  const [floatingEditor, setFloatingEditor] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const out = useTwinOutput();
  const config = useSeederStore((s) => s.config);
  const anomalies = useSeederStore(
    (s) => s.config.anomalies ?? EMPTY_ANOMALIES,
  );
  const setAnomalies = useSeederStore((s) => s.setAnomalies);
  const { windowDays } = useMemo(() => resolveSimParams(config), [config]);

  // Close floating editor on outside click (composedPath handles portals)
  useEffect(() => {
    if (!floatingEditor) return;
    const handler = (e: MouseEvent) => {
      const path = e.composedPath() as Element[];
      const inside = path.some((el) => el?.closest?.("[data-floating-editor]"));
      if (!inside) setFloatingEditor(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [floatingEditor]);

  const handleBandClick = (index: number, x: number, y: number) => {
    setFloatingEditor((prev) =>
      prev?.index === index ? null : { index, x, y },
    );
  };

  const valuesFor = (key: MetricKey): (number | null)[] => {
    switch (key) {
      case "events":
        return out.events;
      case "activeUsers":
        return out.activeUsers;
      case "newUsers":
        return out.newUsers;
      case "stickiness":
        return out.stickiness.map((v) => (v === null ? null : v * 100));
      case "totalUsers":
        return out.totalUsers;
      case "churnedUsers":
        return out.churnedUsers;
      case "reactivatedUsers":
        return out.reactivatedUsers;
    }
  };

  const headlineFor = (key: MetricKey): string => {
    switch (key) {
      case "stickiness":
        return headlineStat(out.stickiness, "percent");
      case "totalUsers":
        return `total ${formatNum(out.totalUsers.at(-1) ?? 0)}`;
      default:
        return headlineStat(valuesFor(key) as number[], "count");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto flex-1 min-h-0">
      {SECTIONS.map((section) => (
        <div key={section.label} className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/50">
            {section.label}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {section.cards.map((card) => (
              <KpiCard
                key={card.key}
                title={card.title}
                values={valuesFor(card.key)}
                headline={headlineFor(card.key)}
                color={card.color}
                valueSuffix={card.valueSuffix}
                anomalies={anomalies}
                windowDays={windowDays}
                onAnomalyChange={(i, next) =>
                  setAnomalies(anomalies.map((a, j) => (j === i ? next : a)))
                }
                onAnomalySelect={handleBandClick}
                expanded={expandedKey === card.key}
                onExpand={() =>
                  setExpandedKey((p) => (p === card.key ? null : card.key))
                }
                className={card.colSpan === 3 ? "col-span-3" : undefined}
              />
            ))}
            {section.cards.some((c) => c.key === expandedKey) && (
              <KpiCardExpanded
                metricKey={expandedKey!}
                color={section.cards.find((c) => c.key === expandedKey)!.color}
                onClose={() => setExpandedKey(null)}
              />
            )}
          </div>
        </div>
      ))}

      {floatingEditor !== null && anomalies[floatingEditor.index] && (
        <AnomalyFloatingEditor
          anomaly={anomalies[floatingEditor.index]}
          x={floatingEditor.x}
          y={floatingEditor.y}
          onChange={(next) => {
            setAnomalies(
              anomalies.map((a, i) => (i === floatingEditor.index ? next : a)),
            );
          }}
          onDelete={() => {
            setAnomalies(
              anomalies.filter((_, i) => i !== floatingEditor.index),
            );
            setFloatingEditor(null);
          }}
          onClose={() => setFloatingEditor(null)}
        />
      )}
    </div>
  );
}
