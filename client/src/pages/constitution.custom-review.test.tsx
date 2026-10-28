import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const auth = vi.hoisted(() => ({ user: { id: "founder", username: "Nexus", role: "admin", spectralBand: "SYSTEM" } }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/use-page-meta", () => ({ usePageMeta: () => {} }));
import { SealSection } from "./constitution";

const seal = {
  blockNumber: 15, psiChannel: "Ψ(52,20,H)", wavelengthNm: 542.5,
  hash: "a".repeat(64), timestamp: "2026-06-23T10:00:00Z",
  frequencyHz: 5.54e14, energyJoules: 3.67e-19, band: "SYSTEM",
  declaration: "Original sealed constitution", amendments: [],
};
let fetchMock: ReturnType<typeof vi.fn>;
function view() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(["/api/constitution/seal"], seal);
  render(<QueryClientProvider client={client}><SealSection /></QueryClientProvider>);
  fireEvent.click(screen.getByTestId("button-propose-amendment"));
  fireEvent.change(screen.getByTestId("input-amendment-title"), { target: { value: "Separate custom amendment" } });
  fireEvent.change(screen.getByTestId("textarea-amendment-body"), { target: { value: "Separate reviewed text" } });
}
beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(async (_url, init) => init?.method === "POST"
    ? { ok: true, status: 201, json: async () => ({ blockNumber: 20 }) }
    : { ok: true, status: 200, json: async () => seal });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("custom amendment exact review declaration", () => {
  it("requires explicit approval and clears it after edits", () => {
    view();
    const submit = screen.getByTestId("button-submit-amendment");
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByTestId("checkbox-custom-amendment-approve"));
    expect(submit).not.toBeDisabled();
    fireEvent.change(screen.getByTestId("textarea-amendment-body"), { target: { value: "Changed text" } });
    expect(submit).toBeDisabled();
    expect(screen.getByTestId("checkbox-custom-amendment-approve")).not.toBeChecked();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exact custom wording consent cannot submit without a commissioned three-review proposal", async () => {
    view();
    fireEvent.click(screen.getByTestId("checkbox-custom-amendment-approve"));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("button-submit-amendment"));
    await waitFor(() => expect(screen.getByTestId("text-amendment-error")).toHaveTextContent("all three independent authenticated reviews"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("closing and reopening the custom form clears approval", () => {
    view();
    fireEvent.click(screen.getByTestId("checkbox-custom-amendment-approve"));
    fireEvent.click(screen.getByTestId("button-close-amendment-form"));
    fireEvent.click(screen.getByTestId("button-propose-amendment"));
    expect(screen.getByTestId("checkbox-custom-amendment-approve")).not.toBeChecked();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
