// @vitest-environment happy-dom

/**
 * Task #228 — Confirm the violation badge disappears automatically once the
 * breach is resolved.
 *
 * Imports the real ConstitutionViolationBadge component exported from hub.tsx
 * so that future changes to the production badge logic are caught immediately.
 * The QueryClient cache is pre-seeded so no HTTP requests are needed.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Production component under test ──────────────────────────────────────────
// Importing the real exported component ensures this test catches any future
// change to the badge logic in hub.tsx.
import { ConstitutionViolationBadge } from "./hub";

// ── Stub wouter's <Link> so it doesn't need a router context ─────────────────
vi.mock("wouter", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocation: () => ["/hub", () => {}],
}));

// ── Type shorthand ────────────────────────────────────────────────────────────
type ArticleStatus = "COMPLIANT" | "VIOLATED";

// ── Helper: build a QueryClient pre-loaded with constitution status ───────────
function makeClient(statuses: Record<string, ArticleStatus>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(["/api/constitution/status"], {
    constitution: {
      version: "1.0",
      enforcedAt: new Date().toISOString(),
      articles: Object.fromEntries(
        Object.entries(statuses).map(([id, status]) => [
          id,
          { rule: id, status, detail: "test" },
        ]),
      ),
    },
  });
  return client;
}

function renderBadge(statuses: Record<string, ArticleStatus>) {
  const client = makeClient(statuses);
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <ConstitutionViolationBadge />
      </QueryClientProvider>,
    ),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ConstitutionViolationBadge (hub.tsx)", () => {
  it("shows the badge when at least one article is VIOLATED", () => {
    renderBadge({
      "C-0001": "COMPLIANT",
      "C-0002": "VIOLATED",   // ← one violation
      "C-0005": "COMPLIANT",
      "C-0006": "COMPLIANT",
    });

    expect(
      screen.getByTestId("badge-constitution-violation"),
    ).toBeInTheDocument();
  });

  it("hides the badge when all articles are COMPLIANT", () => {
    renderBadge({
      "C-0001": "COMPLIANT",
      "C-0002": "COMPLIANT",
      "C-0005": "COMPLIANT",
      "C-0006": "COMPLIANT",
    });

    expect(
      screen.queryByTestId("badge-constitution-violation"),
    ).not.toBeInTheDocument();
  });

  it("clears the badge automatically when a VIOLATED state transitions to COMPLIANT", () => {
    // ── Phase 1: start with a violation ──────────────────────────────────────
    const client = makeClient({
      "C-0001": "VIOLATED",
      "C-0002": "COMPLIANT",
      "C-0005": "COMPLIANT",
      "C-0006": "COMPLIANT",
    });

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ConstitutionViolationBadge />
      </QueryClientProvider>,
    );

    expect(
      screen.getByTestId("badge-constitution-violation"),
    ).toBeInTheDocument();

    // ── Phase 2: server resolves the breach — update the cache ───────────────
    // This simulates what happens when the 60-second refetch returns all-clear.
    act(() => {
      client.setQueryData(["/api/constitution/status"], {
        constitution: {
          version: "1.0",
          enforcedAt: new Date().toISOString(),
          articles: {
            "C-0001": { rule: "C-0001", status: "COMPLIANT", detail: "resolved" },
            "C-0002": { rule: "C-0002", status: "COMPLIANT", detail: "ok" },
            "C-0005": { rule: "C-0005", status: "COMPLIANT", detail: "ok" },
            "C-0006": { rule: "C-0006", status: "COMPLIANT", detail: "ok" },
          },
        },
      });
    });

    rerender(
      <QueryClientProvider client={client}>
        <ConstitutionViolationBadge />
      </QueryClientProvider>,
    );

    expect(
      screen.queryByTestId("badge-constitution-violation"),
    ).not.toBeInTheDocument();
  });

  it("shows the badge when ALL articles are VIOLATED", () => {
    renderBadge({
      "C-0001": "VIOLATED",
      "C-0002": "VIOLATED",
      "C-0005": "VIOLATED",
      "C-0006": "VIOLATED",
    });

    expect(
      screen.getByTestId("badge-constitution-violation"),
    ).toBeInTheDocument();
  });

  it("keeps the badge absent when no data has loaded yet", () => {
    // QueryClient with no pre-seeded data → data is undefined → badge hidden
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <ConstitutionViolationBadge />
      </QueryClientProvider>,
    );

    expect(
      screen.queryByTestId("badge-constitution-violation"),
    ).not.toBeInTheDocument();
  });
});
