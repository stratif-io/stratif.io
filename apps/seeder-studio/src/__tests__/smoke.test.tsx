import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";
import * as presetsApi from "@/lib/api/presets";

vi.mock("@/lib/api/presets", () => ({
  fetchPresets: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    vi.mocked(presetsApi.fetchPresets).mockResolvedValue([]);
  });

  it("renders the studio header", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText(/seeder studio/i)).toBeInTheDocument(),
    );
  });
});
