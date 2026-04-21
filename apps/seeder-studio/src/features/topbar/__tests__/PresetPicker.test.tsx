import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PresetPicker } from "../PresetPicker";
import type { PresetEntry } from "@/lib/api/presets";

const presets: PresetEntry[] = [
  {
    name: "saas_growth",
    description: "SaaS with strong growth",
    domain: "saas",
    config: {} as never,
  },
  {
    name: "ecommerce_q4",
    description: "E-commerce spike",
    domain: "ecommerce",
    config: {} as never,
  },
];

describe("PresetPicker", () => {
  it("renders the selected preset name", () => {
    render(
      <PresetPicker
        presets={presets}
        selectedName="saas_growth"
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    expect(screen.getByText("saas_growth")).toBeInTheDocument();
  });

  it("shows placeholder when nothing is selected", () => {
    render(
      <PresetPicker
        presets={presets}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    expect(screen.getByText(/new preset/i)).toBeInTheDocument();
  });

  it("opens list on click and shows all presets plus new blank option", async () => {
    const user = userEvent.setup();
    render(
      <PresetPicker
        presets={presets}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /preset/i }));
    expect(screen.getByText("saas_growth")).toBeInTheDocument();
    expect(screen.getByText("ecommerce_q4")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new blank/i }),
    ).toBeInTheDocument();
  });

  it("calls onSelect with the preset name when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PresetPicker
        presets={presets}
        selectedName={null}
        onSelect={onSelect}
        onNewBlank={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /preset/i }));
    await user.click(screen.getByText("saas_growth"));
    expect(onSelect).toHaveBeenCalledWith("saas_growth");
  });

  it("calls onNewBlank when the new blank option is clicked", async () => {
    const user = userEvent.setup();
    const onNewBlank = vi.fn();
    render(
      <PresetPicker
        presets={presets}
        selectedName={null}
        onSelect={vi.fn()}
        onNewBlank={onNewBlank}
      />,
    );
    await user.click(screen.getByRole("button", { name: /preset/i }));
    await user.click(screen.getByRole("button", { name: /new blank/i }));
    expect(onNewBlank).toHaveBeenCalled();
  });
});
