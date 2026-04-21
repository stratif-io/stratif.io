import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaveModal } from "../SaveModal";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

describe("SaveModal", () => {
  const baseProps = {
    open: true,
    yaml: "name: my_preset\ndomain: saas\n",
    onClose: vi.fn(),
  };

  beforeEach(() => {
    useSeederStore.setState({
      config: { ...blankConfig(), name: "" },
      dirty: false,
    });
  });

  it("renders name and description fields", () => {
    render(<SaveModal {...baseProps} />);
    expect(screen.getByLabelText(/preset name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it("renders the yaml in a read-only element", () => {
    render(<SaveModal {...baseProps} />);
    expect(screen.getByText(/name: my_preset/)).toBeInTheDocument();
    // The YAML block is not an editable textarea
    expect(
      screen.queryByRole("textbox", { name: /yaml/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a copy button", () => {
    render(<SaveModal {...baseProps} />);
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("renders copy button with correct aria-label", () => {
    render(<SaveModal {...baseProps} />);
    const copyBtn = screen.getByRole("button", { name: /copy/i });
    expect(copyBtn).toHaveAttribute("aria-label", "copy");
  });

  it("does not render when open is false", () => {
    render(<SaveModal {...baseProps} open={false} />);
    expect(screen.queryByLabelText(/preset name/i)).not.toBeInTheDocument();
  });

  it("calls onClose when cancel/close is triggered", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SaveModal {...baseProps} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls navigator.clipboard.writeText with yaml when copy is clicked", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText");
    render(<SaveModal {...baseProps} />);
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeTextSpy).toHaveBeenCalledWith(baseProps.yaml);
    writeTextSpy.mockRestore();
  });

  it("reflects config.name from store in the name input", () => {
    useSeederStore.setState({
      config: { ...blankConfig(), name: "test_preset" },
      dirty: false,
    });
    render(<SaveModal {...baseProps} />);
    expect(screen.getByLabelText(/preset name/i)).toHaveValue("test_preset");
  });
});
