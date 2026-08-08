/**
 * guide-knowledge.test.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Unit tests for the knowledge-base scoring function exported from
 * guide-knowledge.ts.  Covers:
 *   • exact-phrase match wins over individual-word matches
 *   • best entry returned when multiple entries share overlapping tags
 *   • no-match question returns confidence "low" (fallback answer)
 *   • confidence bands (high / medium) are assigned correctly
 */

import { describe, it, expect } from "vitest";
import { findAnswer } from "./guide-knowledge";

// ── helper ──────────────────────────────────────────────────────────────────
function answerId(question: string): string | undefined {
  // The answer text is unique per entry; we can identify which entry won by
  // checking the route — it is the most stable unique field.
  const result = findAnswer(question);
  return result.route ?? undefined;
}

// ── no-match ────────────────────────────────────────────────────────────────
describe("findAnswer – no matching tags", () => {
  it("returns confidence 'low' for a completely unrelated question", () => {
    const result = findAnswer("what is the best pizza topping");
    expect(result.confidence).toBe("low");
  });

  it("returns confidence 'low' for a stop-word-only question", () => {
    const result = findAnswer("what is it that they do");
    expect(result.confidence).toBe("low");
  });

  it("returns the fallback route /paper for a no-match result", () => {
    const result = findAnswer("tell me about dragons");
    expect(result.route).toBe("/paper");
  });
});

// ── exact-phrase match beats individual-word match ───────────────────────────
describe("findAnswer – phrase match precedence", () => {
  it("matches the lambda entry when the phrase 'compression mass' appears in the question", () => {
    const result = findAnswer("what is the compression mass equation");
    expect(result.route).toBe("/oscillating-quanta");
    expect(result.confidence).not.toBe("low");
  });

  it("matches standing-wave-trap when the phrase 'standing wave trap' appears", () => {
    const result = findAnswer("how does the standing wave trap create a particle");
    expect(result.route).toBe("/standing-wave-trap");
    expect(result.confidence).not.toBe("low");
  });

  it("matches ghost-nodes entry for 'ghost nodes'", () => {
    const result = findAnswer("explain ghost nodes in the periodic table");
    expect(result.route).toBe("/matter-protocol");
  });
});

// ── best match when multiple entries share overlapping tags ──────────────────
describe("findAnswer – disambiguation of overlapping tags", () => {
  /**
   * 'decoherence' and 'observer-trap' both contain "einselection" in their
   * tag lists.  A question focused on environmental decoherence should match
   * the decoherence entry (more matching tags) rather than observer-trap.
   */
  it("prefers decoherence entry over observer-trap for an environment-focused question", () => {
    const result = findAnswer(
      "how does environmental decoherence cause wavefunction collapse via zurek einselection"
    );
    expect(result.route).toBe("/quantum-threshold"); // decoherence entry
  });

  /**
   * 'observer-trap' and 'decoherence' both mention collapse/measurement.
   * A question focused on measurement and pointer states should score higher
   * on observer-trap.
   */
  it("prefers observer-trap entry for a measurement / pointer-state question", () => {
    const result = findAnswer(
      "observer trap measurement projector pointer state self measurement"
    );
    expect(result.route).toBe("/the-observer"); // observer-trap entry
  });

  /**
   * 'four-forces' and 'gravity-decorrelation' both contain "gravity".
   * A question about unification of forces should resolve to four-forces.
   */
  it("prefers four-forces entry when the question is about force unification", () => {
    const result = findAnswer(
      "how are the four forces unified into a single field"
    );
    expect(result.route).toBe("/unified-compression-theory"); // four-forces
  });

  /**
   * 'gravity-decorrelation' entry should win when the question explicitly
   * asks about decoupling or removing gravity.
   */
  it("prefers gravity-decorrelation entry for a gravity-decoupling question", () => {
    const result = findAnswer(
      "how does gravity decorrelation work at a ghost node address"
    );
    expect(result.route).toBe("/quantum-threshold"); // gravity-decorrelation
  });

  /**
   * 'bogoliubov' and 'squeezed-state' share squeezing-related tokens.
   * A question specifically about the Bogoliubov transform should win on
   * the bogoliubov entry.
   */
  it("prefers bogoliubov entry over squeezed-state for a transform-focused question", () => {
    const result = findAnswer(
      "explain the bogoliubov transform and squeezing parameter r"
    );
    expect(result.route).toBe("/the-bogoliubov-transform");
  });

  /**
   * 'afc-memory' and 'dlcz' are both tagged "act 14" and share quantum-memory
   * vocabulary.  A question focused on atomic frequency comb storage should
   * resolve to afc-memory.
   */
  it("prefers afc-memory entry for an atomic-frequency-comb question", () => {
    const result = findAnswer(
      "how does the atomic frequency comb store photons"
    );
    expect(result.route).toBe("/the-memory"); // both share route; verify answer
    // The afc entry's answer uniquely contains "AFC"
    expect(result.answer).toMatch(/AFC|atomic frequency comb/i);
  });

  /**
   * 'lossless-channel' and 'no-cloning' overlap on "lossless channel" vocabulary.
   * A question about the tensor-product channel should match lossless-channel.
   * We deliberately avoid "ghost nodes" to prevent a tie with the ghost-nodes entry.
   */
  it("prefers lossless-channel entry when the question uses 'lossless channel' verbatim", () => {
    const result = findAnswer(
      "how does the lossless channel use tensor product states to achieve zero loss"
    );
    expect(result.route).toBe("/lossless-channel");
    expect(result.answer).toMatch(/tensor product|zero net propagation/i);
  });
});

// ── confidence band assignment ────────────────────────────────────────────────
describe("findAnswer – confidence bands", () => {
  it("returns 'high' confidence for a well-matched multi-phrase question (score ≥ 20)", () => {
    // "lambda=hf" is a multi-word tag (score +=2*12=24 on its own)
    const result = findAnswer("what does lambda=hf mean");
    expect(result.confidence).toBe("high");
  });

  it("returns exactly 'medium' confidence when only a single one-word tag phrase-matches (score = 12)", () => {
    // "dlcz" is a 1-word tag exclusively in the dlcz entry.
    // Phrase match of a 1-word tag: tagWords.length * 12 = 1 * 12 = 12.
    // 12 is strictly between MEDIUM_THRESHOLD (8) and HIGH_THRESHOLD (20).
    // Therefore confidence must be "medium", not "high" and not "low".
    const result = findAnswer("what is dlcz");
    expect(result.confidence).toBe("medium");
  });
});

// ── return shape ─────────────────────────────────────────────────────────────
describe("findAnswer – return shape", () => {
  it("always returns an object with answer, confidence, and optional route", () => {
    const result = findAnswer("what is the seed frequency f0 555 THz");
    expect(typeof result.answer).toBe("string");
    expect(["high", "medium", "low"]).toContain(result.confidence);
    expect(result.route).toBeDefined();
  });

  it("matched entry answer contains relevant content", () => {
    const result = findAnswer("what is the seed frequency 555 THz universal one");
    expect(result.answer).toMatch(/555|seed frequency|universal one/i);
  });
});
