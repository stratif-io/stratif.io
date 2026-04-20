import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { YamlPanel } from "../YamlPanel";

const validYaml = `name: x
domain: saas
axes:
  growth: strong
`;

describe("YamlPanel", () => {
  it("renders the initial YAML", () => {
    render(<YamlPanel yaml={validYaml} onValidConfig={vi.fn()} />);
    expect(screen.getByTestId("yaml-editor")).toHaveTextContent("name: x");
  });

  it("calls onValidConfig when the user edits to valid YAML", async () => {
    const onValidConfig = vi.fn();
    const user = userEvent.setup();
    render(<YamlPanel yaml="" onValidConfig={onValidConfig} debounceMs={0} />);
    await user.type(screen.getByTestId("yaml-textarea"), validYaml);
    expect(onValidConfig).toHaveBeenCalled();
    const last = onValidConfig.mock.calls.at(-1)?.[0];
    expect(last).toMatchObject({
      name: "x",
      domain: "saas",
      axes: { growth: "strong" },
    });
  });

  it("shows a parse error and leaves onValidConfig unchanged", async () => {
    const onValidConfig = vi.fn();
    const user = userEvent.setup();
    render(<YamlPanel yaml="" onValidConfig={onValidConfig} debounceMs={0} />);
    await user.type(
      screen.getByTestId("yaml-textarea"),
      "name: {[}unclosed{Enter}",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/error/i);
    expect(onValidConfig).not.toHaveBeenCalled();
  });

  it("has a Copy button that writes to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeText);
    const user = userEvent.setup();
    render(<YamlPanel yaml={validYaml} onValidConfig={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith(validYaml);
    vi.restoreAllMocks();
  });
});
