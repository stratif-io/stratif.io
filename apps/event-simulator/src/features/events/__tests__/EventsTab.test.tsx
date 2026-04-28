import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    // dating preset has 'ProfileViewed' event
    expect(screen.getAllByText("ProfileViewed").length).toBeGreaterThan(0);
  });

  it("switching preset updates event names", async () => {
    const user = userEvent.setup();
    render(<EventsTab />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("🛒 E-commerce"));
    // ecommerce preset has 'SessionStarted' event
    expect(screen.getAllByText("SessionStarted").length).toBeGreaterThan(0);
  });
});
