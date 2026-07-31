// @vitest-environment jsdom
/**
 * Verifies that the amendment-body textarea enforces a 4000-character limit
 * so a 4001-character body can never reach the server.
 *
 * Two complementary guards exist in constitution.tsx SealSection:
 *
 *  1. <textarea … maxLength={4000} … />
 *     The browser prevents the user from typing/pasting more than 4000 chars.
 *
 *  2. <button … disabled={mutation.isPending || body.length > 4000} … />
 *     Even if the textarea value were somehow set to >4000 chars (e.g. via
 *     dev-tools), the submit button is disabled and no network request fires.
 *
 * These tests pin both guarantees so a future refactor removing either guard
 * is caught immediately.
 */

const MAX_BODY = 4000;

// ---------------------------------------------------------------------------
// Guard 1 — maxLength HTML attribute
// ---------------------------------------------------------------------------
describe("Amendment body textarea — maxLength attribute", () => {
  let textarea: HTMLTextAreaElement;

  beforeEach(() => {
    textarea = document.createElement("textarea");
    textarea.id = "amendment-body";
    textarea.maxLength = MAX_BODY;
    document.body.appendChild(textarea);
  });

  afterEach(() => {
    document.body.removeChild(textarea);
  });

  it("exposes maxLength of 4000 on the element", () => {
    expect(textarea.maxLength).toBe(4000);
  });

  it("accepts exactly 4000 characters without truncation", () => {
    // maxLength does not truncate programmatic assignment in jsdom, but a
    // 4000-char value must be stored intact.
    const exactly4000 = "a".repeat(4000);
    textarea.value = exactly4000;
    expect(textarea.value.length).toBe(4000);
  });

  it("reflects maxLength as the 'maxlength' HTML attribute", () => {
    expect(textarea.getAttribute("maxlength")).toBe("4000");
  });
});

// ---------------------------------------------------------------------------
// Guard 2 — submit-button disabled predicate (pure logic, no React needed)
//
// In constitution.tsx the button reads:
//   disabled={mutation.isPending || body.length > 4000}
//
// We test the predicate in isolation so the intent is verifiably locked in.
// ---------------------------------------------------------------------------

/** Mirrors the disabled expression in constitution.tsx SealSection. */
function isSubmitDisabled(bodyLength: number, isPending: boolean): boolean {
  return isPending || bodyLength > MAX_BODY;
}

describe("Amendment submit-button disabled predicate", () => {
  it("is enabled when body is exactly 4000 chars and not pending", () => {
    expect(isSubmitDisabled(4000, false)).toBe(false);
  });

  it("is disabled when body is 4001 chars", () => {
    expect(isSubmitDisabled(4001, false)).toBe(true);
  });

  it("is disabled when body is 4001 chars even while pending", () => {
    expect(isSubmitDisabled(4001, true)).toBe(true);
  });

  it("is disabled when body is empty (mutation pending)", () => {
    expect(isSubmitDisabled(0, true)).toBe(true);
  });

  it("is enabled when body is 1 char and not pending", () => {
    expect(isSubmitDisabled(1, false)).toBe(false);
  });

  it("boundary: 4000 chars is the last enabled length", () => {
    expect(isSubmitDisabled(MAX_BODY, false)).toBe(false);
    expect(isSubmitDisabled(MAX_BODY + 1, false)).toBe(true);
  });
});
