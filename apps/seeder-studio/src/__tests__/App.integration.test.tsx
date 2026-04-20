import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { useSeederStore } from "../stores/seederStore";

const PRESETS = {
  presets: [
    {
      name: "saas_pmf",
      domain: "saas",
      description: "PMF",
      config: {
        name: "saas_pmf",
        domain: "saas",
        axes: { growth: "strong" },
      },
    },
  ],
};

describe("App shell", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => PRESETS,
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads presets and selecting one populates the YAML panel", async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText("saas_pmf")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("saas_pmf"));
    const panel = screen.getByTestId("yaml-editor");
    expect(panel).toHaveTextContent("name: saas_pmf");
    expect(panel).toHaveTextContent("growth: strong");
  });
});
