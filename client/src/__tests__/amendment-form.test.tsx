// @vitest-environment jsdom
/**
 * Rendered integration tests for the SealSection amendment form.
 *
 * These tests render the real ConstitutionPage (which includes SealSection)
 * with a mocked KERNEL-band user and a mocked seal API response, then
 * exercise the 4000-character body limit through the actual DOM elements.
 *
 * Three guarantees are confirmed:
 *  1. The real textarea has maxlength="4000" (HTML attribute).
 *  2. The real submit button is disabled when body.length > 4000.
 *  3. Submitting the form with a 4001-char body never fires a POST request,
 *     because handleSubmit also validates body.length <= 4000.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import ConstitutionPage from "@/pages/constitution";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: 1, username: "testuser", spectralBand: "KERNEL" },
  }),
}));

vi.mock("@/hooks/use-page-meta", () => ({
  usePageMeta: () => {},
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...rest }: React.PropsWithChildren<{ href?: string; [k: string]: unknown }>) =>
    React.createElement("a", { href, ...rest }, children),
  useRoute: () => [false, {}],
  useLocation: () => ["/", vi.fn()],
}));

// ─── Mock seal response ───────────────────────────────────────────────────────

const MOCK_SEAL = {
  blockNumber: 42,
  psiChannel: "Ψ(52,20,H)",
  wavelengthNm: 542.5,
  hash: "deadbeef".repeat(8),
  timestamp: "2026-01-01T00:00:00.000Z",
  frequencyHz: 5.534e14,
  energyJoules: 3.67e-19,
  band: "SYSTEM",
  declaration: "Genesis declaration",
  amendments: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <ConstitutionPage />
    </QueryClientProvider>,
  );
}

async function openAmendmentForm() {
  // Wait for the seal to load and "Propose Amendment" button to appear
  const btn = await screen.findByTestId("button-propose-amendment", {}, { timeout: 4000 });
  fireEvent.click(btn);
  // Wait for the form to appear
  await screen.findByTestId("form-propose-amendment", {}, { timeout: 2000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Amendment body — rendered form (SealSection)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if ((url as string).includes("/api/constitution/seal")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(MOCK_SEAL),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("body textarea has maxlength attribute of 4000", async () => {
    renderPage();
    await openAmendmentForm();

    const textarea = screen.getByTestId("textarea-amendment-body");
    expect(textarea.getAttribute("maxlength")).toBe("4000");
  });

  it("submit button is disabled when body contains 4001 characters", async () => {
    renderPage();
    await openAmendmentForm();

    fireEvent.change(screen.getByTestId("input-amendment-title"), {
      target: { value: "Test Amendment" },
    });
    fireEvent.change(screen.getByTestId("textarea-amendment-body"), {
      target: { value: "x".repeat(4001) },
    });

    const submit = screen.getByTestId("button-submit-amendment") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("submit button is enabled when body contains exactly 4000 characters", async () => {
    renderPage();
    await openAmendmentForm();

    fireEvent.change(screen.getByTestId("input-amendment-title"), {
      target: { value: "Test Amendment" },
    });
    fireEvent.change(screen.getByTestId("textarea-amendment-body"), {
      target: { value: "x".repeat(4000) },
    });

    const submit = screen.getByTestId("button-submit-amendment") as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it("submitting the form with a 4001-char body fires no POST to the amendments API", async () => {
    renderPage();
    await openAmendmentForm();

    fireEvent.change(screen.getByTestId("input-amendment-title"), {
      target: { value: "Test Amendment" },
    });
    fireEvent.change(screen.getByTestId("textarea-amendment-body"), {
      target: { value: "b".repeat(4001) },
    });

    fireEvent.submit(screen.getByTestId("form-propose-amendment"));

    // handleSubmit must have returned early; no POST should have been issued
    const fetchMock = vi.mocked(fetch as ReturnType<typeof vi.fn>);
    const postCalls = fetchMock.mock.calls.filter(
      (args) =>
        typeof args[0] === "string" &&
        (args[0] as string).includes("amendments") &&
        (args[1] as RequestInit)?.method === "POST",
    );
    expect(postCalls).toHaveLength(0);
  });

  it("shows an error message when a 4001-char body is submitted via the form", async () => {
    renderPage();
    await openAmendmentForm();

    fireEvent.change(screen.getByTestId("input-amendment-title"), {
      target: { value: "Test Amendment" },
    });
    fireEvent.change(screen.getByTestId("textarea-amendment-body"), {
      target: { value: "c".repeat(4001) },
    });

    fireEvent.submit(screen.getByTestId("form-propose-amendment"));

    const errorBanner = await screen.findByTestId("text-amendment-error");
    expect(errorBanner.textContent).toMatch(/4000/);
  });
});
