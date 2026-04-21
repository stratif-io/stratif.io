import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PresetSidebar } from "../PresetSidebar";

const PRESETS = [
  { name: "saas-growth", description: "SaaS growth scenario" },
  { name: "e-commerce", description: "E-commerce scenario" },
];

describe("PresetSidebar", () => {
  it("renders collapsed by default and hides preset list", () => {
    render(
      <PresetSidebar
        presets={PRESETS}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    expect(screen.queryByText("saas-growth")).not.toBeInTheDocument();
  });

  it("expand toggle has aria-label 'expand presets' when collapsed", () => {
    render(
      <PresetSidebar
        presets={PRESETS}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /expand presets/i }),
    ).toBeInTheDocument();
  });

  it("shows preset list after clicking expand toggle", async () => {
    const user = userEvent.setup();
    render(
      <PresetSidebar
        presets={PRESETS}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /expand presets/i }));
    expect(screen.getByText("saas-growth")).toBeInTheDocument();
  });

  it("calls onSelect with preset name when a preset is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PresetSidebar
        presets={PRESETS}
        selectedName={null}
        onSelect={onSelect}
        onNewBlank={vi.fn()}
        defaultOpen={true}
      />,
    );
    await user.click(screen.getByText("saas-growth"));
    expect(onSelect).toHaveBeenCalledWith("saas-growth");
  });

  it("calls onNewBlank when '+ New blank' is clicked", async () => {
    const user = userEvent.setup();
    const onNewBlank = vi.fn();
    render(
      <PresetSidebar
        presets={PRESETS}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={onNewBlank}
        defaultOpen={true}
      />,
    );
    await user.click(screen.getByRole("button", { name: /new blank/i }));
    expect(onNewBlank).toHaveBeenCalled();
  });

  it("collapse toggle has aria-label 'collapse presets' when expanded", async () => {
    const user = userEvent.setup();
    render(
      <PresetSidebar
        presets={PRESETS}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /expand presets/i }));
    expect(
      screen.getByRole("button", { name: /collapse presets/i }),
    ).toBeInTheDocument();
  });
});
