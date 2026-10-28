// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useWaveVault } from "./use-wave-vault";

const clients: QueryClient[] = [];
const index = (name?: string) => ({
  address: "wnsp://Ψ(1,2,H)/receiver", storageReady: true, usedBytes: "0",
  limits: { maxFileBytes: 1024, maxAccountBytes: 4096, maxFiles: 200 },
  files: name ? [{ id: "shared", name, isOwner: false, status: "ready" }] : [],
});
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: false } },
  });
  clients.push(client);
  return { client, wrapper: ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Wave Vault incoming grant freshness", () => {
  it("refetches an already-open receiver on return to the page and bypasses HTTP cache", async () => {
    let current = index();
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      ({ ok: true, json: async () => current }));
    vi.stubGlobal("fetch", fetcher);
    const { wrapper } = setup();
    const { result } = renderHook(() => useWaveVault(true, "receiver"), { wrapper });
    await waitFor(() => expect(result.current.files.isSuccess).toBe(true));
    expect(result.current.files.data?.files).toEqual([]);
    current = index("family.mov");
    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));
    await waitFor(() => expect(result.current.files.data?.files[0]?.name).toBe("family.mov"));
    expect(fetcher.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      cache: "no-store", credentials: "include",
    }));
  });

  it("refreshes after iOS page restoration and reconnect, without changing accounts", async () => {
    let current = index();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => current })));
    const { wrapper } = setup();
    const { result } = renderHook(() => useWaveVault(true, "receiver"), { wrapper });
    await waitFor(() => expect(result.current.files.isSuccess).toBe(true));
    current = index("restored.mov");
    act(() => window.dispatchEvent(new Event("pageshow")));
    await waitFor(() => expect(result.current.files.data?.files[0]?.name).toBe("restored.mov"));
    act(() => onlineManager.setOnline(false));
    current = index();
    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(result.current.files.data?.files).toEqual([]));
  });

  it("polls while a receiver stays on the page", async () => {
    focusManager.setFocused(true);
    let current = index();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => current })));
    const { wrapper } = setup();
    const { result } = renderHook(() => useWaveVault(true, "receiver"), { wrapper });
    await waitFor(() => expect(result.current.files.isSuccess).toBe(true));
    current = index("next.mov");
    await waitFor(() => expect(result.current.files.data?.files[0]?.name).toBe("next.mov"),
      { timeout: 12_000, interval: 100 });
  }, 15_000);

  it("does not request or resume a signed-out vault", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { wrapper } = setup();
    renderHook(() => useWaveVault(false), { wrapper });
    act(() => window.dispatchEvent(new Event("pageshow")));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
