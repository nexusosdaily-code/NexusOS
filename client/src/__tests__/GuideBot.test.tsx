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
import GuideBot, { matchPage, ASYNC_SUGGESTIONS } from "@/components/GuideBot";

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

// ── PAGES-collision guard ─────────────────────────────────────────────────────
// Fails loudly if a future keyword addition OR title-word addition makes
// CONCEPTUAL_Q keyword-navigate instead of taking the async /api/guide/ask
// path (which would silently break every test in the "conceptual question"
// suite).
//
// HOW matchPage SCORES — two independent branches that can both trigger:
//
//   Branch A — keyword match (+N×10 per hit):
//     If any string in page.keywords appears as a substring of the lowercased
//     question, the page accumulates keyword-length × 10 points.  Any score > 0
//     causes matchPage to return that page instead of null.
//
//   Branch B — title-word match (+5 per title word found in the question):
//     Each whitespace-delimited word of page.title (lowercased) is checked as a
//     substring of the question.  A match adds 5 points regardless of keyword
//     hits.  This means a future page titled e.g. "Pricing Engine" would score
//     +5 here because "pricing" appears in CONCEPTUAL_Q — silently stealing it
//     from the async path.
//
// When this test fails, pick a new CONCEPTUAL_Q that contains no keyword
// substring AND no title word from any PAGES entry.  Re-verify with:
//   grep -oi '<word>' (against every PAGES[*].keywords and PAGES[*].title)

describe("GuideBot — CONCEPTUAL_Q guard", () => {
  it("CONCEPTUAL_Q scores 0 against every PAGES entry (pick a new question if this fails)", () => {
    // Primary assertion: matchPage must return null (covers both scoring branches).
    const matched = matchPage(CONCEPTUAL_Q);
    if (matched !== null) {
      // Diagnostic: identify exactly which page stole the question and why,
      // so contributors can quickly pick a replacement CONCEPTUAL_Q.
      const q = CONCEPTUAL_Q.toLowerCase();
      const kwHits = matched.keywords.filter((kw) => q.includes(kw));
      const titleWordHits = matched.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => q.includes(w));
      console.error(
        `[CONCEPTUAL_Q guard] matchPage returned "${matched.title}" (${matched.route})\n` +
          `  Keyword hits   : ${kwHits.length > 0 ? kwHits.join(", ") : "none"}\n` +
          `  Title-word hits: ${titleWordHits.length > 0 ? titleWordHits.join(", ") : "none"}\n` +
          `  → Update CONCEPTUAL_Q so it shares no keyword or title word with any PAGES entry.`
      );
    }
    expect(matched).toBeNull();
  });
});

// ── ASYNC_SUGGESTIONS collision guard ─────────────────────────────────────────
// Fails loudly if any ASYNC_SUGGESTIONS entry unexpectedly keyword-matches a
// PAGES entry.  This catches the scenario where a future PAGES addition
// introduces a keyword (or title word) that matches one of the async-path
// suggestions, which would silently reroute the chip to keyword-navigation and
// stop exercising the async /api/guide/ask branch.
//
// If this test fails for a given entry, either:
//   (a) Remove the conflicting keyword/title from the new PAGES entry, OR
//   (b) Replace the SUGGESTIONS entry text with a new phrase that shares no
//       keyword/title-word with any PAGES row, update ASYNC_SUGGESTIONS, and
//       update CONCEPTUAL_Q if that entry is the one used there.

describe("GuideBot — ASYNC_SUGGESTIONS guard", () => {
  it("every ASYNC_SUGGESTIONS entry scores 0 against every PAGES entry (pick new text if this fails)", () => {
    const failures: string[] = [];

    for (const suggestion of ASYNC_SUGGESTIONS) {
      const matched = matchPage(suggestion);
      if (matched !== null) {
        const q = suggestion.toLowerCase();
        const kwHits = matched.keywords.filter((kw) => q.includes(kw));
        const titleWordHits = matched.title
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => q.includes(w));
        failures.push(
          `\n  Suggestion : "${suggestion}"` +
            `\n  Matched    : "${matched.title}" (${matched.route})` +
            `\n  Kw hits    : ${kwHits.length > 0 ? kwHits.join(", ") : "none"}` +
            `\n  Title hits : ${titleWordHits.length > 0 ? titleWordHits.join(", ") : "none"}` +
            `\n  → Update this ASYNC_SUGGESTIONS entry (and CONCEPTUAL_Q if it uses the same text)` +
            `    so it shares no keyword or title word with any PAGES entry.`,
        );
      }
    }

    if (failures.length > 0) {
      console.error(
        `[ASYNC_SUGGESTIONS guard] ${failures.length} entry/entries unexpectedly keyword-matched a PAGES row:` +
          failures.join(""),
      );
    }

    expect(failures).toHaveLength(0);
  });
});

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

  it("does NOT render a 'go deeper' chip when the API returns route: null", async () => {
    const ANSWER = "The compression field has no dedicated page yet.";

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ answer: ANSWER, route: null }),
    } as unknown as Response);

    renderGuideBot();
    openPanel();
    submitQuestion(CONCEPTUAL_Q);

    // Wait for the answer to be rendered
    await waitFor(() => {
      expect(screen.getByText(ANSWER)).toBeInTheDocument();
    });

    // No ↗ chip should be present anywhere in the document
    expect(screen.queryByText(/↗/)).not.toBeInTheDocument();
  });

  it("clicking the 'go deeper' chip calls navigate with the correct route", async () => {
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

    // Wait for the chip to appear
    const chip = await waitFor(() => screen.getByText(/↗ Standing Wave Trap/));

    fireEvent.click(chip);

    expect(mockNavigate).toHaveBeenCalledWith("/standing-wave-trap");
  });

  it("clicking the 'go deeper' chip closes the panel", async () => {
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

    // Wait for the chip to appear
    const chip = await waitFor(() => screen.getByText(/↗ Standing Wave Trap/));

    fireEvent.click(chip);

    // Panel should be closed — the input is no longer in the document
    expect(screen.queryByTestId("input-guide-bot")).not.toBeInTheDocument();
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

// ═════════════════════════════════════════════════════════════════════════════
// 5. Suggestion chip click → navigates correctly and closes the panel
// ═════════════════════════════════════════════════════════════════════════════

describe("GuideBot — suggestion chip click navigates and closes the panel", () => {
  // Suggestion chips trigger send(s) which may use setTimeout for navigation.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("clicking 'deploy a BRC-20 token?' chip calls navigate with /wnsp-ordinals", () => {
    renderGuideBot();
    openPanel();

    // The chip strips the "How do I " prefix — rendered text is "deploy a BRC-20 token?"
    const chip = screen.getByText("deploy a BRC-20 token?");
    fireEvent.click(chip);

    vi.advanceTimersByTime(600);

    expect(mockNavigate).toHaveBeenCalledWith("/wnsp-ordinals");
  });

  it("clicking a suggestion chip closes the panel after navigation", () => {
    renderGuideBot();
    openPanel();

    const chip = screen.getByText("deploy a BRC-20 token?");
    fireEvent.click(chip);

    act(() => { vi.advanceTimersByTime(1000); });

    // Panel closed — input is no longer in the document
    expect(screen.queryByTestId("input-guide-bot")).not.toBeInTheDocument();
  });

  it("clicking 'the NXT wallet?' chip calls navigate with /wallet", () => {
    renderGuideBot();
    openPanel();

    // "Where is the NXT wallet?" → regex strips "Where is " → renders "the NXT wallet?"
    const chip = screen.getByText("the NXT wallet?");
    fireEvent.click(chip);

    vi.advanceTimersByTime(600);

    expect(mockNavigate).toHaveBeenCalledWith("/wallet");
  });

  // ── Second-row chip (SUGGESTIONS.slice(4), index 5) ──────────────────────
  //
  // "What is the standing wave trap?" — the regex alternation matches the
  // shorter "What is " branch first, leaving "the standing wave trap?".
  it("clicking 'the standing wave trap?' chip (second row) calls navigate with /standing-wave-trap", () => {
    renderGuideBot();
    openPanel();

    // "What is the standing wave trap?" → regex strips "What is " → renders "the standing wave trap?"
    const chip = screen.getByText("the standing wave trap?");
    fireEvent.click(chip);

    vi.advanceTimersByTime(600);

    expect(mockNavigate).toHaveBeenCalledWith("/standing-wave-trap");
  });

  it("clicking a second-row chip closes the panel after navigation", () => {
    renderGuideBot();
    openPanel();

    // Same second-row chip — "What is the standing wave trap?" → "the standing wave trap?"
    const chip = screen.getByText("the standing wave trap?");
    fireEvent.click(chip);

    act(() => { vi.advanceTimersByTime(1000); });

    // Panel closed — input is no longer in the document
    expect(screen.queryByTestId("input-guide-bot")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. Suggestion chip with NO keyword match → async /api/guide/ask path
// ═════════════════════════════════════════════════════════════════════════════
//
// "What is your pricing methodology?" is the SUGGESTIONS entry that scores 0
// against every PAGES entry (confirmed by the CONCEPTUAL_Q guard above).
// Clicking its chip must take the async /api/guide/ask path and render the
// AI answer — NOT navigate immediately like keyword-matched chips do.
//
// Rendered chip label: regex strips "What is " → "your pricing methodology?"

describe("GuideBot — suggestion chip with no keyword match takes the async AI path", () => {
  // No fake timers: this branch relies on real async/await (fetch), not setTimeout.

  it("the async chip is present in the suggestion row after opening the panel", () => {
    renderGuideBot();
    openPanel();

    expect(screen.getByText("your pricing methodology?")).toBeInTheDocument();
  });

  it("clicking the async chip does NOT call navigate immediately", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // never resolves

    renderGuideBot();
    openPanel();

    const chip = screen.getByText("your pricing methodology?");
    fireEvent.click(chip);

    // Navigate must NOT be called — this chip takes the async path
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("clicking the async chip fires POST /api/guide/ask", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ answer: "Pricing is physics-derived.", route: null }),
    } as unknown as Response);

    renderGuideBot();
    openPanel();

    fireEvent.click(screen.getByText("your pricing methodology?"));

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/guide/ask",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("pricing methodology"),
        }),
      );
    });
  });

  it("clicking the async chip renders the AI answer in the chat", async () => {
    const ANSWER = "Pricing is determined by the physics fee formula — Λ=hf/c².";

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ answer: ANSWER, route: null }),
    } as unknown as Response);

    renderGuideBot();
    openPanel();

    fireEvent.click(screen.getByText("your pricing methodology?"));

    await waitFor(() => {
      expect(screen.getByText(ANSWER)).toBeInTheDocument();
    });
  });
});
