import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FounderWalletHold } from "./founder-wallet-hold";

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; username: string; role: string },
  apiRequest: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: mocks.apiRequest }));

function renderControl() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <FounderWalletHold />
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

beforeEach(() => {
  mocks.user = { id: "founder-id", role: "admin", username: "Nexus" };
  mocks.apiRequest.mockReset();
});

afterEach(cleanup);

describe("founder wallet hold", () => {
  it("keeps controls hidden for non-founder users", () => {
    mocks.user = { id: "other-id", role: "admin", username: "another-admin" };
    renderControl();
    expect(screen.queryByRole("heading", { name: "Outgoing wallet hold" })).not.toBeInTheDocument();
    expect(mocks.apiRequest).not.toHaveBeenCalled();
  });

  it("shows the fetched lock state and incoming-credit boundary", async () => {
    mocks.apiRequest.mockResolvedValue({
      json: async () => ({ username: "uncjuddy", locked: true, expiresAt: null, incomingAllowed: true }),
    });
    renderControl();
    expect(await screen.findByText("Wallet locked")).toBeInTheDocument();
    expect(screen.getByText(/held indefinitely until Nexus explicitly releases/)).toBeInTheDocument();
    expect(screen.getByText("Incoming credits allowed")).toBeInTheDocument();
    expect(screen.getByText(/does not move funds, change balances, or freeze external keys/)).toBeInTheDocument();
    expect(mocks.apiRequest).toHaveBeenCalledOnce();
    expect(mocks.apiRequest).toHaveBeenCalledWith("GET", "/api/admin/wallet-lock/uncjuddy");
  });

  it("requires the exact release confirmation and only mutates after an explicit submit", async () => {
    mocks.apiRequest
      .mockResolvedValueOnce({
        json: async () => ({ username: "uncjuddy", locked: true, expiresAt: null, incomingAllowed: true }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ username: "uncjuddy", locked: false, expiresAt: null, incomingAllowed: true }),
      });
    renderControl();

    await screen.findByText("Wallet locked");
    const release = screen.getByRole("button", { name: "Release wallet hold" });
    expect(release).toBeDisabled();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);

    const confirmation = screen.getByLabelText("Type confirmation phrase");
    fireEvent.change(confirmation, { target: { value: "RELEASE UNCJUDDY WALLET " } });
    expect(release).toBeDisabled();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);

    fireEvent.change(confirmation, { target: { value: "RELEASE UNCJUDDY WALLET" } });
    expect(release).toBeEnabled();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
    fireEvent.click(release);

    await waitFor(() => expect(mocks.apiRequest).toHaveBeenCalledTimes(2));
    expect(mocks.apiRequest).toHaveBeenLastCalledWith("POST", "/api/admin/wallet-lock/uncjuddy", {
      locked: false,
      confirmation: "RELEASE UNCJUDDY WALLET",
    });
    expect(await screen.findByText("Wallet released")).toBeInTheDocument();
    expect(confirmation).toHaveValue("");
  });

  it("clears confirmation and mutation feedback on logout and ignores a delayed mutation response", async () => {
    let resolvePost!: (response: { json: () => Promise<WalletStatus> }) => void;
    type WalletStatus = { username: string; locked: boolean; expiresAt: null; incomingAllowed: true };
    const delayedPost = new Promise<{ json: () => Promise<WalletStatus> }>((resolve) => {
      resolvePost = resolve;
    });
    mocks.apiRequest.mockImplementation((method: string) => {
      if (method === "POST") return delayedPost;
      return Promise.resolve({
        json: async () => ({ username: "uncjuddy", locked: false, expiresAt: null, incomingAllowed: true }),
      });
    });
    const { queryClient, rerender } = renderControl();

    await screen.findByText("Wallet released");
    const confirmation = screen.getByLabelText("Type confirmation phrase");
    fireEvent.change(confirmation, { target: { value: "LOCK UNCJUDDY WALLET" } });
    fireEvent.click(screen.getByRole("button", { name: "Lock wallet indefinitely" }));
    await waitFor(() => expect(mocks.apiRequest).toHaveBeenCalledWith("POST", "/api/admin/wallet-lock/uncjuddy", {
      locked: true,
      confirmation: "LOCK UNCJUDDY WALLET",
    }));

    mocks.user = null;
    rerender(
      <QueryClientProvider client={queryClient}>
        <FounderWalletHold />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("heading", { name: "Outgoing wallet hold" })).not.toBeInTheDocument();

    resolvePost({
      json: async () => ({ username: "uncjuddy", locked: true, expiresAt: null, incomingAllowed: true }),
    });
    await waitFor(() => expect(queryClient.getQueryData([
      "/api/admin/wallet-lock/uncjuddy",
      "founder-wallet-hold",
      "founder-id",
    ])).toBeUndefined());

    mocks.user = { id: "founder-id", role: "admin", username: "Nexus" };
    rerender(
      <QueryClientProvider client={queryClient}>
        <FounderWalletHold />
      </QueryClientProvider>,
    );
    await screen.findByText("Wallet released");
    expect(screen.getByLabelText("Type confirmation phrase")).toHaveValue("");
    expect(screen.queryByText(/Server confirmed the wallet hold/)).not.toBeInTheDocument();
  });
});
