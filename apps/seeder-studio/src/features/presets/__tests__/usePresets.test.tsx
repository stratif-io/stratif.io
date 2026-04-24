import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePresets } from "../usePresets";
import type { ReactNode } from "react";

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePresets", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts loading, then resolves with the preset list", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        presets: [
          {
            name: "a",
            domain: "saas",
            config: {
              name: "a",
              axes: {},
              markov: {
                events: [{ name: "PageView" }],
                start: { PageView: 1.0 },
                transitions: { PageView: { "[end]": 1.0 } },
              },
            },
          },
        ],
      }),
    });
    const { result } = renderHook(() => usePresets(), { wrapper: wrapper() });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("surfaces an error on fetch failure", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "err",
      json: async () => ({}),
    });
    const { result } = renderHook(() => usePresets(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
