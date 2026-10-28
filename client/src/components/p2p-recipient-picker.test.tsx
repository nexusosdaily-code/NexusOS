// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import P2PFileExchange from "./p2p-file-exchange";

const fixture = vi.hoisted(() => ({ sendFile: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "account-a" }, isAuthenticated: true, isLoading: false }) }));
vi.mock("@/hooks/use-p2p-files", () => ({
  useP2PFiles: () => ({
    connected: true, connecting: false, address: "wnsp://self", broadcastMuted: false,
    setBroadcastMuted: vi.fn(), offers: [], transfers: [], sendFile: fixture.sendFile,
    accept: vi.fn(), decline: vi.fn(), cancel: vi.fn(), error: "",
  }),
}));
vi.mock("wouter", () => ({ Link: ({ href, ...props }: React.ComponentProps<"a">) => <a href={href} {...props} /> }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => vi.clearAllMocks());

describe("file exchange directory selection", () => {
  it("copies the exact directory address into the recipient field without sending until Send is activated", async () => {
    const waveAddress = "wnsp://family/CaseSensitive+address";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ recipients: [{ username: "Ari", waveAddress }], hasMore: false }),
    }));
    render(<P2PFileExchange />);
    const file = new File(["family photo"], "photo.txt", { type: "text/plain" });
    fireEvent.change(screen.getByTestId("p2p-file-input"), { target: { files: [file] } });
    fireEvent.click(screen.getByTestId("recipient-picker-open"));
    await screen.findByText(waveAddress);
    fireEvent.click(screen.getByTestId("recipient-picker-select"));
    expect((screen.getByTestId("p2p-recipient") as HTMLInputElement).value).toBe(waveAddress);
    expect(fixture.sendFile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("p2p-send"));
    await waitFor(() => expect(fixture.sendFile).toHaveBeenCalledExactlyOnceWith(file, waveAddress));
  });
});
