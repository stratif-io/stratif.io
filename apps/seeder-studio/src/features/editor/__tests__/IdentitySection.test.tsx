import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentitySection } from "../IdentitySection";
import { useSeederStore } from "@/stores/seederStore";

describe("IdentitySection", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
  });

  it("edits name into the store", async () => {
    const user = userEvent.setup();
    render(<IdentitySection />);
    const input = screen.getByLabelText(/name/i);
    await user.clear(input);
    await user.type(input, "my_preset");
    expect(useSeederStore.getState().config.name).toBe("my_preset");
  });

  it("edits description", async () => {
    const user = userEvent.setup();
    render(<IdentitySection />);
    await user.type(screen.getByLabelText(/description/i), "hello");
    expect(useSeederStore.getState().config.description).toContain("hello");
  });

  it("edits domain via select", async () => {
    const user = userEvent.setup();
    render(<IdentitySection />);
    await user.selectOptions(screen.getByLabelText(/domain/i), "casual_game");
    expect(useSeederStore.getState().config.domain).toBe("casual_game");
  });

  it("flags invalid kebab-case names inline", async () => {
    const user = userEvent.setup();
    render(<IdentitySection />);
    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), "Not Valid!");
    expect(
      screen.getByText(/lowercase letters, digits, and underscores/i),
    ).toBeInTheDocument();
  });
});
