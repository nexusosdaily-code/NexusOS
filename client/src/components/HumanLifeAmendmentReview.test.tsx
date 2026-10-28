import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HUMAN_LIFE_BODY, HUMAN_LIFE_TITLE, HUMAN_LIFE_REVIEW_APPROVED_DATE } from "@shared/human-life-amendment";
import { HumanLifeAmendmentReview } from "./HumanLifeAmendmentReview";

let fetchMock: ReturnType<typeof vi.fn>;
function view(amendments: unknown[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/constitution/seal"], { blockNumber: 1, amendments });
  return render(<QueryClientProvider client={client}><HumanLifeAmendmentReview /></QueryClientProvider>);
}
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    state: "unconfigured", independentAuthorityVerified: false, replacementEnabled: false, identityTransferEnabled: false,
  }) });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("fresh three-review draft", () => {
  it("never reuses historical wording consent and remains read-only", () => {
    view();
    expect(HUMAN_LIFE_REVIEW_APPROVED_DATE).toBeNull();
    expect(screen.getByText("Fresh review draft · unapproved")).toBeInTheDocument();
    expect(screen.getByTestId("human-life-review-approval")).toHaveTextContent("does not approve this revised title or body");
    fireEvent.click(screen.getByTestId("button-human-life-open"));
    expect(screen.getByTestId("human-life-draft").querySelector("pre")?.textContent).toBe(HUMAN_LIFE_BODY);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-human-life-open"));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
  it("separates review, adoption and commissioning even with an exact receipt", () => {
    view([{ title: HUMAN_LIFE_TITLE, body: HUMAN_LIFE_BODY, blockNumber: 88 }]);
    expect(screen.getByTestId("human-life-adoption-status")).toHaveTextContent("block #88");
    expect(screen.getByTestId("human-life-adoption-status")).toHaveTextContent("does not commission enforcement or transfer authority");
    expect(screen.getByText("Fresh review draft · unapproved")).toBeInTheDocument();
    expect(screen.getByText(/Protected-change enforcement:/)).toBeInTheDocument();
  });
  it("does not treat changed text or a historical receipt as adoption of the fresh draft", () => {
    view([{ title: HUMAN_LIFE_TITLE, body: HUMAN_LIFE_BODY + "changed", blockNumber: 88 }]);
    expect(screen.getByTestId("human-life-adoption-status")).toHaveTextContent("No exact matching amendment");
  });
  it("clearly rejects containment quorum and emergency transfer exceptions", () => {
    view();
    expect(screen.getByTestId("human-life-safety-status")).toHaveTextContent("two-of-three safety-containment mode is not the three-of-three");
    expect(screen.getByTestId("human-life-safety-status")).toHaveTextContent("No emergency authority transfer");
    expect(screen.getByTestId("human-life-safety-status")).toHaveTextContent("life-safe essential-service fallback");
    expect(screen.getByTestId("human-life-safety-status")).toHaveTextContent("succession remain disabled");
  });
});
