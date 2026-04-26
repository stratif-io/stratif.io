import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryError } from "../query-error";

describe("QueryError", () => {
  it("renders the underlying error message for generic errors", () => {
    render(<QueryError error={new Error("Boom")} />);
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });

  it("renders a timeout-specific message when a DOMException TimeoutError is passed", () => {
    // Matches the error thrown by fetchWithSemaphore on semaphore timeout.
    const err = new DOMException("Query timeout", "TimeoutError");
    render(<QueryError error={err} timeoutSeconds={10} onRetry={() => {}} />);
    expect(screen.getByText(/Query timed out after 10s/i)).toBeInTheDocument();
    expect(screen.getByText(/click to retry/i)).toBeInTheDocument();
  });

  it("treats AbortError as a timeout too", () => {
    const err = new DOMException("aborted", "AbortError");
    render(<QueryError error={err} timeoutSeconds={5} />);
    expect(screen.getByText(/Query timed out after 5s/i)).toBeInTheDocument();
  });

  it("invokes onRetry when the retry button is clicked", () => {
    const onRetry = vi.fn();
    render(
      <QueryError
        error={new DOMException("Query timeout", "TimeoutError")}
        timeoutSeconds={10}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("returns null when no error is provided", () => {
    const { container } = render(<QueryError error={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
