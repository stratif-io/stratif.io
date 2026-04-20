import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePresets } from "../usePresets";

vi.mock("@/lib/api/presets", () => ({
  fetchPresets: vi.fn(),
}));

import * as presetsModule from "@/lib/api/presets";

const fetchPresets = presetsModule.fetchPresets as ReturnType<typeof vi.fn>;

describe("usePresets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading, then resolves with the preset list", async () => {
    fetchPresets.mockResolvedValueOnce([
      {
        name: "a",
        domain: "saas",
        config: { name: "a", domain: "saas", axes: {} },
      },
    ]);
    const { result } = renderHook(() => usePresets());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("surfaces an error on fetch failure", async () => {
    fetchPresets.mockRejectedValueOnce(new Error("fetch failed"));
    const { result } = renderHook(() => usePresets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
