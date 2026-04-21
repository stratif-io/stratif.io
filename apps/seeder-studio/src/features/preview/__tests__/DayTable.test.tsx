import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DayTable } from "../DayTable";

const mkOut = (n: number) => ({
  days: n,
  events: Array.from({ length: n }, (_, i) => (i + 1) * 100),
  activeUsers: Array.from({ length: n }, (_, i) => (i + 1) * 50),
  newUsers: Array.from({ length: n }, (_, i) => (i + 1) * 10),
  totalUsers: Array.from({ length: n }, (_, i) => (i + 1) * 10),
  stickiness: Array.from({ length: n }, () => 0.5),
});

describe("DayTable", () => {
  it("renders column headers", () => {
    render(<DayTable out={mkOut(5)} />);
    expect(screen.getByText(/day/i)).toBeInTheDocument();
    expect(screen.getByText(/new users/i)).toBeInTheDocument();
    expect(screen.getByText(/active users/i)).toBeInTheDocument();
    expect(screen.getByText(/events/i)).toBeInTheDocument();
  });

  it("shows first 7 days by default", () => {
    render(<DayTable out={mkOut(30)} />);
    const rows = screen.getAllByRole("row");
    // 1 header + 7 data rows
    expect(rows).toHaveLength(8);
  });

  it("shows all days when total < 7", () => {
    render(<DayTable out={mkOut(3)} />);
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(4); // 1 header + 3
  });

  it("shows day numbers starting at 1", () => {
    render(<DayTable out={mkOut(5)} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders events value for day 1", () => {
    render(<DayTable out={mkOut(5)} />);
    // day 1 events = 100
    expect(screen.getByTestId("cell-events-0")).toHaveTextContent("100");
  });
});
