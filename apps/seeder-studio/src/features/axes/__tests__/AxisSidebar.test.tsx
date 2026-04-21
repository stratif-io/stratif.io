import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxisSidebar } from "../AxisSidebar";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

beforeEach(() => {
  useSeederStore.setState({ config: blankConfig(), dirty: false });
});

describe("AxisSidebar", () => {
  it("renders expanded by default with axis dropdowns visible", () => {
    render(<AxisSidebar />);
    expect(screen.getByText("growth")).toBeInTheDocument();
  });

  it("collapse toggle button has aria-label 'collapse axes' when expanded", () => {
    render(<AxisSidebar />);
    expect(
      screen.getByRole("button", { name: /collapse axes/i }),
    ).toBeInTheDocument();
  });

  it("hides axis content after clicking the collapse toggle", async () => {
    const user = userEvent.setup();
    render(<AxisSidebar />);
    await user.click(screen.getByRole("button", { name: /collapse axes/i }));
    expect(screen.queryByText("growth")).not.toBeInTheDocument();
  });

  it("toggle button aria-label changes to 'expand axes' when collapsed", async () => {
    const user = userEvent.setup();
    render(<AxisSidebar />);
    await user.click(screen.getByRole("button", { name: /collapse axes/i }));
    expect(
      screen.getByRole("button", { name: /expand axes/i }),
    ).toBeInTheDocument();
  });

  it("re-expands and shows axis content when toggle is clicked again", async () => {
    const user = userEvent.setup();
    render(<AxisSidebar />);
    await user.click(screen.getByRole("button", { name: /collapse axes/i }));
    await user.click(screen.getByRole("button", { name: /expand axes/i }));
    expect(screen.getByText("growth")).toBeInTheDocument();
  });

  it("renders anomaly add buttons in the sidebar", () => {
    render(<AxisSidebar />);
    expect(
      screen.getAllByRole("button", { name: /^\+ /i }).length,
    ).toBeGreaterThan(0);
  });

  it("clicking an anomaly add button adds an anomaly to the store", async () => {
    const user = userEvent.setup();
    render(<AxisSidebar />);
    await user.click(screen.getAllByRole("button", { name: /^\+ /i })[0]);
    expect(
      (useSeederStore.getState().config.anomalies ?? []).length,
    ).toBeGreaterThan(0);
  });

  it("renders collapsed when defaultOpen is false, hiding axis content", () => {
    render(<AxisSidebar defaultOpen={false} />);
    expect(screen.queryByText("growth")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand axes/i }),
    ).toBeInTheDocument();
  });
});
