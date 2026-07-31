// @vitest-environment jsdom

/**
 * constitution.retry.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests that the Retry button on the Constitution page clears the 503 error
 * banner and renders the seal card when the server recovers.
 *
 * Environment: jsdom (via @vitest-environment docblock)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Module mocks ──────────────────────────────────────────────────────────────

// useAuth — SealSection only reads user?.spectralBand for the "canPropose" flag;
// keeping it unauthenticated is sufficient for the Retry path.
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, isLoading: false, isAuthenticated: false }),
}));

// usePageMeta — side-effect only hook; safe to no-op in unit tests.
vi.mock("@/hooks/use-page-meta", () => ({
  usePageMeta: () => undefined,
}));

// wouter — the constitution page uses <Link> for navigation; stub it so jsdom
// doesn't complain about a missing Router context.
vi.mock("wouter", () => ({
  Link:        ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useLocation: () => ["/constitution", vi.fn()],
  useRoute:    () => [false, {}],
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal valid seal payload returned by the API on recovery. */
const MOCK_SEAL = {
  blockNumber:  42,
  psiChannel:   "Ψ(52,20,H)",
  wavelengthNm: 542.5,
  hash:         "a".repeat(64),
  timestamp:    "2026-06-23T10:00:00.000Z",
  frequencyHz:  5.54e14,
  energyJoules: 3.67e-19,
  band:         "SYSTEM",
  declaration:  "NexusOS Constitutional Declaration",
  amendments:   [],
};

/** Build a fresh QueryClient that does NOT retry failed queries automatically. */
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry:   false,
        // Disable staleTime so invalidation always triggers a real refetch.
        staleTime: 0,
      },
    },
  });
}

// ── Import component under test ───────────────────────────────────────────────
// Imported after mocks are hoisted so the component picks up the stubs.
import { SealSection } from "./constitution";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SealSection — Retry button behaviour", () => {
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
    "clicking Retry clears the error banner and renders the seal card when the server recovers",
    async () => {
      // ── Arrange ────────────────────────────────────────────────────────────
      // First fetch → 503 (seal boot failure)
      // Second fetch → 200 with valid seal data (server recovered)
      fetchSpy
        .mockResolvedValueOnce({
          ok:     false,
          status: 503,
          json:   async () => ({ message: "Seal failed on last boot — contact the founder" }),
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

      // ── Act: wait for the 503 error banner to appear ───────────────────────
      const retryBtn = await screen.findByTestId("btn-seal-retry");
      expect(retryBtn).toBeTruthy();

      // The error banner must be visible before clicking Retry.
      expect(screen.queryAllByText(/seal failed on last boot/i).length).toBeGreaterThan(0);

      // Click the Retry button — triggers invalidateQueries → second fetch
      fireEvent.click(retryBtn);

      // ── Assert: error banner gone, seal card rendered ──────────────────────
      // The "Verified" badge only appears when seal data is successfully loaded.
      await waitFor(() => {
        expect(screen.queryByTestId("btn-seal-retry")).toBeNull();
      });

      // Seal card: the SHA-256 hash field is rendered only when data is present.
      const hashEl = await screen.findByTestId("text-constitution-hash");
      expect(hashEl.textContent).toBe(MOCK_SEAL.hash);

      // Confirm the fetch was called exactly twice (first 503, then recovery).
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy.mock.calls[0][0]).toBe("/api/constitution/seal");
      expect(fetchSpy.mock.calls[1][0]).toBe("/api/constitution/seal");
    },
  );

  it(
    "error banner remains visible if the server is still returning 503 after Retry",
    async () => {
      // Both fetches return 503 — Retry should not hide the banner.
      fetchSpy.mockResolvedValue({
        ok:     false,
        status: 503,
        json:   async () => ({ message: "Seal failed on last boot — contact the founder" }),
      });

      const client = makeClient();

      render(
        <QueryClientProvider client={client}>
          <SealSection />
        </QueryClientProvider>,
      );

      // Wait for the first 503 to land.
      const retryBtn = await screen.findByTestId("btn-seal-retry");

      // Click Retry — second 503 comes back.
      fireEvent.click(retryBtn);

      // Banner must still be there after the second failure.
      await waitFor(() => {
        expect(screen.queryByTestId("btn-seal-retry")).toBeTruthy();
      });

      // Seal card must NOT have rendered.
      expect(screen.queryByTestId("text-constitution-hash")).toBeNull();
    },
  );
});
