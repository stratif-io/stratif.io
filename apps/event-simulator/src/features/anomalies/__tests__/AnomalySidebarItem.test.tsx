import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnomalySidebarItem } from "../AnomalySidebarItem";

const anomaly = {
  type: "marketing_campaign",
  name: "viral",
  start_date: "2025-01-11",
  end_date: "2025-01-16",
  effect: { arrivals: 4 },
};

describe("AnomalySidebarItem", () => {
  it("renders anomaly name in collapsed header", () => {
    render(
      <AnomalySidebarItem
        anomaly={anomaly}
        open={false}
        onOpenChange={() => {}}
        onChange={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("viral")).toBeInTheDocument();
  });

  it("hides form fields when collapsed", () => {
    render(
      <AnomalySidebarItem
        anomaly={anomaly}
        open={false}
        onOpenChange={() => {}}
        onChange={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
  });

  it("shows form fields when open", () => {
    render(
      <AnomalySidebarItem
        anomaly={anomaly}
        open={true}
        onOpenChange={() => {}}
        onChange={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^start date$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^end date$/i)).toBeInTheDocument();
  });

  it("clicking header calls onOpenChange", () => {
    const onOpenChange = vi.fn();
    render(
      <AnomalySidebarItem
        anomaly={anomaly}
        open={false}
        onOpenChange={onOpenChange}
        onChange={() => {}}
        onDelete={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /viral/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("editing name calls onChange with updated anomaly", () => {
    const onChange = vi.fn();
    render(
      <AnomalySidebarItem
        anomaly={anomaly}
        open={true}
        onOpenChange={() => {}}
        onChange={onChange}
        onDelete={() => {}}
      />,
    );
    const input = screen.getByLabelText(/^name$/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "summer sale" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: "summer sale" }),
    );
  });

  it("delete button calls onDelete", () => {
    const onDelete = vi.fn();
    render(
      <AnomalySidebarItem
        anomaly={anomaly}
        open={true}
        onOpenChange={() => {}}
        onChange={() => {}}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalled();
  });
});
