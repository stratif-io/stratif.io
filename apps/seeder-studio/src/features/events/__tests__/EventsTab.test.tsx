import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventsTab } from "@/features/events/EventsTab";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

describe("EventsTab", () => {
  beforeEach(() => {
    useSeederStore.setState({ config: blankConfig() });
  });

  it("renders preset picker", () => {
    render(<EventsTab />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders event names from store markov config", () => {
    render(<EventsTab />);
    // saas preset has 'SignUp' event
    expect(screen.getAllByText("SignUp").length).toBeGreaterThan(0);
  });

  it("switching preset updates event names", () => {
    render(<EventsTab />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ecommerce" } });
    // ecommerce preset has 'SessionStarted' event
    expect(screen.getAllByText("SessionStarted").length).toBeGreaterThan(0);
  });
});
