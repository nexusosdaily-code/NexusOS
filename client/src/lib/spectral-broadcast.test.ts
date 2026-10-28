// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BroadcastInviteError, createBroadcastRoom, inviteBroadcastGuests, spectralRequest } from "./spectral-broadcast";

afterEach(() => vi.unstubAllGlobals());
const ok = (body: unknown) => ({ ok: true, json: async () => body });

describe("Spectral Broadcast API integration", () => {
  it("creates a pending room with explicit visibility and selected capture type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ stream: { id: "room/42" } }));
    vi.stubGlobal("fetch", fetchMock);
    await createBroadcastRoom({ title: "Desk session", description: "Notes", isPublic: false, streamType: "screen" });
    expect(fetchMock).toHaveBeenCalledWith("/api/streams", expect.objectContaining({
      method: "POST", credentials: "include", cache: "no-store",
      body: JSON.stringify({ title: "Desk session", description: "Notes", isPublic: false, streamType: "screen" }),
    }));
  });

  it("grants multiple recipients sequentially and encodes room path segments", async () => {
    const order: string[] = [];
    const fetchMock = vi.fn(async (path: string, init: RequestInit) => {
      order.push(`${path}:${init.method}`);
      return path === "/api/streams" ? ok({ stream: { id: "room/42" } }) : ok({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const room = await createBroadcastRoom({ title: "Private room", isPublic: false, streamType: "both" });
    const invited = await inviteBroadcastGuests(room.stream.id, ["wnsp://one", "wnsp://two", "wnsp://one"]);
    expect(invited).toEqual(["wnsp://one", "wnsp://two"]);
    expect(order).toEqual([
      "/api/streams:POST",
      "/api/p2p/live/room%2F42/guests:POST",
      "/api/p2p/live/room%2F42/guests:POST",
    ]);
  });

  it("stops at the first failed invite so the caller can retry only remaining grants", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok({ stream: { id: "room-1" } }))
      .mockResolvedValueOnce(ok({}))
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "directory temporarily unavailable" }) });
    vi.stubGlobal("fetch", fetchMock);
    const room = await createBroadcastRoom({ title: "Private room", isPublic: false, streamType: "camera" });
    const failure = await inviteBroadcastGuests(room.stream.id, ["wnsp://one", "wnsp://two", "wnsp://three"]).catch(error => error);
    expect(failure).toBeInstanceOf(BroadcastInviteError);
    expect(failure).toMatchObject({ message: "directory temporarily unavailable", invited: ["wnsp://one"] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.filter(([path]) => path === "/api/streams")).toHaveLength(1);
  });

  it("uses the authenticated, uncached live directory path and surfaces errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ streams: [{ id: "r1", status: "pending" }] }));
    vi.stubGlobal("fetch", fetchMock);
    await spectralRequest("/api/p2p/live");
    expect(fetchMock).toHaveBeenCalledWith("/api/p2p/live", expect.objectContaining({ credentials: "include", cache: "no-store" }));
  });
});
