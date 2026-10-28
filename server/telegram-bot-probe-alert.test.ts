/**
 * telegram-bot-probe-alert.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for sendProbeAlert() in server/telegram-bot.ts.
 *
 * Verifies that the Telegram HTTP request body:
 *   1. Uses parse_mode "HTML"
 *   2. Escapes <, >, and & in the probe value
 *   3. Truncates the value to the first 300 characters BEFORE escaping
 *   4. Applies the correct field label ("Referer" vs "User-Agent")
 *   5. Skips the fetch call entirely when token/adminId env vars are absent
 *
 * fetch is stubbed globally; Telegraf is mocked so no bot is initialised.
 * TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_ID are set/cleared around each test.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── Mock telegraf before anything imports it ──────────────────────────────────
// telegram-bot.ts constructs a Telegraf instance at module load time when a
// token is present. We stub it so no real bot is initialised in tests.
vi.mock("telegraf", () => ({
  Telegraf: class {
    use()    { return this; }
    launch() { return Promise.resolve(); }
    stop()   {}
    command() { return this; }
    on()      { return this; }
    action()  { return this; }
    hears()   { return this; }
    catch()   { return this; }
  },
}));

// ── Stub fetch globally ───────────────────────────────────────────────────────
const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
vi.stubGlobal("fetch", mockFetch);

// ── Import the real sendProbeAlert (NOT mocked) ───────────────────────────────
import { sendProbeAlert } from "./telegram-bot";

// ── Lifecycle ─────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "test-token-abc";
  process.env.TELEGRAM_ADMIN_ID  = "123456789";
});

afterEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_ADMIN_ID;
});

// ── Helper ────────────────────────────────────────────────────────────────────
/**
 * Call sendProbeAlert and return the parsed JSON body of the resulting
 * fetch() call. Fails fast if fetch was not called exactly once.
 */
async function alertBody(
  field: "ua" | "referer",
  value: string,
  hits = 6,
): Promise<Record<string, unknown>> {
  await sendProbeAlert(field, value, hits);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const init = mockFetch.mock.calls[0][1] as RequestInit;
  return JSON.parse(init.body as string);
}

// ═══════════════════════════════════════════════════════════════════════════
// parse_mode and field labels
// ═══════════════════════════════════════════════════════════════════════════

describe("sendProbeAlert — parse_mode and field labels", () => {
  it("sends parse_mode HTML for a UA probe", async () => {
    const body = await alertBody("ua", "SomeCrawler/1.0");
    expect(body.parse_mode).toBe("HTML");
  });

  it("sends parse_mode HTML for a referer probe", async () => {
    const body = await alertBody("referer", "http://example-scanner.com/");
    expect(body.parse_mode).toBe("HTML");
  });

  it("labels the field 'User-Agent' for ua probes", async () => {
    const body = await alertBody("ua", "SomeCrawler/1.0");
    expect(body.text as string).toContain("User-Agent");
  });

  it("labels the field 'Referer' for referer probes", async () => {
    const body = await alertBody("referer", "http://example-scanner.com/");
    expect(body.text as string).toContain("Referer");
  });

  it("skips the fetch call when TELEGRAM_BOT_TOKEN is absent", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    await sendProbeAlert("ua", "SomeCrawler/1.0", 6);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips the fetch call when TELEGRAM_ADMIN_ID is absent", async () => {
    delete process.env.TELEGRAM_ADMIN_ID;
    await sendProbeAlert("referer", "http://x.com/", 6);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HTML escaping — referer probe values
// ═══════════════════════════════════════════════════════════════════════════

describe("sendProbeAlert — HTML escaping of referer probe values", () => {
  it("escapes '<' to '&lt;'", async () => {
    const body = await alertBody("referer", "http://evil.com/<script>alert(1)</script>");
    const text = body.text as string;
    expect(text).toContain("&lt;script&gt;");
    expect(text).not.toContain("<script>");
  });

  it("escapes '>' to '&gt;'", async () => {
    const body = await alertBody("referer", "http://evil.com/foo>bar");
    const text = body.text as string;
    expect(text).toContain("foo&gt;bar");
    expect(text).not.toContain("foo>bar");
  });

  it("escapes '&' to '&amp;'", async () => {
    const body = await alertBody("referer", "http://evil.com/page?a=1&b=2");
    const text = body.text as string;
    expect(text).toContain("a=1&amp;b=2");
    // Raw & must not appear (except as part of &amp; itself)
    expect(text).not.toMatch(/a=1&[^a]/);
  });

  it("escapes all three HTML specials together", async () => {
    const body = await alertBody("referer", "http://bad.com/<b>Click</b>&foo=1");
    const text = body.text as string;
    // Extract the value from inside the <code> block to avoid colliding with the
    // template's own <b> formatting tags.
    const codeSection = text.match(/<code>([\s\S]*?)<\/code>/)?.[1] ?? "";
    expect(codeSection).toContain("&lt;b&gt;Click&lt;/b&gt;&amp;foo=1");
    expect(codeSection).not.toContain("<b>Click</b>");
    expect(codeSection).not.toContain("&foo=1");
  });

  it("does not mangle a plain referer with no special characters", async () => {
    const safeRef = "http://ordinarysite.com/page/path";
    const body = await alertBody("referer", safeRef);
    expect(body.text as string).toContain(safeRef);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HTML escaping — UA probe values (same _escapeTgHtml code path)
// ═══════════════════════════════════════════════════════════════════════════

describe("sendProbeAlert — HTML escaping of UA probe values", () => {
  it("escapes '<' and '>' in a UA value", async () => {
    const body = await alertBody("ua", "EvilUA/<script>xss</script>/99.0");
    const text = body.text as string;
    expect(text).toContain("&lt;script&gt;");
    expect(text).not.toContain("<script>");
  });

  it("escapes '&' in a UA value", async () => {
    const body = await alertBody("ua", "MyUA/1.0 (track&trace=1)");
    const text = body.text as string;
    expect(text).toContain("&amp;trace=1");
    expect(text).not.toContain("track&t");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 300-character truncation — referer probe
// sendProbeAlert calls _escapeTgHtml(value.slice(0, 300)) so truncation
// happens BEFORE escaping. Characters beyond position 300 must not appear.
// ═══════════════════════════════════════════════════════════════════════════

describe("sendProbeAlert — 300-character truncation of referer values", () => {
  it("a referer of exactly 300 characters is rendered in full", async () => {
    const val300 = "A".repeat(300);
    const body   = await alertBody("referer", val300);
    // After escaping 'A'.repeat(300) the text is unchanged; all 300 chars appear
    expect(body.text as string).toContain(val300);
  });

  it("a referer longer than 300 characters is truncated to the first 300", async () => {
    const first300 = "B".repeat(300);
    const val400   = first300 + "C".repeat(100);
    const body     = await alertBody("referer", val400);
    const text     = body.text as string;
    expect(text).toContain(first300);
    // The tail beyond position 300 must not appear in the message
    expect(text).not.toContain("C".repeat(10));
  });

  it("HTML specials beyond position 300 are truncated away and never escaped into the message", async () => {
    // '<evil>' starts at position 300 — entirely outside the truncation window
    const val = "D".repeat(300) + "<evil>";
    const body = await alertBody("referer", val);
    const text = body.text as string;
    expect(text).not.toContain("&lt;evil&gt;");
    expect(text).not.toContain("<evil>");
  });

  it("HTML specials within the first 300 characters are escaped in the message", async () => {
    // '<xss>' at position 5 — well within the 300-char window
    const val  = "E".repeat(5) + "<xss>" + "F".repeat(400);
    const body = await alertBody("referer", val);
    const text = body.text as string;
    expect(text).toContain("&lt;xss&gt;");
    expect(text).not.toContain("<xss>");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 300-character truncation — UA probe (same code path)
// ═══════════════════════════════════════════════════════════════════════════

describe("sendProbeAlert — 300-character truncation of UA values", () => {
  it("a UA longer than 300 characters is truncated to the first 300", async () => {
    const first300 = "G".repeat(300);
    const val400   = first300 + "H".repeat(100);
    const body     = await alertBody("ua", val400);
    const text     = body.text as string;
    expect(text).toContain(first300);
    expect(text).not.toContain("H".repeat(10));
  });

  it("HTML specials at position 299 (last visible char) are escaped correctly", async () => {
    // '<' at position 299 — exactly the last included character
    const val = "I".repeat(299) + "<" + "J".repeat(100);
    const body = await alertBody("ua", val);
    const text = body.text as string;
    expect(text).toContain("I".repeat(10) + "I"); // the 'I' prefix is present
    expect(text).toContain("&lt;");               // the '<' at 299 is escaped
    expect(text).not.toContain("<J");             // the 'J' tail is gone
  });
});
