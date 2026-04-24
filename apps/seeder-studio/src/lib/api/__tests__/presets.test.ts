import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { fetchPresets } from "../presets";

describe("fetchPresets", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs /api/simulator/presets and returns the parsed list", async () => {
    const body = {
      presets: [
        {
          name: "a",
          domain: "saas",
          config: { name: "a", domain: "saas", axes: {} },
        },
      ],
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => body,
    });
    const presets = await fetchPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].config.name).toBe("a");
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/simulator/presets");
  });

  it("throws when the response is not ok", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server error",
      json: async () => ({}),
    });
    await expect(fetchPresets()).rejects.toThrow(/500/);
  });

  it("throws when a preset fails schema validation", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ presets: [{ name: "bad" }] }),
    });
    await expect(fetchPresets()).rejects.toThrow();
  });
});
