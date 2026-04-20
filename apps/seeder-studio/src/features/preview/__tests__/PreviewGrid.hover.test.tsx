import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreviewGrid } from "../PreviewGrid";
import { useSeederStore, blankConfig } from "@/stores/seederStore";
import { useHoverGuide } from "../useHoverGuide";

describe("PreviewGrid hover guide", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useHoverGuide.setState({ index: null });
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
  });

  it("pointer move sets the guide index", () => {
    render(<PreviewGrid />);
    const canvas = screen.getByTestId("preview-grid-canvas");
    fireEvent.pointerMove(canvas, { clientX: 50 });
    expect(useHoverGuide.getState().index).not.toBeNull();
  });

  it("pointer leave clears the index", () => {
    useHoverGuide.setState({ index: 5 });
    render(<PreviewGrid />);
    const canvas = screen.getByTestId("preview-grid-canvas");
    fireEvent.pointerLeave(canvas);
    expect(useHoverGuide.getState().index).toBeNull();
  });
});
