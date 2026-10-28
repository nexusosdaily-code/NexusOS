import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import LearnPage from "../pages/learn";

vi.mock("@/hooks/use-page-meta", () => ({ usePageMeta: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

afterEach(cleanup);

describe("Python pipeline failure diagnostics", () => {
  it.each([
    ["1 // 0", "Division by zero", "btn-run-all"],
    ["missing", "Undefined or uninitialised variable: missing", "btn-execute"],
  ])("shows partial output without success for %s", async (expression, message, button) => {
    render(<LearnPage />);
    fireEvent.change(screen.getByTestId("code-input"), {
      target: { value: `print("first")\nprint("second")\nx = ${expression}\nprint("never")` },
    });
    await waitFor(() => expect(screen.getByTestId("btn-run-all")).toBeEnabled());
    if (button === "btn-execute") {
      fireEvent.click(screen.getByTestId("btn-compile"));
      await waitFor(() => expect(screen.getByTestId(button)).toBeEnabled());
    }
    fireEvent.click(screen.getByTestId(button));
    expect(screen.getByTestId("pipeline-error")).toHaveTextContent(`Line 3: ${message}`);
    expect(screen.getByTestId("python-output").textContent?.trim()).toBe("first\nsecond");
    expect(screen.getByText(/Partial output before failure/)).toBeInTheDocument();
    expect(screen.getByText(/STOPPED \(partial trace\)/)).toBeInTheDocument();
    expect(screen.queryByText(/wavefunction collapsed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Program output ·/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId("code-input"), { target: { value: 'print("fresh")' } });
    expect(screen.queryByTestId("python-output")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pipeline-error")).not.toBeInTheDocument();
    expect(screen.queryByText(/STOPPED \(partial trace\)/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("btn-run-all")).toBeEnabled());
    fireEvent.click(screen.getByTestId("btn-run-all"));
    expect(screen.getByTestId("python-output")).toHaveTextContent("fresh");
    expect(screen.getByText(/Program output ·/)).toBeInTheDocument();
    expect(screen.queryByTestId("pipeline-error")).not.toBeInTheDocument();
  });
});
