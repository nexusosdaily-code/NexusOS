import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { amountBucket, destinationType, telegramCommandCategory, trackEvent } from "@/lib/analytics";

describe("analytics wrapper", () => {
  beforeEach(() => { delete (window as any).umami; });
  afterEach(() => { delete (window as any).umami; });

  it("is a no-op when the tracker is absent", () => {
    expect(() => trackEvent("test_event")).not.toThrow();
  });

  it("forwards event data to Umami", () => {
    const track = vi.fn();
    (window as any).umami = { track };
    trackEvent("test_event", { surface: "test", count: 1 });
    expect(track).toHaveBeenCalledWith("test_event", { surface: "test", count: 1 });
  });

  it("swallows tracker errors", () => {
    (window as any).umami = { track: () => { throw new Error("tracker unavailable"); } };
    expect(() => trackEvent("test_event")).not.toThrow();
  });

  it("handles rejected tracker promises without an unhandled rejection", async () => {
    const track = vi.fn(() => Promise.reject(new Error("tracker offline")));
    window.umami = { track };
    expect(() => trackEvent("test_event")).not.toThrow();
    await Promise.resolve();
    expect(track).toHaveBeenCalledOnce();
  });

  it("is safe without a browser", () => {
    vi.stubGlobal("window", undefined);
    try {
      expect(() => trackEvent("test_event")).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("coarsens amounts into stable buckets", () => {
    expect(amountBucket(0)).toBe("none");
    expect(amountBucket(999)).toBe("under_1k");
    expect(amountBucket(1_000)).toBe("1k_10k");
    expect(amountBucket(9_999)).toBe("1k_10k");
    expect(amountBucket(10_000)).toBe("10k_100k");
    expect(amountBucket(99_999)).toBe("10k_100k");
    expect(amountBucket(100_000)).toBe("100k_1m");
    expect(amountBucket(999_999)).toBe("100k_1m");
    expect(amountBucket(1_000_000)).toBe("1m_plus");
    expect(amountBucket("not-a-number")).toBe("none");
  });

  it("classifies destination types without recording addresses", () => {
    expect(destinationType("bc1qexample")).toBe("bitcoin");
    expect(destinationType("lnbc123")).toBe("lightning");
    expect(destinationType("NXT-ABC")).toBe("nxt");
    expect(destinationType("someone@example.com")).toBe("other");
  });

  it("maps supported Telegram commands to fixed module categories", () => {
    expect(telegramCommandCategory("/help")).toBe("general");
    expect(telegramCommandCategory("/encode HELLO")).toBe("encoding");
    expect(telegramCommandCategory("/codegen wallet")).toBe("wls");
    expect(telegramCommandCategory("/mirror stats")).toBe("mirror");
    expect(telegramCommandCategory("/oracle anything")).toBe("oracle");
    expect(telegramCommandCategory("/lesson 4")).toBe("science");
    expect(telegramCommandCategory("/ecosystem")).toBe("traction");
    expect(telegramCommandCategory("/fee 100 480.6")).toBe("developer");
    expect(telegramCommandCategory("/experiments")).toBe("experiments");
    expect(telegramCommandCategory("/governance")).toBe("governance");
    expect(telegramCommandCategory("/refract arxiv")).toBe("broadcast");
  });

  it("maps unknown or potentially identifying Telegram input to custom", () => {
    expect(telegramCommandCategory("email@example.com")).toBe("custom");
    expect(telegramCommandCategory("bc1qaddress")).toBe("custom");
    expect(telegramCommandCategory("/arbitrary-secret-token")).toBe("custom");
  });
});