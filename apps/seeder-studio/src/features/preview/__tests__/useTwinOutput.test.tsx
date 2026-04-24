import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTwinOutput } from "../useTwinOutput";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

describe("useTwinOutput", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
  });

  it("returns twin output whose length matches the config window", () => {
    useSeederStore.getState().loadPreset({
      ...blankConfig(),
      axes: { scale: "small" },
    });
    const { result } = renderHook(() => useTwinOutput());
    expect(result.current.days).toBe(90);
    expect(result.current.events).toHaveLength(90);
  });

  it("recomputes when the store changes", () => {
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
    const { result } = renderHook(() => useTwinOutput());
    const firstSum = result.current.events.reduce((a, b) => a + b, 0);
    act(() => useSeederStore.getState().setAxis("engagement_depth", "deep"));
    const secondSum = result.current.events.reduce((a, b) => a + b, 0);
    expect(secondSum).toBeGreaterThan(firstSum);
  });
});
