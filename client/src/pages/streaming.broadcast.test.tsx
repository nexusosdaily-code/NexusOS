// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StreamingPage from "./streaming";

const fixture = vi.hoisted(() => ({
  user: { id: "account-a", username: "Ari" } as { id: string; username: string } | null,
  invited: [] as Array<{ id: string; title: string; broadcasterId: string; isPublic: boolean; status: string }>,
  mine: [] as Array<{ id: string; title: string; status: string; isPublic: boolean; viewerCount: number; quality: string; createdAt: string }>,
}));

vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: fixture.user }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn() }));
vi.mock("wouter", () => ({
  Link: ({ href, ...props }: React.ComponentProps<"a">) => <a href={href} {...props} />,
  useLocation: () => ["/streaming", vi.fn()],
  useRoute: () => [false, {}],
}));
vi.mock("@/components/VideoStreaming", () => ({
  default: ({ initialSource }: { initialSource?: string }) => <div data-testid="fixture-capture" data-source={initialSource} />,
}));

const response = (body: unknown) => ({ ok: true, json: async () => body });

beforeEach(() => {
  window.sessionStorage.clear();
  fixture.user = { id: "account-a", username: "Ari" };
  fixture.invited = [];
  fixture.mine = [];
  window.history.replaceState({}, "", "/streaming");
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/p2p/live") return response({ streams: fixture.invited });
    if (url === "/api/streams/live") return response({ streams: [] });
    if (url === "/api/streams/my") return response({ streams: fixture.mine });
    return response({});
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("canonical Spectral Broadcast audience flow", () => {
  it("discovers invited pending rooms without offering an implicit join", async () => {
    fixture.invited = [{ id: "pending-1", title: "Workshop", broadcasterId: "host", isPublic: false, status: "pending" }];
    render(<StreamingPage />);
    expect(await screen.findByTestId("invited-room-pending-1")).toHaveTextContent("Waiting for the broadcaster to start");
    expect(screen.queryByTestId("button-join-invited-pending-1")).not.toBeInTheDocument();
  });

  it("clears the prior account's private room results when the signed-in account changes", async () => {
    fixture.invited = [{ id: "account-a-room", title: "A private room", broadcasterId: "host", isPublic: false, status: "live" }];
    fixture.mine = [{ id: "account-a-owned", title: "A's pending room", status: "pending", isPublic: false, viewerCount: 0, quality: "720p", createdAt: new Date().toISOString() }];
    const view = render(<StreamingPage />);
    expect(await screen.findByTestId("invited-room-account-a-room")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tab-mine"));
    expect(await screen.findByTestId("card-my-stream-account-a-owned")).toBeInTheDocument();
    fixture.user = { id: "account-b", username: "Bea" };
    fixture.invited = [];
    fixture.mine = [];
    view.rerender(<StreamingPage />);
    await waitFor(() => expect(screen.queryByTestId("invited-room-account-a-room")).not.toBeInTheDocument());
    expect(screen.queryByTestId("card-my-stream-account-a-owned")).not.toBeInTheDocument();
  });

  it("opens the canonical private creation form for the P2P deep link", async () => {
    window.history.replaceState({}, "", "/streaming?create=private");
    render(<StreamingPage />);
    expect(await screen.findByTestId("input-stream-title")).toBeInTheDocument();
    expect(screen.getByTestId("recipient-picker-open")).toBeInTheDocument();
    expect(screen.getByTestId("input-broadcast-address")).toBeInTheDocument();
  });

  it("passes the selected screen source to capture only after all private invitations succeed", async () => {
    window.history.replaceState({}, "", "/streaming?create=private");
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") calls.push(url);
      if (url === "/api/streams") return response({ stream:{id:"new-private-room"} });
      if (url === "/api/p2p/live" || url === "/api/streams/live" || url === "/api/streams/my") return response({streams:[]});
      return response({});
    }));
    render(<StreamingPage />);
    fireEvent.change(await screen.findByTestId("input-stream-title"), {target:{value:"Private screen"}});
    fireEvent.change(screen.getByTestId("select-stream-type"), {target:{value:"screen"}});
    for (const address of ["wnsp://one","wnsp://two"]) {
      fireEvent.change(screen.getByTestId("input-broadcast-address"), {target:{value:address}});
      fireEvent.click(screen.getByRole("button",{name:/^Add$/}));
    }
    fireEvent.click(screen.getByTestId("button-create-stream"));
    expect(await screen.findByTestId("fixture-capture")).toHaveAttribute("data-source","screen");
    expect(calls).toEqual([
      "/api/streams",
      "/api/p2p/live/new-private-room/guests",
      "/api/p2p/live/new-private-room/guests",
    ]);
  });

  it("retries remaining grants for the saved room instead of creating a duplicate after reload", async () => {
    window.sessionStorage.setItem("nexusos:broadcast-pending:account-a", JSON.stringify({
      id: "saved-room", title: "Saved private room", addresses: ["wnsp://one", "wnsp://two"], invited: ["wnsp://one"],
    }));
    window.history.replaceState({}, "", "/streaming?create=private");
    const view = render(<StreamingPage />);
    expect(await screen.findByTestId("broadcast-invite-retry")).toHaveTextContent("1 of 2 invited");
    fireEvent.click(screen.getByRole("button", { name: "Retry remaining invitations" }));
    await waitFor(() => {
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.some(([url, init]) => url === "/api/p2p/live/saved-room/guests" && JSON.parse((init as RequestInit).body as string).address === "wnsp://two")).toBe(true);
      expect(calls.filter(([url, init]) => url === "/api/streams" && (init as RequestInit).method === "POST")).toHaveLength(0);
    });
    view.unmount();
  });

  it("clears saved invitation recovery when the account changes", async () => {
    window.sessionStorage.setItem("nexusos:broadcast-pending:account-a", JSON.stringify({
      id: "saved-room", title: "Saved private room", addresses: ["wnsp://one"], invited: [],
    }));
    window.history.replaceState({}, "", "/streaming?create=private");
    const view = render(<StreamingPage />);
    expect(await screen.findByTestId("broadcast-invite-retry")).toBeInTheDocument();
    fixture.user = { id: "account-b", username: "Bea" };
    view.rerender(<StreamingPage />);
    await waitFor(() => expect(window.sessionStorage.getItem("nexusos:broadcast-pending:account-a")).toBeNull());
    expect(screen.queryByTestId("broadcast-invite-retry")).not.toBeInTheDocument();
  });
});
