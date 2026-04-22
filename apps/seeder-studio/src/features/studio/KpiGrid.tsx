import { useState } from "react";
import { useTwinOutput } from "@/features/preview/useTwinOutput";
import { headlineStat } from "@/features/preview/headlineStat";
import { formatNum } from "@/lib/format";
import { KpiCard } from "./KpiCard";
import { KpiCardExpanded } from "./KpiCardExpanded";
import type { MetricKey } from "@/features/preview/formulaRegistry";

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
    label: "Engagement",
    cards: [
      {
        key: "stickiness",
        title: "Stickiness",
        color: "hsl(var(--chart-7))",
        valueSuffix: "%",
      },
      {
        key: "activeUsers",
        title: "Active users",
        color: "hsl(var(--chart-8))",
      },
    ],
  },
  {
    label: "Activity",
    cards: [
      {
        key: "events",
        title: "Events/day",
        color: "hsl(var(--chart-6))",
        colSpan: 3,
      },
    ],
  },
  {
    label: "Health",
    cards: [
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
];

export function KpiGrid() {
  const [expandedKey, setExpandedKey] = useState<MetricKey | null>(null);
  const out = useTwinOutput();

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

  const handleExpand = (key: MetricKey) => {
    setExpandedKey((prev) => (prev === key ? null : key));
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
                expanded={expandedKey === card.key}
                onExpand={() => handleExpand(card.key)}
                className={card.colSpan === 3 ? "col-span-3" : undefined}
              />
            ))}
            {section.cards.some((c) => c.key === expandedKey) && (
              <KpiCardExpanded
                metricKey={expandedKey!}
                onClose={() => setExpandedKey(null)}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
