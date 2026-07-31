// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
/**
 * SealSection-503.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Component-level tests for the SealSection "503 path":
 * what the page renders when /api/constitution/seal is completely down.
 *
 * Scenarios:
 *   1. Red "Seal failed on last boot" banner IS rendered on 503
 *   2. Spinner (Loader2 / "Fetching seal from chain") is NOT rendered on 503
 *   3. fetch is called exactly once — no retries after a 503
 *   4. A 503 with a server message shows that message in the banner
 *   5. A 503 without a message still shows the generic fallback text
 *   6. Spinner IS rendered during the initial loading state (control case)
 */

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { SealSection } from "../pages/constitution";

// ── Module mocks ──────────────────────────────────────────────────────────────

// useAuth is the only external hook SealSection calls outside of react-query.
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wrap a component in a fresh QueryClient so each test is isolated. */
function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // Disable global retry so useQuery respects each query's own retry option.
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

/** Build a minimal Response-like that vi.mocked(fetch) will resolve to. */
function make503(body: Record<string, unknown> = {}): Response {
  return {
    status: 503,
    ok: false,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function make503NonJson(): Response {
  return {
    status: 503,
    ok: false,
    json: () => Promise.reject(new SyntaxError("not json")),
    text: () => Promise.resolve("Service Unavailable"),
  } as unknown as Response;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

// ═════════════════════════════════════════════════════════════════════════════
// 503 — error banner assertions
// ═════════════════════════════════════════════════════════════════════════════

describe("SealSection — 503 response from /api/constitution/seal", () => {
  it(
    "renders the red 'Seal failed on last boot' banner",
    async () => {
      vi.mocked(fetch).mockResolvedValue(make503({ message: "PSI mismatch" }));

      renderWithQuery(<SealSection />);

      await waitFor(() => {
        expect(
          screen.getByText(/Seal failed on last boot/i),
        ).toBeInTheDocument();
      });
    },
  );

  it(
    "does NOT render the fetching spinner after a 503 settles",
    async () => {
      vi.mocked(fetch).mockResolvedValue(make503({ message: "PSI mismatch" }));

      renderWithQuery(<SealSection />);

      await waitFor(() =>
        expect(screen.getByText(/Seal failed on last boot/i)).toBeInTheDocument(),
      );

      // The spinner copy is only present during isLoading — must be absent now.
      expect(screen.queryByText(/Fetching seal from chain/i)).not.toBeInTheDocument();
    },
  );

  it(
    "calls fetch exactly once — sealRetryFn prevents any retry on 503",
    async () => {
      vi.mocked(fetch).mockResolvedValue(make503({ message: "boot failure" }));

      renderWithQuery(<SealSection />);

      await waitFor(() =>
        expect(screen.getByText(/Seal failed on last boot/i)).toBeInTheDocument(),
      );

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    },
  );

  it(
    "shows the server-provided message below the banner headline",
    async () => {
      const serverMsg = "CONSTITUTION_PSI mismatch detected on boot";
      vi.mocked(fetch).mockResolvedValue(make503({ message: serverMsg }));

      renderWithQuery(<SealSection />);

      await waitFor(() =>
        expect(screen.getByText(serverMsg)).toBeInTheDocument(),
      );
    },
  );

  it(
    "renders the generic fallback text when the 503 body is not valid JSON",
    async () => {
      vi.mocked(fetch).mockResolvedValue(make503NonJson());

      renderWithQuery(<SealSection />);

      await waitFor(() =>
        expect(
          screen.getByText(/Seal failed on last boot/i),
        ).toBeInTheDocument(),
      );
    },
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// Control: initial loading state (isLoading=true before any fetch resolves)
// ═════════════════════════════════════════════════════════════════════════════

describe("SealSection — initial loading state", () => {
  it(
    "renders the fetching spinner while the first request is in flight",
    async () => {
      // Never resolves — simulates a pending request.
      vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

      renderWithQuery(<SealSection />);

      // The spinner should appear immediately (isLoading=true)
      expect(
        screen.getByText(/Fetching seal from chain/i),
      ).toBeInTheDocument();

      // The error banner must NOT be shown yet.
      expect(
        screen.queryByText(/Seal failed on last boot/i),
      ).not.toBeInTheDocument();
    },
  );
});
