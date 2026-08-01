// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
/**
 * GuideBot.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Component-level tests for GuideBot's async /api/guide/ask path.
 *
 * Scenarios covered:
 *   1. Conceptual question → POST /api/guide/ask fired → thinking dots shown
 *      → AI answer rendered in the chat panel.
 *   2. API error → graceful fallback message shown, no crash.
 *   3. Keyword match → navigates immediately, no API call fired.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import GuideBot from "@/components/GuideBot";

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/", mockNavigate],
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderGuideBot() {
  return render(<GuideBot />);
}

/** Open the chat panel by clicking the trigger button. */
function openPanel() {
  fireEvent.click(screen.getByTestId("button-guide-bot-open"));
}

/** Type a question into the input and press Send. */
function submitQuestion(question: string) {
  fireEvent.change(screen.getByTestId("input-guide-bot"), {
    target: { value: question },
  });
  fireEvent.click(screen.getByTestId("button-guide-bot-send"));
}

// A question that scores 0 against every PAGES keyword and title word
// (verified with the full PAGES array — no kw or title-word substring match).
// It always takes the async /api/guide/ask path and never keyword-navigates.
const CONCEPTUAL_Q = "What is your pricing methodology?";

// ── Global setup / teardown ───────────────────────────────────────────────────

beforeEach(() => {
  mockNavigate.mockReset();
  vi.stubGlobal("fetch", vi.fn());
  // Wipe persisted chat history so each test starts clean
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  sessionStorage.clear();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. Conceptual question → API called → thinking dots → answer rendered
// ═════════════════════════════════════════════════════════════════════════════

describe("GuideBot — conceptual question (no keyword match)", () => {
  it("calls POST /api/guide/ask with the question body", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ answer: "The compression field answer.", route: null }),
    } as unknown as Response);

    renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/guide/ask",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: expect.stringContaining("pricing methodology"),
        }),
      );
    });
  });

  it("shows the thinking dots (send button shows '…') while the request is in flight", async () => {
    // Never resolves — simulates a perpetually pending fetch
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    await waitFor(() => {
      expect(screen.getByTestId("button-guide-bot-send")).toHaveTextContent("…");
    });
  });

  it("renders three animated dots in the chat while loading", async () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    await waitFor(() => {
      const dots = document.querySelectorAll(".animate-bounce");
      expect(dots.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("renders the AI answer text after the fetch resolves", async () => {
    const ANSWER = "The compression field is the unified substrate of all forces.";

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ answer: ANSWER, route: null }),
    } as unknown as Response);

    renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    await waitFor(() => {
      expect(screen.getByText(ANSWER)).toBeInTheDocument();
    });
  });

  it("renders the 'go deeper' chip when the API returns a route", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          answer: "Standing wave traps form stable matter.",
          route: "/standing-wave-trap",
          routeTitle: "Standing Wave Trap",
        }),
    } as unknown as Response);

    renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    await waitFor(() => {
      // The chip renders "↗ Standing Wave Trap"
      expect(screen.getByText(/↗ Standing Wave Trap/)).toBeInTheDocument();
    });
  });

  it("thinking dots disappear after the answer arrives", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ answer: "Done.", route: null }),
    } as unknown as Response);

    renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    await waitFor(() => expect(screen.getByText("Done.")).toBeInTheDocument());

    // No animate-bounce dots should remain
    expect(document.querySelectorAll(".animate-bounce").length).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. API error → graceful fallback, no crash
// ═════════════════════════════════════════════════════════════════════════════

describe("GuideBot — API error fallback", () => {
  it("shows the fallback message on a non-ok HTTP response (500)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as unknown as Response);

    renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    await waitFor(() => {
      expect(screen.getByText(/Guide temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  it("shows the fallback message when fetch rejects (network error)", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    await waitFor(() => {
      expect(screen.getByText(/Guide temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  it("does not crash — send button reverts to '→' after an error settles", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    await waitFor(() =>
      expect(screen.getByText(/Guide temporarily unavailable/i)).toBeInTheDocument(),
    );

    // thinking=false → button label reverts
    expect(screen.getByTestId("button-guide-bot-send")).toHaveTextContent("→");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Page-reload persistence — messages survive unmount + remount
// ═════════════════════════════════════════════════════════════════════════════

describe("GuideBot — conversation survives a page reload (unmount + remount)", () => {
  it("shows prior user question and AI answer after remounting (simulated reload)", async () => {
    const ANSWER = "Pricing is calculated via the physics fee formula.";

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ answer: ANSWER, route: null }),
    } as unknown as Response);

    // ── First mount: ask a question, receive an answer ────────────────────
    const { unmount } = renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    await waitFor(() => expect(screen.getByText(ANSWER)).toBeInTheDocument());

    // ── Simulate reload: unmount the component ────────────────────────────
    unmount();

    // ── Second mount: remount without clearing sessionStorage ─────────────
    renderGuideBot();
    openPanel();

    // Both the original question and the AI answer must still be visible
    expect(screen.getByText(CONCEPTUAL_Q)).toBeInTheDocument();
    expect(screen.getByText(ANSWER)).toBeInTheDocument();
  });

  it("does not persist the thinking-dot indicator across a reload", async () => {
    // Never resolves — simulates a session interrupted mid-request
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    const { unmount } = renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    // Wait for thinking state to be active
    await waitFor(() =>
      expect(screen.getByTestId("button-guide-bot-send")).toHaveTextContent("…"),
    );

    // Interrupt mid-flight (simulate closing tab / navigating away)
    unmount();

    // Remount — thinking dots must NOT appear (they are transient, not persisted)
    renderGuideBot();
    openPanel();

    expect(document.querySelectorAll(".animate-bounce").length).toBe(0);
  });

  it("falls back to the greeting when sessionStorage contains corrupt data", () => {
    sessionStorage.setItem("nexusos-guidebot-history", "NOT VALID JSON{{");

    renderGuideBot();
    openPanel();

    // Greeting must be shown, no crash
    expect(
      screen.getByText(/Hi! I'm the NexusOS guide/i),
    ).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Keyword match → navigates immediately, no API call
// ═════════════════════════════════════════════════════════════════════════════

describe("GuideBot — keyword match navigates without calling the API", () => {
  // These tests need fake timers to control the setTimeout navigation callbacks.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not call fetch when the question keyword-matches a page", () => {
    renderGuideBot();
    openPanel();
    // "wallet" is a keyword for /wallet — guaranteed keyword match
    submitQuestion("wallet");

    vi.advanceTimersByTime(600);

    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("shows the navigation confirmation text in the chat for a keyword match", () => {
    renderGuideBot();
    openPanel();
    submitQuestion("wallet");

    // Bot message renders "↗ NXT Wallet" as the route title (synchronous state update)
    expect(screen.getByText(/↗ NXT Wallet/i)).toBeInTheDocument();
    // And the "Navigating now…" sub-text
    expect(screen.getByText(/Navigating now/i)).toBeInTheDocument();
  });

  it("triggers navigation to /wallet after the setTimeout fires", () => {
    renderGuideBot();
    openPanel();
    submitQuestion("wallet");

    vi.advanceTimersByTime(600);

    expect(mockNavigate).toHaveBeenCalledWith("/wallet");
  });
});
