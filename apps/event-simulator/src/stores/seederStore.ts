import { create } from "zustand";
import type { MarkovConfig, SimulationConfig } from "@/types/simulation";
import { MARKOV_PRESETS } from "@/features/events/markovPresets";

export function blankConfig(): SimulationConfig {
  return {
    name: "new_preset",
    description: "",
    axes: {},
    markov: MARKOV_PRESETS["saas"],
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
  setAnomalies: (anomalies: SimulationConfig["anomalies"]) => void;
  setUiStartDate: (iso: string | null) => void;
  setUiEndDate: (iso: string | null) => void;
  sidebarCollapsed: boolean;
  activeSection: string;
  setSidebarCollapsed: (v: boolean) => void;
  setActiveSection: (v: string) => void;
}

export const useSeederStore = create<SeederState>((set) => ({
  config: blankConfig(),
  dirty: false,
  uiStartDate: null,
  uiEndDate: null,

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

  setAnomalies: (anomalies) =>
    set((s) => ({
      config: { ...s.config, anomalies },
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
  setActiveSection: (v) => set({ activeSection: v }),
}));
