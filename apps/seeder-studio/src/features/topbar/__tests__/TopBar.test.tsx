import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "../TopBar";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

beforeEach(() => {
  useSeederStore.setState({
    config: blankConfig(),
    dirty: false,
    uiStartDate: null,
    uiEndDate: null,
  });
});

describe("TopBar", () => {
  it("renders the app title", () => {
    render(<TopBar onSave={vi.fn()} />);
    expect(screen.getByText("Seeder Studio")).toBeInTheDocument();
  });

  it("renders start and end date inputs", () => {
    render(<TopBar onSave={vi.fn()} />);
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it("renders total users input", () => {
    render(<TopBar onSave={vi.fn()} />);
    expect(screen.getByLabelText(/total users/i)).toBeInTheDocument();
  });

  it("updates uiStartDate in store when start date changes", async () => {
    const user = userEvent.setup();
    render(<TopBar onSave={vi.fn()} />);
    const input = screen.getByLabelText(/start date/i);
    await user.clear(input);
    await user.type(input, "2024-01-01");
    expect(useSeederStore.getState().uiStartDate).toBe("2024-01-01");
  });

  it("computes window_days when both dates are set", async () => {
    const user = userEvent.setup();
    render(<TopBar onSave={vi.fn()} />);
    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);
    await user.clear(startInput);
    await user.type(startInput, "2024-01-01");
    await user.clear(endInput);
    await user.type(endInput, "2024-04-10");
    const { window_days } = useSeederStore.getState().config.scale_config ?? {};
    expect(window_days).toBeGreaterThan(0);
  });

  it("calls onSave when Save preset button is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<TopBar onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: /save preset/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it("header element has h-14 class for correct height", () => {
    const { container } = render(<TopBar onSave={vi.fn()} />);
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header).toHaveClass("h-14");
  });
});
