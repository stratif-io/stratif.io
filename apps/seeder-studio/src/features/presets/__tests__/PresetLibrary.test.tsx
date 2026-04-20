import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PresetLibrary } from "../PresetLibrary";
import type { PresetEntry } from "@/lib/api/presets";

const sample: PresetEntry[] = [
  {
    name: "saas_pmf",
    description: "B2B SaaS post-PMF",
    domain: "saas",
    config: { name: "saas_pmf", domain: "saas", axes: {} },
  },
  {
    name: "casual_game_viral_blowup",
    description: "TikTok moment",
    domain: "casual_game",
    config: {
      name: "casual_game_viral_blowup",
      domain: "casual_game",
      axes: {},
    },
  },
];

describe("PresetLibrary", () => {
  it("renders every preset by name", () => {
    render(
      <PresetLibrary
        presets={sample}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    expect(screen.getByText("saas_pmf")).toBeInTheDocument();
    expect(screen.getByText("casual_game_viral_blowup")).toBeInTheDocument();
  });

  it('shows "+ New blank" at the top', () => {
    render(
      <PresetLibrary
        presets={sample}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /new blank/i }),
    ).toBeInTheDocument();
  });

  it("filters by search input", async () => {
    const user = userEvent.setup();
    render(
      <PresetLibrary
        presets={sample}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    await user.type(screen.getByRole("searchbox"), "viral");
    expect(screen.queryByText("saas_pmf")).not.toBeInTheDocument();
    expect(screen.getByText("casual_game_viral_blowup")).toBeInTheDocument();
  });

  it("filters by domain chip", async () => {
    const user = userEvent.setup();
    render(
      <PresetLibrary
        presets={sample}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "saas" }));
    expect(screen.getByText("saas_pmf")).toBeInTheDocument();
    expect(
      screen.queryByText("casual_game_viral_blowup"),
    ).not.toBeInTheDocument();
  });

  it("invokes onSelect with the preset name when clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PresetLibrary
        presets={sample}
        selectedName={null}
        onSelect={onSelect}
        onNewBlank={vi.fn()}
      />,
    );
    await user.click(screen.getByText("saas_pmf"));
    expect(onSelect).toHaveBeenCalledWith("saas_pmf");
  });

  it("highlights the selected row", () => {
    render(
      <PresetLibrary
        presets={sample}
        selectedName="saas_pmf"
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    const row = screen.getByText("saas_pmf").closest("[data-selected]");
    expect(row).toHaveAttribute("data-selected", "true");
  });

  it('invokes onNewBlank when "+ New blank" is clicked', async () => {
    const onNewBlank = vi.fn();
    const user = userEvent.setup();
    render(
      <PresetLibrary
        presets={sample}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={onNewBlank}
      />,
    );
    await user.click(screen.getByRole("button", { name: /new blank/i }));
    expect(onNewBlank).toHaveBeenCalled();
  });
});
