import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavePanel } from "../SavePanel";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

beforeEach(() => {
  useSeederStore.setState({
    config: {
      ...blankConfig(),
      name: "my-preset",
      description: "A test preset",
    },
    dirty: false,
    uiStartDate: null,
    uiEndDate: null,
  });
});

describe("SavePanel", () => {
  it("renders the name from the store", () => {
    render(<SavePanel yaml="name: my-preset" />);
    const input = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(input.value).toBe("my-preset");
  });

  it("renders the description from the store", () => {
    render(<SavePanel yaml="name: my-preset" />);
    const textarea = screen.getByLabelText(
      /description/i,
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("A test preset");
  });

  it("calls setName when name input changes", async () => {
    const user = userEvent.setup();
    render(<SavePanel yaml="name: my-preset" />);
    const input = screen.getByLabelText(/name/i);
    await user.clear(input);
    await user.type(input, "new-name");
    expect(useSeederStore.getState().config.name).toBe("new-name");
  });

  it("calls setDescription when description textarea changes", async () => {
    const user = userEvent.setup();
    render(<SavePanel yaml="name: my-preset" />);
    const textarea = screen.getByLabelText(/description/i);
    await user.clear(textarea);
    await user.type(textarea, "new description");
    expect(useSeederStore.getState().config.description).toBe(
      "new description",
    );
  });

  it("renders the yaml prop in the pre block", () => {
    render(<SavePanel yaml="name: foo" />);
    expect(screen.getByText("name: foo")).toBeInTheDocument();
  });

  it("shows '✓ Copied' temporarily after clicking Copy YAML", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    render(<SavePanel yaml="some: yaml" />);
    const btn = screen.getByRole("button", { name: /copy yaml/i });
    await user.click(btn);
    expect(writeText).toHaveBeenCalledWith("some: yaml");
    expect(screen.getByText("✓ Copied")).toBeInTheDocument();
  });
});
