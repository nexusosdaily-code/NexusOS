import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ActSequenceNav } from "@/components/act-sequence-nav";
import { LambdaStateMachine } from "@/utils/lambda-state";
import HardwareSpecPage from "@/pages/hardware-spec";
vi.mock("@/components/ecosystem-nav", () => ({ EcosystemNav: () => null }));
vi.mock("@/hooks/use-page-meta", () => ({ usePageMeta: () => undefined }));
afterEach(cleanup);

describe("Public evidence and ledger input handling", () => {
  it("retains Act navigation and displays the current interpretation", () => {
    const { getByLabelText, getAllByRole } = render(<ActSequenceNav current={7} />);
    expect(getByLabelText("Act 7 evidence status").textContent).toContain("Superposition");
    expect(getByLabelText("Act 7 evidence status").textContent).toContain("not empty physical space");
    expect(getAllByRole("link").length).toBeGreaterThanOrEqual(3);
  });
  it.each([NaN, Infinity, -Infinity, 0, 1000])("rejects invalid hardware reading %s", reading => {
    const ledger = new LambdaStateMachine();
    expect(ledger.verifyHardwareAnchor(0, reading)).toBe(false);
  });
  it("renders hardware targets separately from reported electrical tests", () => {
    const { getByLabelText, container } = render(<HardwareSpecPage />);
    const status = getByLabelText("Hardware implementation and evidence status").textContent!;
    expect(status).toContain("have not been demonstrated");
    expect(status).toContain("3.125");
    expect(status).toContain("1.5625");
    expect(container.textContent).toContain("11.96 nH");
    expect(container.textContent).toContain("does not cover 380–500 nm");
    expect(container.textContent).toContain("compileWLS() → runToHalt()");
    expect(container.textContent).toContain("it does not drive a coil");
  });
});
