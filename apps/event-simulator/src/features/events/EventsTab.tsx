import { useRef, useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  ScrollArea,
  cn,
} from "@stratif-io/design-system";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useSeederStore } from "@/stores/seederStore";
import { MARKOV_PRESETS, MARKOV_PRESET_LABELS } from "./markovPresets";
import { MarkovGraph } from "./MarkovGraph";
import { MarkovMatrix } from "./MarkovMatrix";
import { validateMarkovConfig } from "./markovValidation";
import type { MarkovConfig } from "@/types/simulation";

const EVENT_COLORS = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#e11d48",
];

function nextColor(events: { color?: string | null }[]): string {
  const used = new Set(events.map((e) => e.color));
  return (
    EVENT_COLORS.find((c) => !used.has(c)) ??
    EVENT_COLORS[events.length % EVENT_COLORS.length]
  );
}

export function EventsTab() {
  const markov = useSeederStore((s) => s.config.markov);
  const setMarkovConfig = useSeederStore((s) => s.setMarkovConfig);
  const [presetKey, setPresetKey] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const errors = validateMarkovConfig(markov);

  function handlePresetChange(value: string) {
    const preset = MARKOV_PRESETS[value];
    if (preset) {
      setMarkovConfig(preset);
      setPresetKey(value);
      setSelectedEvent(null);
    }
  }

  function addEvent() {
    const name = newName.trim();
    if (!name || markov.events.some((e) => e.name === name)) return;
    const color = nextColor(markov.events);
    const updated: MarkovConfig = {
      ...markov,
      events: [...markov.events, { name, color }],
      transitions: {
        ...markov.transitions,
        [name]: {},
      },
    };
    setMarkovConfig(updated);
    setNewName("");
    setPresetKey("");
    inputRef.current?.focus();
  }

  function removeEvent(name: string) {
    const updated: MarkovConfig = {
      events: markov.events.filter((e) => e.name !== name),
      start: Object.fromEntries(
        Object.entries(markov.start).filter(([k]) => k !== name),
      ),
      transitions: Object.fromEntries(
        Object.entries(markov.transitions)
          .filter(([k]) => k !== name)
          .map(([k, row]) => [
            k,
            Object.fromEntries(Object.entries(row).filter(([t]) => t !== name)),
          ]),
      ),
    };
    setMarkovConfig(updated);
    if (selectedEvent === name) setSelectedEvent(null);
    setPresetKey("");
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="flex flex-col w-52 shrink-0 border-r border-border bg-muted/30">
        {/* Preset */}
        <div className="px-3 pt-3 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Flow template
          </p>
          <Select
            value={presetKey || undefined}
            onValueChange={handlePresetChange}
          >
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue placeholder="Load a template…" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MARKOV_PRESET_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Event list */}
        <div className="flex flex-col flex-1 min-h-0 px-3 pt-2 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Events
          </p>
          <ScrollArea className="flex-1 min-h-0 -mx-1">
            <div className="px-1 space-y-0.5">
              {markov.events.length === 0 && (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  No events yet
                </p>
              )}
              {markov.events.map((ev) => (
                <button
                  key={ev.name}
                  onClick={() =>
                    setSelectedEvent((s) => (s === ev.name ? null : ev.name))
                  }
                  className={cn(
                    "group w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors",
                    selectedEvent === ev.name
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted text-foreground",
                  )}
                >
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ background: ev.color ?? "#6366f1" }}
                  />
                  <span className="flex-1 truncate font-medium">{ev.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${ev.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEvent(ev.name);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        removeEvent(ev.name);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                  >
                    <Trash2 size={11} />
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Add event */}
          <div className="flex gap-1 mt-2 pb-1">
            <Input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEvent()}
              placeholder="Event name…"
              className="h-7 text-xs flex-1 min-w-0"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={addEvent}
              disabled={!newName.trim()}
              className="h-7 w-7 p-0 shrink-0"
              aria-label="Add event"
            >
              <Plus size={13} />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Start distribution */}
        <div className="px-3 py-2 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Start distribution
          </p>
          {Object.keys(markov.start).length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            <div className="space-y-0.5">
              {Object.entries(markov.start).map(([ev, prob]) => (
                <div
                  key={ev}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-xs truncate text-foreground">{ev}</span>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                    {(prob * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: graph (top) + matrix (bottom) ────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Graph */}
        <div className="flex-1 min-h-0 relative">
          <MarkovGraph
            config={markov}
            selectedNode={selectedEvent}
            onNodeSelect={setSelectedEvent}
          />
        </div>

        {/* Matrix */}
        <div className="shrink-0 border-t border-border bg-muted/20">
          {errors.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border text-destructive">
              <AlertCircle size={12} className="shrink-0" />
              <span className="text-xs">
                {errors.length} validation error{errors.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className="overflow-auto max-h-52">
            <MarkovMatrix config={markov} onChange={setMarkovConfig} />
          </div>
        </div>
      </div>
    </div>
  );
}
