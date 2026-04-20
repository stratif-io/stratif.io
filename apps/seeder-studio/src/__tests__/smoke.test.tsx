import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";

describe("App", () => {
  it("renders the studio header", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /seeder studio/i }),
    ).toBeInTheDocument();
  });
});
