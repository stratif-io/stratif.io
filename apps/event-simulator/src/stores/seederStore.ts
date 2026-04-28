import { create } from "zustand";
import type { MarkovConfig, SimulationConfig } from "@/types/simulation";
import { MARKOV_PRESETS } from "@/features/events/markovPresets";

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

  loadPreset: (config) => set({ config, dirty: false }),

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
