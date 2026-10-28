import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { INITIAL_OWNER_REGISTER } from "../../../shared/founding-owners";
import ShareholdersPage from "./shareholders";

const mocks = vi.hoisted(() => ({
  user: null as null | { role: string; username: string },
  apiRequest: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: mocks.apiRequest }));

function renderPage(completed = false) {
  const register = {
    owners: INITIAL_OWNER_REGISTER, disclosureDate: "2026-06-17",
    replacementComplete: completed, transferId: completed ? "ledger-reference" : null,
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { queryFn: async () => register, retry: false } } });
  queryClient.setQueryData(["/api/founding-owners"], register);
  render(<QueryClientProvider client={queryClient}><ShareholdersPage /></QueryClientProvider>);
}

beforeEach(() => {
  mocks.user = null;
  mocks.apiRequest.mockReset();
});

describe("owner register gift confirmation", () => {
  it("shows the public register but no transfer controls to visitors", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Founding owner register" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Recipient email")).not.toBeInTheDocument();
  });

  it("does not give other admins founder-only transfer controls", () => {
    mocks.user = { role: "admin", username: "other-admin" };
    renderPage();
    expect(screen.queryByLabelText("Recipient email")).not.toBeInTheDocument();
  });

  it("requires explicit confirmation and submits the fixed gift request only once", async () => {
    mocks.user = { role: "admin", username: "Nexus" };
    mocks.apiRequest.mockResolvedValue({ json: async () => ({ ok: true, alreadyCompleted: false, transferId: "gift-id" }) });
    renderPage();
    const submit = screen.getByRole("button", { name: "Confirm one-time reassignment" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Recipient email"), { target: { value: "recipient@example.test" } });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I confirm one-time reassignment/ }));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.apiRequest).toHaveBeenCalledOnce());
    expect(mocks.apiRequest).toHaveBeenCalledWith("POST", "/api/admin/founding-owner-gift", {
      recipientEmail: "recipient@example.test", publicName: "Owner 01", confirm: true,
    });
    await screen.findByText(/Server confirmation received/);
  });

  it("shows completed ledger reference instead of offering another transfer", () => {
    mocks.user = { role: "admin", username: "Nexus" };
    renderPage(true);
    expect(screen.getByText("Allocation reassignment completed")).toBeInTheDocument();
    expect(screen.getByText(/ledger-reference/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Recipient email")).not.toBeInTheDocument();
  });

  it("reports a failed transfer without falsely showing completion", async () => {
    mocks.user = { role: "admin", username: "Nexus" };
    mocks.apiRequest.mockRejectedValue(new Error("409: Source has insufficient unlocked NXT"));
    renderPage();
    fireEvent.change(screen.getByLabelText("Recipient email"), { target: { value: "recipient@example.test" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I confirm one-time reassignment/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm one-time reassignment" }));
    expect(await screen.findByText(/Source has insufficient unlocked NXT/)).toBeInTheDocument();
    expect(screen.queryByText(/Server confirmation received/)).not.toBeInTheDocument();
  });
});