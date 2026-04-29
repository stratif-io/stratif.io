/**
 * DEV ONLY — Header UX options preview.
 * Access at: http://localhost:5180/dev
 */
import { useState } from "react";
import { Users, Info } from "lucide-react";
import { Input, cn } from "@stratif-io/design-system";
import * as Tooltip from "@radix-ui/react-tooltip";

// ─── shared stub data ────────────────────────────────────────────────────────

const SCALE_OPTIONS = ["tiny", "small", "medium", "large"];
const DEFAULT = {
  scale: "small",
  totalUsers: 5000,
  windowDays: 90,
  startDate: "2024-10-01",
  endDate: "2025-01-01",
  sessionsPerDay: 56,
};

function ScaleSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-xs bg-muted/40 border border-border rounded-md px-2 text-foreground"
    >
      {SCALE_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </option>
      ))}
    </select>
  );
}

// ─── Option A: tooltip on users field ────────────────────────────────────────

function OptionA() {
  const [scale, setScale] = useState(DEFAULT.scale);
  const [users, setUsers] = useState(String(DEFAULT.totalUsers));
  const [start, setStart] = useState(DEFAULT.startDate);
  const [end, setEnd] = useState(DEFAULT.endDate);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <ScaleSelect value={scale} onChange={setScale} />
      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 rounded px-2 py-0.5 shrink-0">
        🎯 Goal: {users} users
      </span>
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="h-8 w-32 bg-muted/40 text-xs"
        />
        <span className="text-muted-foreground text-xs">→</span>
        <Input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="h-8 w-32 bg-muted/40 text-xs"
        />
      </div>
      <div className="flex items-center gap-1">
        <Users size={13} className="text-muted-foreground shrink-0" />
        <Input
          type="number"
          value={users}
          onChange={(e) => setUsers(e.target.value)}
          className="h-8 w-24 bg-muted/40 text-xs"
        />
        <Tooltip.Provider delayDuration={0}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Info size={13} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="bottom"
                className="z-50 max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
              >
                <p className="font-medium mb-1">
                  How these controls work together
                </p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>
                    <span className="text-foreground font-medium">Scale</span>{" "}
                    sets default user count &amp; window length.
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Dates</span>{" "}
                    override the window length.
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Users</span>{" "}
                    overrides the target volume.
                  </li>
                </ul>
                <Tooltip.Arrow className="fill-border" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
  );
}

// ─── Option B: derived summary sentence ──────────────────────────────────────

function OptionB() {
  const [scale, setScale] = useState(DEFAULT.scale);
  const [users, setUsers] = useState(DEFAULT.totalUsers);
  const [start, setStart] = useState(DEFAULT.startDate);
  const [end, setEnd] = useState(DEFAULT.endDate);

  const days = Math.max(
    1,
    Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000,
    ),
  );
  const sessionsPerDay = Math.round(users / days);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <ScaleSelect value={scale} onChange={setScale} />
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="h-8 w-32 bg-muted/40 text-xs"
        />
        <span className="text-muted-foreground text-xs">→</span>
        <Input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="h-8 w-32 bg-muted/40 text-xs"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Users size={13} className="text-muted-foreground shrink-0" />
        <Input
          type="number"
          value={users}
          onChange={(e) => setUsers(Number(e.target.value))}
          className="h-8 w-24 bg-muted/40 text-xs"
        />
      </div>
      {/* derived summary */}
      <span className="text-[11px] font-medium text-primary bg-primary/8 border border-primary/20 rounded-full px-2.5 py-0.5 shrink-0 whitespace-nowrap">
        ~{users.toLocaleString()} users · {days}d · ~{sessionsPerDay}/day
      </span>
    </div>
  );
}

// ─── Option C: grouped cluster ────────────────────────────────────────────────

function OptionC() {
  const [scale, setScale] = useState(DEFAULT.scale);
  const [users, setUsers] = useState(DEFAULT.totalUsers);
  const [start, setStart] = useState(DEFAULT.startDate);
  const [end, setEnd] = useState(DEFAULT.endDate);

  const days = Math.max(
    1,
    Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000,
    ),
  );

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <ScaleSelect value={scale} onChange={setScale} />
      {/* grouped cluster */}
      <div className="flex items-center border border-border rounded-lg bg-muted/20 divide-x divide-border overflow-hidden h-8">
        <div className="flex items-center gap-1.5 px-2.5 h-full">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Window
          </span>
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-6 w-28 bg-transparent border-0 shadow-none text-xs px-0 focus-visible:ring-0"
          />
          <span className="text-muted-foreground text-xs">→</span>
          <Input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-6 w-28 bg-transparent border-0 shadow-none text-xs px-0 focus-visible:ring-0"
          />
          <span className="text-[10px] text-muted-foreground shrink-0">
            ({days}d)
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 h-full">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Users
          </span>
          <Input
            type="number"
            value={users}
            onChange={(e) => setUsers(Number(e.target.value))}
            className="h-6 w-20 bg-transparent border-0 shadow-none text-xs px-0 focus-visible:ring-0"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Option D: scale primary, overrides highlighted ──────────────────────────

const SCALE_DEFAULTS: Record<string, { users: number; days: number }> = {
  tiny: { users: 500, days: 30 },
  small: { users: 5000, days: 90 },
  medium: { users: 50000, days: 180 },
  large: { users: 500000, days: 365 },
};

function OptionD() {
  const [scale, setScale] = useState(DEFAULT.scale);
  const [users, setUsers] = useState<number | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);

  const defaults = SCALE_DEFAULTS[scale];
  const effectiveUsers = users ?? defaults.users;
  const usersOverridden = users !== null && users !== defaults.users;

  const effectiveStart =
    start ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - defaults.days);
      return d.toISOString().split("T")[0];
    })();
  const effectiveEnd = end ?? new Date().toISOString().split("T")[0];
  const daysOverridden = start !== null || end !== null;

  const days = Math.max(
    1,
    Math.round(
      (new Date(effectiveEnd).getTime() - new Date(effectiveStart).getTime()) /
        86_400_000,
    ),
  );

  function handleScaleChange(v: string) {
    setScale(v);
    setUsers(null);
    setStart(null);
    setEnd(null);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Scale — primary */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5">
          Scale
        </span>
        <ScaleSelect value={scale} onChange={handleScaleChange} />
      </div>

      {/* Dates — override */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1 px-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Window
          </span>
          {daysOverridden && (
            <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded px-1 font-medium">
              override
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={effectiveStart}
            onChange={(e) => setStart(e.target.value)}
            className="h-8 w-32 bg-muted/40 text-xs"
          />
          <span className="text-muted-foreground text-xs">→</span>
          <Input
            type="date"
            value={effectiveEnd}
            onChange={(e) => setEnd(e.target.value)}
            className="h-8 w-32 bg-muted/40 text-xs"
          />
          <span className="text-[10px] text-muted-foreground">({days}d)</span>
        </div>
      </div>

      {/* Users — override */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1 px-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Users
          </span>
          {usersOverridden && (
            <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded px-1 font-medium">
              override
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-muted-foreground shrink-0" />
          <Input
            type="number"
            value={effectiveUsers}
            onChange={(e) => setUsers(Number(e.target.value))}
            className={cn(
              "h-8 w-24 text-xs",
              usersOverridden
                ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
                : "bg-muted/40",
            )}
          />
          {usersOverridden && (
            <button
              onClick={() => setUsers(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground underline"
            >
              reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Preview page ─────────────────────────────────────────────────────────────

const OPTIONS = [
  {
    id: "A",
    label: "Option A — Tooltip on Users field",
    description:
      'Same layout as today + an ⓘ icon. Hover it to learn "Scale sets defaults, Dates override window, Users overrides volume."',
    pros: "Zero layout change. Non-intrusive.",
    cons: "Relies on discoverability — users must hover to learn.",
    component: OptionA,
  },
  {
    id: "B",
    label: "Option B — Live derived summary",
    description:
      "Replaces the static Rate/Goal badge with a computed sentence: ~5,000 users · 90d · ~56/day. Updates as you type.",
    pros: "Shows output of all inputs together. Makes the relationship obvious at a glance.",
    cons: "One more thing to read in the header. /day rate is approximate.",
    component: OptionB,
  },
  {
    id: "C",
    label: "Option C — Grouped cluster",
    description:
      'Dates + Users are wrapped in a single bordered pill labelled "Window / Users". Makes it visually clear they belong together.',
    pros: "Clean grouping. No extra text.",
    cons: "Slightly harder to scan each field individually.",
    component: OptionC,
  },
  {
    id: "D",
    label: 'Option D — Scale is primary; Dates & Users show "override" badge',
    description:
      'Scale is the source of truth. When you change Dates or Users away from scale defaults, a small amber "override" badge appears. Resetting brings you back to scale defaults.',
    pros: "Makes hierarchy explicit. Self-documenting: if there's no badge, everything follows scale.",
    cons: "More UI surface. Slightly more complex interaction model.",
    component: OptionD,
  },
];

export function HeaderOptionsPreview() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <h1 className="text-xl font-bold mb-1">Header UX — 4 options</h1>
          <p className="text-sm text-muted-foreground">
            Each variant is interactive. Try changing the inputs to see how they
            behave.
          </p>
        </div>

        {OPTIONS.map((opt) => (
          <div
            key={opt.id}
            className="border border-border rounded-xl overflow-hidden"
          >
            {/* Label bar */}
            <div className="px-5 py-3 bg-muted/30 border-b border-border">
              <h2 className="text-sm font-semibold">{opt.label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {opt.description}
              </p>
            </div>

            {/* Live preview */}
            <div className="px-5 py-5 bg-background">
              <div className="bg-muted/10 border border-dashed border-border rounded-lg px-4 py-3">
                <opt.component />
              </div>
            </div>

            {/* Pros / cons */}
            <div className="px-5 py-3 bg-muted/10 border-t border-border flex gap-6 text-xs">
              <div>
                <span className="font-medium text-green-600 dark:text-green-400">
                  ✓ Pro:{" "}
                </span>
                <span className="text-muted-foreground">{opt.pros}</span>
              </div>
              <div>
                <span className="font-medium text-red-500 dark:text-red-400">
                  ✗ Con:{" "}
                </span>
                <span className="text-muted-foreground">{opt.cons}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
