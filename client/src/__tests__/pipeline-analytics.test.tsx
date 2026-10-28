import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import LearnPage from "../pages/learn";

vi.mock("@/hooks/use-page-meta", () => ({ usePageMeta: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const track = vi.fn();
const metadata = { surface: "ce_se_pipeline", language: "python", mode: "python_vm" };

beforeEach(() => {
  track.mockReset();
  window.umami = { track };
});
afterEach(() => {
  cleanup();
  delete window.umami;
});

async function prepare(source: string) {
  render(<LearnPage />);
  fireEvent.change(screen.getByTestId("code-input"), { target: { value: source } });
  await waitFor(() => expect(screen.getByTestId("btn-run-all")).toBeEnabled());
}

describe("pipeline analytics", () => {
  it("does not count automatic translation as engagement; records compile and execution separately", async () => {
    await prepare('print("PRIVATE_OUTPUT@example.invalid")');
    expect(track).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("btn-compile"));
    expect(track).toHaveBeenCalledExactlyOnceWith("pipeline_stage_result", {
      ...metadata, stage: "compile", outcome: "success",
    });
    fireEvent.click(screen.getByTestId("btn-execute"));
    expect(track).toHaveBeenLastCalledWith("pipeline_stage_result", {
      ...metadata, stage: "execute", outcome: "success",
    });
    expect(track).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(track.mock.calls)).not.toContain("PRIVATE_OUTPUT");
  });

  it("records run-all compile success and VM failure, never a false execution success or error content", async () => {
    await prepare('print("PRIVATE_OUTPUT")\nx = private_missing_variable');
    fireEvent.click(screen.getByTestId("btn-run-all"));
    expect(track.mock.calls).toEqual([
      ["pipeline_stage_result", { ...metadata, stage: "compile", outcome: "success" }],
      ["pipeline_stage_result", { ...metadata, stage: "execute", outcome: "failure" }],
    ]);
    expect(screen.getByTestId("pipeline-error")).toHaveTextContent("private_missing_variable");
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/PRIVATE_OUTPUT|private_missing_variable/);
  });

  it("records successful run-all once per stage", async () => {
    await prepare("print(2 + 3)");
    fireEvent.click(screen.getByTestId("btn-run-all"));
    expect(track.mock.calls).toEqual([
      ["pipeline_stage_result", { ...metadata, stage: "compile", outcome: "success" }],
      ["pipeline_stage_result", { ...metadata, stage: "execute", outcome: "success" }],
    ]);
    expect(screen.getByTestId("python-output")).toHaveTextContent("5");
  });

  it("keeps the pipeline working when the tracker throws", async () => {
    track.mockImplementation(() => { throw new Error("offline"); });
    await prepare("print(42)");
    fireEvent.click(screen.getByTestId("btn-run-all"));
    expect(screen.getByTestId("python-output")).toHaveTextContent("42");
    track.mockReset();
  });

  it("records language choice and labels other languages as previews, not Python execution", async () => {
    render(<LearnPage />);
    fireEvent.click(screen.getByTestId("lang-javascript"));
    fireEvent.change(screen.getByTestId("code-input"), { target: { value: "const value = 5;" } });
    await waitFor(() => expect(screen.getByTestId("btn-run-all")).toBeEnabled());
    expect(track).toHaveBeenCalledExactlyOnceWith("pipeline_language_selected", {
      surface: "ce_se_pipeline", language: "javascript",
    });
    fireEvent.click(screen.getByTestId("btn-run-all"));
    await waitFor(() => expect(track).toHaveBeenLastCalledWith("pipeline_stage_result", {
      surface: "ce_se_pipeline", language: "javascript", mode: "encoding_preview",
      stage: "execute", outcome: "success",
    }), { timeout: 3000 });
    expect(track).toHaveBeenCalledTimes(3);
  });
});
