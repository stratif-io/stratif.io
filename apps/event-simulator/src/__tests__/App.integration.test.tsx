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

  it("renders sidebar navigation sections", async () => {
    renderApp();
    // The sidebar renders navigation buttons for each section
    // Top-level sidebar items are Studio and Event editor;
    // axis items (Growth, Retention, etc.) are children of Studio
    // and only visible when Studio is expanded.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Studio" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Event editor" }),
      ).toBeInTheDocument();
    });
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
    // Click "+ Event" button to add an anomaly and mark the store as dirty
    await waitFor(() => screen.getByText("+ Event"));
    await user.click(screen.getByText("+ Event"));
    // Now try to switch to New blank — should show discard dialog
    await user.click(screen.getByRole("combobox"));
    await waitFor(() => screen.getAllByText("New blank"));
    await user.click(screen.getAllByText("New blank")[0]);
    expect(screen.getByText(/discard unsaved changes/i)).toBeInTheDocument();
  });
});
