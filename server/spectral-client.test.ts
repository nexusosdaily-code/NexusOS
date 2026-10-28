import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSpectralJson } from "./spectral-client";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Spectral dependency requests", () => {
  it("preserves successful data and upstream HTTP failure status", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{"queue":0}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{"error":"unavailable"}', { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchSpectralJson("http://fixture/status")).toEqual({ status: 200, data: { queue: 0 } });
    expect(await fetchSpectralJson("http://fixture/status")).toEqual({ status: 503, data: { error: "unavailable" } });
  });

  it("cleans the timer and redacts connection errors", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("PRIVATE_CONNECTION_DETAILS")));
    await expect(fetchSpectralJson("http://fixture")).rejects.toMatchObject({
      status: 503, message: "Spectral API unavailable",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects non-JSON responses without exposing their contents", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("PRIVATE_HTML")));
    await expect(fetchSpectralJson("http://fixture")).rejects.toMatchObject({ status: 502 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["connection", "body"])("bounds a stalled %s and clears the timer", async (stage) => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      const stalled = () => new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
      return stage === "connection" ? stalled() : { status: 200, json: stalled };
    }));
    const pending = expect(fetchSpectralJson("http://fixture", {}, 100)).rejects.toMatchObject({
      status: 504, message: "Spectral API request timed out",
    });
    await vi.advanceTimersByTimeAsync(100);
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });
});
