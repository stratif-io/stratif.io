import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useSeederStore, blankConfig } from "../seederStore";
import type { SimulationConfig } from "@/types/simulation";

const SAMPLE: SimulationConfig = {
  name: "saas_pmf",
  description: "test",
  axes: { growth: "strong" },
  markov: {
    events: [{ name: "PageView", color: "#6366f1" }],
    start: { PageView: 1.0 },
    transitions: { PageView: { "[end]": 1.0 } },
  },
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

  it("setUiStartDate sets the value and does NOT mark dirty", () => {
    useSeederStore.getState().setUiStartDate("2026-01-01");
    const s = useSeederStore.getState();
    expect(s.uiStartDate).toBe("2026-01-01");
    expect(s.dirty).toBe(false);
  });

  it("setUiEndDate sets the value and does NOT mark dirty", () => {
    useSeederStore.getState().setUiEndDate("2026-12-31");
    const s = useSeederStore.getState();
    expect(s.uiEndDate).toBe("2026-12-31");
    expect(s.dirty).toBe(false);
  });
});

describe("seederStore — studioExpanded", () => {
  beforeEach(() => {
    act(() => {
      useSeederStore.setState({
        studioExpanded: true,
        activeSection: "studio",
      });
    });
  });

  it("studioExpanded defaults to true", () => {
    expect(useSeederStore.getState().studioExpanded).toBe(true);
  });

  it("setActiveSection('events') sets studioExpanded=false", () => {
    act(() => {
      useSeederStore.getState().setActiveSection("events");
    });
    expect(useSeederStore.getState().studioExpanded).toBe(false);
  });

  it("setActiveSection('studio') sets studioExpanded=true", () => {
    act(() => {
      useSeederStore.setState({ studioExpanded: false });
      useSeederStore.getState().setActiveSection("studio");
    });
    expect(useSeederStore.getState().studioExpanded).toBe(true);
  });

  it("setStudioExpanded toggles independently without changing activeSection", () => {
    act(() => {
      useSeederStore.getState().setStudioExpanded(false);
    });
    expect(useSeederStore.getState().studioExpanded).toBe(false);
    expect(useSeederStore.getState().activeSection).toBe("studio");
  });
});
