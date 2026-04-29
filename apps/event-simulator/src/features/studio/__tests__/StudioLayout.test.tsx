import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StudioLayout } from "../StudioLayout";

vi.mock("@/features/events/EventsTab", () => ({
  EventsTab: () => <div data-testid="events-tab">Events</div>,
}));
vi.mock("../KpiGrid", () => ({
  KpiGrid: () => <div data-testid="kpi-grid">KpiGrid</div>,
}));

describe("StudioLayout", () => {
  it("renders KpiGrid when activeSection is studio", () => {
    render(<StudioLayout activeSection="studio" />);
    expect(screen.getByTestId("kpi-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("events-tab")).not.toBeInTheDocument();
  });

  it("renders EventsTab when activeSection is events", () => {
    render(<StudioLayout activeSection="events" />);
    expect(screen.getByTestId("events-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("kpi-grid")).not.toBeInTheDocument();
  });
});
