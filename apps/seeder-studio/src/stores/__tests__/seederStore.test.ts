import { describe, it, expect, beforeEach } from "vitest";
import { useSeederStore, blankConfig } from "../seederStore";
import type { SimulationConfig } from "@/types/simulation";

const SAMPLE: SimulationConfig = {
  name: "saas_pmf",
  description: "test",
  domain: "saas",
  axes: { growth: "strong" },
};

describe("seederStore", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
  });

  it("starts with a blank config and clean dirty state", () => {
    const s = useSeederStore.getState();
    expect(s.config).toEqual(blankConfig());
    expect(s.dirty).toBe(false);
  });

  it("replaces the whole config via loadPreset and clears dirty", () => {
    useSeederStore.getState().loadPreset(SAMPLE);
    expect(useSeederStore.getState().config).toEqual(SAMPLE);
    expect(useSeederStore.getState().dirty).toBe(false);
  });

  it("setAxis updates one axis value and marks dirty", () => {
    useSeederStore.getState().loadPreset(SAMPLE);
    useSeederStore.getState().setAxis("growth", "hockey_stick");
    const s = useSeederStore.getState();
    expect(s.config.axes.growth).toBe("hockey_stick");
    expect(s.dirty).toBe(true);
  });

  it("setName updates name and marks dirty", () => {
    useSeederStore.getState().setName("custom");
    expect(useSeederStore.getState().config.name).toBe("custom");
    expect(useSeederStore.getState().dirty).toBe(true);
  });

  it("setConfig replaces the whole config and keeps dirty=true", () => {
    useSeederStore.getState().setConfig({ ...SAMPLE, name: "other" });
    const s = useSeederStore.getState();
    expect(s.config.name).toBe("other");
    expect(s.dirty).toBe(true);
  });
});
