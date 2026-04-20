import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TuningSection } from "../TuningSection";
import { useSeederStore } from "@/stores/seederStore";

describe("TuningSection", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
  });

  it("collapsed by default, expands on click", async () => {
    const user = userEvent.setup();
    render(<TuningSection />);
    expect(screen.queryByLabelText(/total users/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /tuning/i }));
    expect(screen.getByLabelText(/total users/i)).toBeInTheDocument();
  });

  it("edits scale_config.total_users", async () => {
    const user = userEvent.setup();
    render(<TuningSection />);
    await user.click(screen.getByRole("button", { name: /tuning/i }));
    await user.clear(screen.getByLabelText(/total users/i));
    await user.type(screen.getByLabelText(/total users/i), "12345");
    expect(useSeederStore.getState().config.scale_config?.total_users).toBe(
      12345,
    );
  });

  it("edits growth_config.rate", async () => {
    const user = userEvent.setup();
    render(<TuningSection />);
    await user.click(screen.getByRole("button", { name: /tuning/i }));
    await user.clear(screen.getByLabelText(/growth rate/i));
    await user.type(screen.getByLabelText(/growth rate/i), "0.05");
    expect(useSeederStore.getState().config.growth_config?.rate).toBeCloseTo(
      0.05,
    );
  });
});
