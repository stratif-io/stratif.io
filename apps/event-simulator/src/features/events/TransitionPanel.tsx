import { ScrollArea, Separator, cn } from "@stratif-io/design-system";
import type { MarkovConfig } from "@/types/simulation";

interface Props {
  config: MarkovConfig;
  selectedEvent: string | null;
  onChange: (config: MarkovConfig) => void;
  onDeselect: () => void;
}

const TOLERANCE = 0.001;

function rowSum(row: Record<string, number>): number {
  return Object.values(row).reduce((a, b) => a + b, 0);
}

function ProbBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary/60 transition-all"
        style={{ width: `${Math.min(value * 100, 100)}%` }}
      />
    </div>
  );
}

function SelectedView({
  config,
  eventName,
  onChange,
  onDeselect,
}: {
  config: MarkovConfig;
  eventName: string;
  onChange: (config: MarkovConfig) => void;
  onDeselect: () => void;
}) {
  const ev = config.events.find((e) => e.name === eventName);
  const eventNames = config.events.map((e) => e.name);
  const allTargets = [...eventNames, "[end]"];
  const row = config.transitions[eventName] ?? {};
  const sum = rowSum(row);
  const bad = Math.abs(sum - 1.0) > TOLERANCE;

  function handleChange(to: string, raw: string) {
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0 || val > 1) return;
    const newRow = { ...row, [to]: val };
    if (val === 0) delete newRow[to];
    onChange({
      ...config,
      transitions: { ...config.transitions, [eventName]: newRow },
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ background: ev?.color ?? "#6366f1" }}
          />
          <span className="text-xs font-semibold truncate">{eventName}</span>
        </div>
        <button
          onClick={onDeselect}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
          aria-label="Deselect"
        >
          ✕
        </button>
      </div>

      <Separator />

      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Outgoing transitions
          </p>
          <span
            className={cn(
              "text-[10px] font-mono tabular-nums",
              bad ? "text-destructive font-semibold" : "text-muted-foreground",
            )}
          >
            Σ {sum.toFixed(2)}
          </span>
        </div>
        {bad && (
          <p className="text-[10px] text-destructive mt-0.5">
            Must sum to 1.00
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 pb-3 space-y-2.5">
          {allTargets.map((to) => {
            const val = row[to] ?? 0;
            return (
              <div key={to} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs truncate",
                      to === "[end]"
                        ? "text-muted-foreground italic"
                        : "text-foreground",
                    )}
                  >
                    {to}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={val}
                    onChange={(e) => handleChange(to, e.target.value)}
                    className={cn(
                      "w-14 text-right text-xs font-mono tabular-nums bg-transparent border border-transparent rounded px-1 py-0.5",
                      "focus:outline-none focus:border-border focus:bg-muted/40",
                      val > 0 ? "text-foreground" : "text-muted-foreground/40",
                    )}
                  />
                </div>
                <ProbBar value={val} />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function AllValidation({ config }: { config: MarkovConfig }) {
  const eventNames = config.events.map((e) => e.name);
  const rows = eventNames.map((ev) => {
    const row = config.transitions[ev] ?? {};
    const sum = rowSum(row);
    const bad = Math.abs(sum - 1.0) > TOLERANCE && Object.keys(row).length > 0;
    return { ev, sum, bad };
  });
  const badRows = rows.filter((r) => r.bad);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2.5 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Transition sums
        </p>
      </div>
      <Separator />
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-2 space-y-1.5">
          {eventNames.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Select a node to edit its transitions
            </p>
          )}
          {rows.map(({ ev, sum, bad }) => {
            const evObj = config.events.find((e) => e.name === ev);
            return (
              <div key={ev} className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: evObj?.color ?? "#6366f1" }}
                />
                <span className="text-xs flex-1 truncate">{ev}</span>
                <span
                  className={cn(
                    "text-xs font-mono tabular-nums",
                    bad
                      ? "text-destructive font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  {sum.toFixed(2)}
                </span>
              </div>
            );
          })}
          {badRows.length === 0 && eventNames.length > 0 && (
            <p className="text-[10px] text-muted-foreground pt-2 text-center">
              Click a node to edit its transitions
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function TransitionPanel({
  config,
  selectedEvent,
  onChange,
  onDeselect,
}: Props) {
  if (selectedEvent) {
    return (
      <SelectedView
        config={config}
        eventName={selectedEvent}
        onChange={onChange}
        onDeselect={onDeselect}
      />
    );
  }
  return <AllValidation config={config} />;
}
