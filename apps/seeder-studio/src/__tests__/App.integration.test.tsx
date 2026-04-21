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
    vi.mocked(presetsApi.fetchPresets).mockResolvedValue(mockPresets);
  });

  it("renders Seeder Studio title", async () => {
    renderApp();
    await waitFor(() =>
      expect(screen.getByText("Seeder Studio")).toBeInTheDocument(),
    );
  });

  it("renders 6 axis chips in the axis strip", async () => {
    renderApp();
    await waitFor(() =>
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(6),
    );
    for (const label of [
      "growth",
      "retention",
      "engagement",
      "virality",
      "scale",
      "noise",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("renders Save preset button", async () => {
    renderApp();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /save preset/i }),
      ).toBeInTheDocument(),
    );
  });

  it("opens save modal when Save preset is clicked", async () => {
    const user = userEvent.setup();
    renderApp();
    await waitFor(() => screen.getByRole("button", { name: /save preset/i }));
    await user.click(screen.getByRole("button", { name: /save preset/i }));
    expect(screen.getByLabelText(/preset name/i)).toBeInTheDocument();
  });

  it("shows preset picker dropdown and loads a preset", async () => {
    const user = userEvent.setup();
    renderApp();
    await waitFor(() => screen.getByRole("button", { name: "preset" }));
    await user.click(screen.getByRole("button", { name: "preset" }));
    await user.click(screen.getByText("saas_growth"));
    expect(screen.getByText("saas_growth")).toBeInTheDocument();
  });

  it("shows discard dialog when switching preset with unsaved changes", async () => {
    const user = userEvent.setup();
    renderApp();
    await waitFor(() => screen.getByRole("button", { name: "preset" }));
    // Load a preset first
    await user.click(screen.getByRole("button", { name: "preset" }));
    await user.click(screen.getByText("saas_growth"));
    // Change an axis to mark dirty
    await user.click(screen.getByRole("button", { name: "growth" }));
    await user.click(screen.getByRole("option", { name: /Hockey stick/i }));
    // Now try to switch preset
    await user.click(screen.getByRole("button", { name: "preset" }));
    await user.click(screen.getAllByText("saas_growth").at(-1)!);
    expect(screen.getByText(/discard unsaved changes/i)).toBeInTheDocument();
  });
});
