import { create } from "zustand";
import type { SimulationConfig } from "@/types/simulation";

export function blankConfig(): SimulationConfig {
  return {
    name: "new_preset",
    description: "",
    axes: {},
    markov: {
      events: [{ name: "PageView" }],
      start: { PageView: 1.0 },
      transitions: { PageView: { "[end]": 1.0 } },
    },
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
  setScaleConfig: (scaleConfig: SimulationConfig["scale_config"]) => void;
  setGrowthConfig: (growthConfig: SimulationConfig["growth_config"]) => void;
  setAnomalies: (anomalies: SimulationConfig["anomalies"]) => void;
  setUiStartDate: (iso: string | null) => void;
  setUiEndDate: (iso: string | null) => void;
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
}));
