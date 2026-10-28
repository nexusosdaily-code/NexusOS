import { beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { WaveOverview } from "@shared/wallet-wave-communications";
import { WalletWaveCommunications } from "./wallet-wave-communications";

const state = vi.hoisted(() => ({
  user: { id: "synthetic-user" } as { id: string } | null,
  data: null as WaveOverview | null,
  error: null as Error | null,
  mutate: vi.fn(), reset: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/hooks/use-wallet-wave", () => ({
  useWalletWave: () => ({ data: state.data, isSuccess: true, isLoading: false, isError: false, refetch: vi.fn() }),
  useWalletWaveAction: () => ({ mutate: state.mutate, reset: state.reset, isPending: false, error: state.error }),
}));
beforeEach(() => {
  cleanup();
  state.user = { id: "synthetic-user" };
  state.error = null;
  state.mutate.mockReset();
  state.data = { address: "wnsp://Ψ(2,3,H)/synthetic", inbox: [], outbox: [], consents: [],
    subscriptions: [{ topic: "technical-security", subscribed: true }], commissions: [],
    identityAuthorisationReady: false, ledger: "NexusOS project blockchain" };
});
describe("wallet wave account, consent and verified receipt UI", () => {
  it("does not show messaging controls to a signed-out visitor", () => {
    state.user = null;
    render(<WalletWaveCommunications />);
    expect(screen.getByText("Sign in to access your wave address")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send privately" })).not.toBeInTheDocument();
  });
  it("explains the locked independent identity dependency without falsely granting a commission", () => {
    render(<WalletWaveCommunications />);
    expect(screen.getByText(/Commission delivery and public broadcasts are locked/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish authorised text" })).not.toBeInTheDocument();
  });
  it("keeps the same private-send payload and retry key after an unknown outcome", () => {
    const view = render(<WalletWaveCommunications />);
    fireEvent.change(screen.getByLabelText("Recipient wave address"), { target: { value: "wallet-recipient" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Private synthetic message" } });
    fireEvent.click(screen.getByRole("button", { name: "Send privately" }));
    const initial = state.mutate.mock.calls[0][0];
    expect(initial.path).toBe("/send");
    expect(initial.data.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
    state.error = new Error("Unknown network outcome");
    view.rerender(<WalletWaveCommunications />);
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(state.mutate.mock.calls[1][0]).toEqual(initial);
  });
  it("allows opt-out through the actual subscription endpoint", () => {
    render(<WalletWaveCommunications />);
    fireEvent.click(screen.getByRole("button", { name: "Subscribed · unsubscribe" }));
    expect(state.mutate.mock.calls[0][0]).toEqual({
      path: "/subscription", data: { topic: "technical-security", subscribed: false },
    });
  });
  it("grants first-time consent from an empty list, then lets the nonfriend sender compose through the real send endpoint", () => {
    const recipientAddress = state.data!.address!;
    const senderAddress = "wnsp://Ψ(6,2,V)/nonfriend-sender";
    const recipientOverview = structuredClone(state.data!);
    state.mutate.mockImplementation((request, callbacks) => {
      if (request.path === "/consent") {
        recipientOverview.consents = [{ senderAddress: request.data.senderAddress, allowed: request.data.allowed }];
        state.data = recipientOverview;
      }
      callbacks.onSuccess();
    });
    const view = render(<WalletWaveCommunications />);
    expect(state.data!.consents).toEqual([]);
    expect(screen.getByRole("button", { name: "Allow sender" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Sender wave address"), { target: { value: `  ${senderAddress}  ` } });
    fireEvent.click(screen.getByRole("button", { name: "Allow sender" }));
    expect(state.mutate.mock.calls[0][0]).toEqual({
      path: "/consent", data: { senderAddress, allowed: true },
    });
    view.rerender(<WalletWaveCommunications />);
    expect(screen.getByRole("button", { name: "Allowed · revoke" })).toBeInTheDocument();
    expect(screen.getByLabelText("Sender wave address")).toHaveValue("");
    expect(recipientOverview.consents).toEqual([{ senderAddress, allowed: true }]);

    // Switch to the separate consenting sender's account. Server consent enforcement
    // for this nonfriend journey is also exercised by wallet-wave.integration.test.ts.
    state.user = { id: "nonfriend-sender" };
    state.data = { ...structuredClone(recipientOverview), address: senderAddress, consents: [] };
    view.rerender(<WalletWaveCommunications />);
    fireEvent.change(screen.getByLabelText("Recipient wave address"), { target: { value: recipientAddress } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "A consented nonfriend message" } });
    fireEvent.click(screen.getByRole("button", { name: "Send privately" }));
    expect(state.mutate.mock.calls[1][0]).toMatchObject({
      path: "/send", data: { recipientAddress, content: "A consented nonfriend message" },
    });
    expect(state.mutate.mock.calls[1][0].data.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
  });
  it("can refuse a first-time sender even when there is no existing consent row", () => {
    render(<WalletWaveCommunications />);
    expect(state.data!.consents).toEqual([]);
    expect(screen.getByRole("button", { name: "Refuse sender" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Sender wave address"), { target: { value: "wallet-refused" } });
    fireEvent.click(screen.getByRole("button", { name: "Refuse sender" }));
    expect(state.mutate.mock.calls[0][0]).toEqual({
      path: "/consent", data: { senderAddress: "wallet-refused", allowed: false },
    });
  });
  it("displays separately verified message and receipt commitments", () => {
    state.data!.inbox = [{
      id: "synthetic-message", kind: "private", content: "Synthetic received message",
      senderAddress: "wallet-sender", recipientAddress: "wallet-recipient", topic: null, commissionId: null,
      createdAt: new Date().toISOString(), blockNumber: 2, commitment: "communication-proof",
      verified: true, status: "acknowledged", receipt: {
        verified: true, blockNumber: 3, commitment: "receipt-proof", readAt: new Date().toISOString(),
        proof: "authenticated-recipient-acknowledgement",
      },
    }];
    render(<WalletWaveCommunications />);
    expect(screen.getByText("Commitment verified")).toBeInTheDocument();
    expect(screen.getByText(/Receipt verified · Account acknowledgement/)).toBeInTheDocument();
    expect(screen.getByText(/Receipt block 3 · receipt-proof/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record account acknowledgement" })).not.toBeInTheDocument();
  });
  it("requires deliberate confirmation and sends only the approved broadcast template", () => {
    state.data!.identityAuthorisationReady = true;
    state.data!.commissions = [{
      id: "synthetic-commission", mandateId: "synthetic-mandate", topic: "technical-security",
      exactInstructions: "Exact community instructions", expiresAt: new Date(Date.now() + 86400000).toISOString(),
      blockNumber: 1, verified: true,
      publicBroadcasts: [{ topic: "technical-security", content: "Exact approved synthetic text" }],
    }];
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    render(<WalletWaveCommunications />);
    expect(screen.getByRole("button", { name: "Publish authorised text" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I understand this will publish/));
    fireEvent.click(screen.getByRole("button", { name: "Publish authorised text" }));
    expect(state.mutate.mock.calls[0][0]).toMatchObject({
      path: "/broadcast", data: { commissionId: "synthetic-commission", topic: "technical-security",
        content: "Exact approved synthetic text", confirmPublic: true },
    });
    window.confirm = originalConfirm;
  });
});
