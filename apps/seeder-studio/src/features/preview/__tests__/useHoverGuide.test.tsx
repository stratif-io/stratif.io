import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHoverGuide } from "../useHoverGuide";

describe("useHoverGuide", () => {
  it("starts null", () => {
    useHoverGuide.setState({ index: null });
    const { result } = renderHook(() => useHoverGuide());
    expect(result.current.index).toBeNull();
  });

  it("setIndex updates", () => {
    useHoverGuide.setState({ index: null });
    const { result } = renderHook(() => useHoverGuide());
    act(() => result.current.setIndex(12));
    expect(useHoverGuide.getState().index).toBe(12);
  });

  it("clear resets to null", () => {
    useHoverGuide.setState({ index: 7 });
    const { result } = renderHook(() => useHoverGuide());
    act(() => result.current.clear());
    expect(useHoverGuide.getState().index).toBeNull();
  });
});
