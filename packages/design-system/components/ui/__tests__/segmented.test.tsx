import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Segmented } from "../segmented";

const options = [
  { value: "weak", label: "weak" },
  { value: "strong", label: "strong" },
  { value: "viral", label: "viral" },
];

describe("Segmented", () => {
  it("renders every option", () => {
    render(<Segmented options={options} value="weak" onChange={() => {}} />);
    options.forEach((o) =>
      expect(screen.getByText(o.label)).toBeInTheDocument(),
    );
  });

  it("marks the active option with data-active", () => {
    render(<Segmented options={options} value="strong" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "strong" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("radio", { name: "weak" })).toHaveAttribute(
      "data-active",
      "false",
    );
  });

  it("calls onChange with the clicked option value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Segmented options={options} value="weak" onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "viral" }));
    expect(onChange).toHaveBeenCalledWith("viral");
  });

  it("default option (not selected) has ring-1 class", () => {
    render(
      <Segmented
        options={options}
        value="weak"
        onChange={() => {}}
        defaultValue="strong"
      />,
    );
    expect(screen.getByRole("radio", { name: "strong" })).toHaveClass("ring-1");
  });

  it("selected option does not have ring-1 even if it matches defaultValue", () => {
    render(
      <Segmented
        options={options}
        value="strong"
        onChange={() => {}}
        defaultValue="strong"
      />,
    );
    expect(screen.getByRole("radio", { name: "strong" })).not.toHaveClass(
      "ring-1",
    );
  });

  it("supports an optional tooltip per option", async () => {
    const user = userEvent.setup();
    render(
      <Segmented
        options={[
          { value: "a", label: "A", tooltip: "Alpha" },
          { value: "b", label: "B", tooltip: "Beta" },
        ]}
        value="a"
        onChange={() => {}}
      />,
    );
    await user.hover(screen.getByRole("radio", { name: "A" }));
    expect(
      await screen.findByRole("tooltip", { name: "Alpha" }),
    ).toBeInTheDocument();
  });
});
