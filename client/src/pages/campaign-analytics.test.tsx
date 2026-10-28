import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DonateModal, LAB_TIERS } from "./campaign";

// Exercise the instrumented flow only under an explicitly approved future
// release. Separate hold tests cover the real, paused configuration.
vi.mock("@shared/hardware-readiness", () => ({
  HARDWARE_REVIEW_HOLD: { active: false, reason: "test release" },
  promotionsArePaused: () => false,
  HARDWARE_REFERENCE_SYSTEM: [],
  HARDWARE_RELEASE_GATES: [],
  HARDWARE_EVIDENCE_CORRECTION: "test correction",
}));

vi.mock("@tanstack/react-query", async importOriginal => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => ({
      data: queryKey[0] === "/api/auth/me"
        ? { user: { id: "PRIVATE_USER" }, wallet: { address: "PRIVATE_WALLET" } }
        : null,
    }),
  };
});

const track = vi.fn();
const tier = LAB_TIERS[0];
beforeEach(() => {
  track.mockReset();
  window.umami = { track };
});
afterEach(() => {
  cleanup();
  delete window.umami;
  vi.unstubAllGlobals();
});

function openModal() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><DonateModal t={tier} onClose={() => {}} /></QueryClientProvider>);
  expect(track).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /^Record contribution on-chain/ }));
}

describe("campaign contribution analytics", () => {
  it("records success only after the API succeeds, without receipt or wallet data", async () => {
    const receipt = {
      txId: "PRIVATE_TRANSACTION", tierName: tier.name, nxtLabel: "test allocation",
      usd: "PRIVATE_AMOUNT", zone: "test zone", psiChannel: "PRIVATE_CHANNEL",
      wavelengthNm: 540, band: "test band", walletAddress: "PRIVATE_WALLET",
      contractText: "PRIVATE_CONTRACT", signature: "PRIVATE_SIGNATURE",
      contentHash: "a".repeat(64), timestamp: "2026-01-01T00:00:00Z", newBalance: "123",
    };
    let complete!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => { complete = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    openModal();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(track.mock.calls).toEqual([["campaign_contribution_started", { surface: "campaign", tier: tier.tier }]]);
    complete(new Response(JSON.stringify(receipt), { status: 200 }));
    await waitFor(() => expect(track).toHaveBeenLastCalledWith("campaign_contribution_result", {
      surface: "campaign", tier: tier.tier, outcome: "success",
    }));
    expect(track).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(track.mock.calls)).not.toContain("PRIVATE_");
  });

  it("records a failed API response without leaking its error or counting a success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "PRIVATE_ERROR" }), { status: 400 })));
    openModal();
    await waitFor(() => expect(track).toHaveBeenLastCalledWith("campaign_contribution_result", {
      surface: "campaign", tier: tier.tier, outcome: "failure",
    }));
    expect(track).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/success|PRIVATE_/);
  });

  it("does not prevent the contribution request when analytics throws", async () => {
    window.umami = { track: () => { throw new Error("blocked tracker"); } };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "test rejection" }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    openModal();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(await screen.findByText("test rejection")).toBeTruthy();
  });
});
