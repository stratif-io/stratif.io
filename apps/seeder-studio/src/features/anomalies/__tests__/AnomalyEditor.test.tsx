import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnomalyEditor } from "../AnomalyEditor";

const a = {
  type: "marketing_campaign",
  name: "viral",
  start: "10d",
  duration: "5d",
  effect: { arrivals: 4 },
};

describe("AnomalyEditor", () => {
  it("edits name and fires onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AnomalyEditor
        anomaly={a}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), "boom");
    expect(onChange.mock.calls.at(-1)![0].name).toBe("boom");
  });

  it("edits arrivals effect", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AnomalyEditor
        anomaly={a}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    const arrivals = screen.getByLabelText(/arrivals ×/i);
    await user.clear(arrivals);
    await user.type(arrivals, "8");
    expect(onChange.mock.calls.at(-1)![0].effect.arrivals).toBe(8);
  });

  it("changing type resets effect fields to the new type defaults", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AnomalyEditor
        anomaly={a}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: /type/i }));
    await user.click(await screen.findByRole("option", { name: /^outage$/i }));
    const last = onChange.mock.calls.at(-1)![0];
    expect(last.type).toBe("outage");
    expect(last.effect.arrivals).toBe(0.2);
  });

  it("delete button fires onDelete", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <AnomalyEditor
        anomaly={a}
        onChange={() => {}}
        onDelete={onDelete}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalled();
  });
});
