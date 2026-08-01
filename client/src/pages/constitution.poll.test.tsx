// @vitest-environment jsdom

/**
 * constitution.poll.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies that SealSection's refetchInterval stops polling once valid seal
 * data arrives.  The component polls every 5 seconds while the server returns
 * null (seal not yet mined), but must set refetchInterval → false the moment
 * real data lands so it does not hammer the server indefinitely.
 *
 * Strategy
 * ────────
 * We need to exercise the refetchInterval callback without waiting 5 real
 * seconds per poll.  We do this by patching @tanstack/react-query so that
 * any non-false refetchInterval value is shrunk to 50 ms while the true/false
 * logic of the callback is preserved.  This lets us use real timers and
 * standard RTL waitFor throughout without any fake-timer cascades.
 *
 * Test sequence
 * ─────────────
 * 1. First fetch → 404  → fetchSeal returns null  → refetchInterval → 50 ms
 * 2. Component shows "Seal pending…"
 * 3. ~50 ms later the poll fires → second fetch → 200 + MOCK_SEAL
 * 4. Seal card appears → refetchInterval → false
 * 5. Wait 200 ms more → assert fetch was called exactly twice (no third poll)
 *
 * Environment: jsdom (via @vitest-environment docblock)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, isLoading: false, isAuthenticated: false }),
}));

vi.mock("@/hooks/use-page-meta", () => ({
  usePageMeta: () => undefined,
}));

vi.mock("wouter", () => ({
  Link:        ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useLocation: () => ["/constitution", vi.fn()],
  useRoute:    () => [false, {}],
}));

/**
 * Patch @tanstack/react-query so that any non-false refetchInterval is
 * clamped to 50 ms.  This lets us use real timers instead of fake ones,
 * keeping the true/false callback logic intact while eliminating the
 * 5-second wait per poll cycle.
 */
vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>(
      "@tanstack/react-query",
    );

  return {
    ...actual,
    useQuery: (options: any) => {
      const patched = { ...options };
      if (typeof options.refetchInterval === "function") {
        patched.refetchInterval = (query: any) => {
          const result = options.refetchInterval(query);
          // Preserve the false (stop) signal; shrink any positive interval.
          return result === false ? false : 50;
        };
      }
      return actual.useQuery(patched);
    },
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_SEAL = {
  blockNumber:  42,
  psiChannel:   "Ψ(52,20,H)",
  wavelengthNm: 542.5,
  hash:         "b".repeat(64),
  timestamp:    "2026-06-23T10:00:00.000Z",
  frequencyHz:  5.54e14,
  energyJoules: 3.67e-19,
  band:         "SYSTEM",
  declaration:  "NexusOS Constitutional Declaration",
  amendments:   [],
};

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry:     false,
        staleTime: 0,
      },
    },
  });
}

// Import after all mocks are hoisted so the component picks up the stubs.
import { SealSection } from "./constitution";
import { sealRefetchIntervalFn } from "@/lib/constitution-seal-query";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("sealRefetchIntervalFn — unit", () => {
  it("returns false when data is undefined (initial loading state — no polling yet)", () => {
    const result = sealRefetchIntervalFn({ state: { data: undefined, error: null } });
    expect(result).toBe(false);
  });

  it("returns a positive interval when data is null (seal pending — poll)", () => {
    const result = sealRefetchIntervalFn({ state: { data: null, error: null } });
    expect(typeof result === "number" && result > 0).toBe(true);
  });

  it("returns false when data is a seal object (seal loaded — stop polling)", () => {
    const seal = { blockNumber: 1, psiChannel: "Ψ(52,20,H)", wavelengthNm: 542.5, hash: "a".repeat(64), timestamp: "2026-01-01T00:00:00.000Z", frequencyHz: 5.54e14, energyJoules: 3.67e-19, band: "SYSTEM", declaration: "test" };
    const result = sealRefetchIntervalFn({ state: { data: seal, error: null } });
    expect(result).toBe(false);
  });

  it("returns false when there is an error (stop polling)", () => {
    const result = sealRefetchIntervalFn({ state: { data: null, error: new Error("503") } });
    expect(result).toBe(false);
  });
});

describe("SealSection — no polling during initial page load", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it(
    "calls fetch exactly once and does not start a second request while the initial fetch is still in-flight",
    async () => {
      // fetch never resolves — simulates the initial loading state where
      // data === undefined (React Query has not yet received any response).
      // The refetchInterval callback must return false in this state so no
      // second request is ever scheduled.
      fetchSpy.mockImplementation(() => new Promise(() => { /* never resolves */ }));

      const client = makeClient();

      render(
        <QueryClientProvider client={client}>
          <SealSection />
        </QueryClientProvider>,
      );

      // Component should show the loading spinner while the fetch is pending.
      await waitFor(() => {
        expect(screen.queryByText(/fetching seal from chain/i)).toBeTruthy();
      });

      // Exactly one fetch has been initiated (the initial query).
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Wait well beyond two poll cycles (the mock clamps real intervals to
      // 50 ms so this is > 4 × 50 ms) and confirm no second request fired.
      await new Promise(resolve => setTimeout(resolve, 250));

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    },
    10_000,
  );
});

describe("SealSection — refetchInterval stops after data arrives", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it(
    "does not call the server a third time after valid seal data has been received",
    async () => {
      // ── Arrange ─────────────────────────────────────────────────────────────
      // First call  → 404 → fetchSeal returns null → refetchInterval → 50 ms
      // Second call → 200 → fetchSeal returns MOCK_SEAL → refetchInterval → false
      fetchSpy
        .mockResolvedValueOnce({
          ok:     false,
          status: 404,
          json:   async () => ({}),
        })
        .mockResolvedValueOnce({
          ok:     true,
          status: 200,
          json:   async () => MOCK_SEAL,
        });

      const client = makeClient();

      render(
        <QueryClientProvider client={client}>
          <SealSection />
        </QueryClientProvider>,
      );

      // ── Assert: initial pending state ────────────────────────────────────────
      // data === null → "Seal pending…" branch is shown.
      await waitFor(() => {
        expect(screen.queryByText(/seal pending/i)).toBeTruthy();
      });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // ── Assert: seal card appears after the first poll fires (≤50 ms) ────────
      // The refetchInterval callback returns 50 ms (clamped from 5 000 ms) while
      // data is null, so the second fetch fires within the waitFor window.
      // Once MOCK_SEAL lands, refetchInterval returns false → no further polls.
      await waitFor(() => {
        expect(screen.queryByTestId("text-constitution-hash")).toBeTruthy();
      }, { timeout: 3_000 });

      const hashEl = screen.getByTestId("text-constitution-hash");
      expect(hashEl.textContent).toBe(MOCK_SEAL.hash);

      // Exactly two fetches so far.
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // ── Assert: no further polling ────────────────────────────────────────────
      // Wait well beyond two more poll cycles (> 2 × 50 ms) and confirm the
      // fetch count stays at 2.
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId("text-constitution-hash")).toBeTruthy();
    },
    10_000,
  );
});
