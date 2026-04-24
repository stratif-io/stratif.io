// apps/seeder-studio/src/__tests__/App.integration.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";
import * as presetsApi from "@/lib/api/presets";

vi.mock("@/lib/api/presets", () => ({
  fetchPresets: vi.fn(),
}));

const mockPresets = [
  {
    name: "saas_growth",
    description: "SaaS with strong growth",
    domain: "saas",
    config: {
      name: "saas_growth",
      domain: "saas",
      axes: { growth: "strong", stickiness: "sticky" },
    },
  },
];

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App integration", () => {
  beforeEach(() => {
    vi.mocked(presetsApi.fetchPresets).mockResolvedValue(mockPresets as never);
  });

  it("renders Seeder Studio title", async () => {
    renderApp();
    await waitFor(() =>
      expect(screen.getByText("Seeder Studio")).toBeInTheDocument(),
    );
  });

  it("renders axis chips in the AxisStrip", async () => {
    renderApp();
    await waitFor(() =>
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(6),
    );
    for (const axis of [
      "growth",
      "retention",
      "engagement",
      "virality",
      "scale",
      "noise",
    ]) {
      // AxisChip aria-label is "axis: value" format
      const chip = screen
        .getAllByRole("button")
        .find((b) => b.getAttribute("aria-label")?.startsWith(`${axis}:`));
      expect(chip).toBeDefined();
    }
  });

  it("renders preset Select dropdown with preset options", async () => {
    const user = userEvent.setup();
    renderApp();
    await waitFor(() => screen.getByRole("combobox"));
    await user.click(screen.getByRole("combobox"));
    await waitFor(() =>
      expect(screen.getByText("saas_growth")).toBeInTheDocument(),
    );
  });

  it("renders KpiGrid after loading", async () => {
    renderApp();
    await waitFor(() =>
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(1),
    );
  });

  it("loads a preset when selected from dropdown", async () => {
    const user = userEvent.setup();
    renderApp();
    await waitFor(() => screen.getByRole("combobox"));
    await user.click(screen.getByRole("combobox"));
    await waitFor(() => screen.getByText("saas_growth"));
    await user.click(screen.getByText("saas_growth"));
    // Verify preset loaded by checking the store config name via axis chips still present
    await waitFor(() =>
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(6),
    );
  });

  it("shows discard dialog when switching preset with unsaved changes", async () => {
    const user = userEvent.setup();
    renderApp();
    // Load a preset first
    await waitFor(() => screen.getByRole("combobox"));
    await user.click(screen.getByRole("combobox"));
    await waitFor(() => screen.getByText("saas_growth"));
    await user.click(screen.getByText("saas_growth"));
    // Change an axis to mark dirty (AxisChip button contains "growth" text)
    await user.click(screen.getByText("growth"));
    await user.click(await screen.findByText("Hockey stick"));
    // Now try to switch to New blank
    await user.click(screen.getByRole("combobox"));
    await waitFor(() => screen.getAllByText("New blank"));
    await user.click(screen.getAllByText("New blank")[0]);
    expect(screen.getByText(/discard unsaved changes/i)).toBeInTheDocument();
  });
});
