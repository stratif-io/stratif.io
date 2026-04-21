import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { PreviewGrid } from "../PreviewGrid";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

describe("PreviewGrid syncId", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
  });

  it("renders the grid canvas without hover guide machinery", () => {
    const { getByTestId } = render(<PreviewGrid />);
    const canvas = getByTestId("preview-grid-canvas");
    expect(canvas).not.toBeNull();
    // No onPointerMove handler — syncId on LineChart handles cross-chart sync
    expect(canvas.onpointermove).toBeNull();
  });
});
