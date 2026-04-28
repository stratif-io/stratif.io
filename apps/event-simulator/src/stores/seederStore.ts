import { create } from "zustand";
import type { MarkovConfig, SimulationConfig } from "@/types/simulation";
import { MARKOV_PRESETS } from "@/features/events/markovPresets";

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

function backfillEventColors(config: SimulationConfig): SimulationConfig {
  const events = config.markov?.events;
  if (!events?.length) return config;
  const assigned = events.map((ev) => ev.color).filter(Boolean) as string[];
  const usedSet = new Set(assigned);
  let colorIndex = 0;
  const filled = events.map((ev) => {
    if (ev.color) return ev;
    // Find the next unused color, cycling if exhausted
    while (
      colorIndex < EVENT_COLORS.length &&
      usedSet.has(EVENT_COLORS[colorIndex])
    ) {
      colorIndex++;
    }
    const color = EVENT_COLORS[colorIndex % EVENT_COLORS.length];
    usedSet.add(color);
    colorIndex++;
    return { ...ev, color };
  });
  return { ...config, markov: { ...config.markov, events: filled } };
}

export function blankConfig(): SimulationConfig {
  return {
    name: "new_preset",
    description: "",
    axes: {},
    markov: MARKOV_PRESETS["dating"],
  };
}

interface SeederState {
  config: SimulationConfig;
  dirty: boolean;
  uiStartDate: string | null;
  uiEndDate: string | null;
  loadPreset: (config: SimulationConfig) => void;
  setConfig: (config: SimulationConfig) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setAxis: (axis: string, value: string) => void;
  setMarkovConfig: (markov: MarkovConfig) => void;
  setScaleConfig: (scaleConfig: SimulationConfig["scale_config"]) => void;
  setGrowthConfig: (growthConfig: SimulationConfig["growth_config"]) => void;
  setSimEvents: (anomalies: SimulationConfig["events"]) => void;
  setUiStartDate: (iso: string | null) => void;
  setUiEndDate: (iso: string | null) => void;
  sidebarCollapsed: boolean;
  activeSection: "studio" | "events";
  setSidebarCollapsed: (v: boolean) => void;
  setActiveSection: (v: "studio" | "events") => void;
  studioExpanded: boolean;
  setStudioExpanded: (v: boolean) => void;
}

function defaultDates(): { uiStartDate: string; uiEndDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 90); // matches default scale "small" = 90d
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { uiStartDate: fmt(start), uiEndDate: fmt(end) };
}

export const useSeederStore = create<SeederState>((set) => ({
  config: blankConfig(),
  dirty: false,
  ...defaultDates(),

  loadPreset: (config) =>
    set({ config: backfillEventColors(config), dirty: false }),

  setConfig: (config) => set({ config, dirty: true }),

  setName: (name) =>
    set((s) => ({ config: { ...s.config, name }, dirty: true })),

  setDescription: (description) =>
    set((s) => ({ config: { ...s.config, description }, dirty: true })),

  setAxis: (axis, value) =>
    set((s) => ({
      config: { ...s.config, axes: { ...s.config.axes, [axis]: value } },
      dirty: true,
    })),

  setMarkovConfig: (markov) =>
    set((s) => ({ config: { ...s.config, markov }, dirty: true })),

  setScaleConfig: (scaleConfig) =>
    set((s) => ({
      config: { ...s.config, scale_config: scaleConfig },
      dirty: true,
    })),

  setGrowthConfig: (growthConfig) =>
    set((s) => ({
      config: { ...s.config, growth_config: growthConfig },
      dirty: true,
    })),

  setSimEvents: (anomalies) =>
    set((s) => ({
      config: { ...s.config, events: anomalies },
      dirty: true,
    })),

  setUiStartDate: (iso) => set({ uiStartDate: iso }),
  setUiEndDate: (iso) => set({ uiEndDate: iso }),

  sidebarCollapsed: (() => {
    try {
      return localStorage.getItem("seeder-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  })(),
  activeSection: "studio",
  setSidebarCollapsed: (v) => {
    try {
      localStorage.setItem("seeder-sidebar-collapsed", String(v));
    } catch {
      // storage unavailable
    }
    set({ sidebarCollapsed: v });
  },
  setActiveSection: (v) =>
    set((s) => ({
      activeSection: v,
      studioExpanded:
        v === "events" ? false : v === "studio" ? true : s.studioExpanded,
    })),
  studioExpanded: true,
  setStudioExpanded: (v) => set({ studioExpanded: v }),
}));
