import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTwinOutput } from "../useTwinOutput";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

const mockPreviewResult = {
  days: Array.from({ length: 90 }, (_, i) => i),
  new_users: Array(90).fill(10),
  active_users: Array(90).fill(8),
  churned: Array(90).fill(2),
  reactivated: Array(90).fill(1),
  events: Array(90).fill(40),
  stickiness: Array(90).fill(0.5),
};

describe("useTwinOutput", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPreviewResult),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns mapped twin output after fetch resolves", async () => {
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
    const { result } = renderHook(() => useTwinOutput());
    await waitFor(() => expect(result.current.days).toBe(90));
    expect(result.current.events).toHaveLength(90);
  });

  it("calls the simulate endpoint with the current config", async () => {
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
    renderHook(() => useTwinOutput());
    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/simulate"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("isLoading is true immediately after config changes and false after simulation resolves", async () => {
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
    const { result } = renderHook(() => useTwinOutput());

    // isLoading should be true immediately (before debounce fires)
    expect(result.current.isLoading).toBe(true);

    // Wait for debounce (300ms) + fetch to resolve
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 2000,
    });
  });
});
