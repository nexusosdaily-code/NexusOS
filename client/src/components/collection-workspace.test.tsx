import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import CollectionWorkspace from "./collection-workspace";
import { MAP_PROFILE } from "@shared/wls-map-vm";
import * as suiteRunner from "@/lib/bundled-set-suite";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("runs the separate offline suite without using or replacing the single-program editors", () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network forbidden"));
  const track = vi.fn();
  window.umami = { track };
  render(<CollectionWorkspace profile={MAP_PROFILE} startWithSets />);
  const source = screen.getByTestId("collection-source");
  const inputs = screen.getByTestId("collection-inputs");
  const originalSource = (source as HTMLTextAreaElement).value;
  fireEvent.change(inputs, { target: { value: '{"map":{"entries":[["edited","payload"]]}}' } });
  fireEvent.click(screen.getByTestId("collection-run-all"));
  expect(screen.getByTestId("collection-output").textContent).toContain("edited");
  expect(screen.queryByTestId("set-suite-results")).toBeNull();

  fireEvent.change(source, { target: { value: "deliberately invalid edited source" } });
  fireEvent.click(screen.getByRole("button", { name: "Run bundled Set suite (offline)" }));
  expect(screen.getByText("13 / 13 passed · 0 failed")).toBeTruthy();
  const cases = within(screen.getByTestId("set-suite-results")).getAllByRole("listitem");
  expect(cases).toHaveLength(13);
  expect(cases.filter(item => item.textContent?.includes("expected failure"))).toHaveLength(2);
  for (const item of cases) {
    expect(item.textContent).toContain("PASS");
    expect(item.textContent).toContain("Expected");
    expect(item.textContent).toContain("Actual");
  }
  expect((source as HTMLTextAreaElement).value).toBe("deliberately invalid edited source");
  expect((inputs as HTMLTextAreaElement).value).toContain("edited");
  expect(screen.getByTestId("collection-output").textContent).toBe("—");

  // A subsequent editor run is still a single-program operation.
  fireEvent.change(source, { target: { value: originalSource } });
  fireEvent.click(screen.getByTestId("collection-run-all"));
  expect(screen.getByTestId("collection-output").textContent).toContain("edited");
  expect(screen.getByText("13 / 13 passed · 0 failed")).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  expect(track).not.toHaveBeenCalled();
  delete window.umami;
});

it("keeps suite failures separate and clears stale passes on a failed rerun", () => {
  render(<CollectionWorkspace profile={MAP_PROFILE} />);
  fireEvent.click(screen.getByTestId("set-suite-run"));
  vi.spyOn(suiteRunner, "runBundledSetSuite").mockImplementation(() => { throw new Error("broken package"); });
  fireEvent.click(screen.getByTestId("set-suite-run"));
  expect(screen.getByTestId("set-suite-error").textContent).toContain("broken package");
  expect(screen.queryByTestId("set-suite-results")).toBeNull();
  expect(screen.queryByTestId("collection-error")).toBeNull();
});

it("does not add the Set suite to the retained Collection profile", () => {
  render(<CollectionWorkspace />);
  expect(screen.queryByTestId("set-suite-run")).toBeNull();
});

it("keeps edited-result comparison independent from bundled suite results", () => {
  render(<CollectionWorkspace profile={MAP_PROFILE} startWithSets />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Compare with my expected JSON" }));
  const expected = screen.getByRole("textbox", { name: "My expected JSON" });
  fireEvent.change(expected, { target: { value: '{"entries":[["__proto__",""],["🌊",""]]}' } });
  fireEvent.click(screen.getByRole("button", { name: "Execute and compare" }));
  expect(screen.getByTestId("collection-comparison").getAttribute("data-outcome")).toBe("match");

  fireEvent.click(screen.getByTestId("set-suite-run"));
  expect(screen.getByText("13 / 13 passed · 0 failed")).toBeTruthy();
  expect(screen.getByTestId("collection-comparison").getAttribute("data-outcome")).toBe("match");
  expect((expected as HTMLTextAreaElement).value).toContain("__proto__");

  fireEvent.change(expected, { target: { value: '{"entries":[]}' } });
  fireEvent.click(screen.getByRole("button", { name: "Execute and compare" }));
  expect(screen.getByTestId("collection-comparison").getAttribute("data-outcome")).toBe("mismatch");
  expect(screen.getByText("13 / 13 passed · 0 failed")).toBeTruthy();
});
