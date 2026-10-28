import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { UNICODE_SCRIPT_EXAMPLES } from "../shared/unicode-script-examples";
import {
  encodeUnicodeCE, decodeUnicodeCE, unicodeCoordinateWavelength,
  UNICODE_CE_PROFILE, UNICODE_CE_MAX_BYTES,
} from "../shared/unicode-ce";

const samples = [
  ...UNICODE_SCRIPT_EXAMPLES.map(example => example.text),
  "", "English ABC 123", "नमस्ते",
  "é", "e\u0301", "\uFEFFheader", "\u0000\n\r\t", "👩🏽‍💻",
  "\u{10FFFF}", "<img src=x onerror=alert(1)>", "𒀀𒀁",
];

describe("opt-in multilingual coordinate profile", () => {
  it.each(samples)("round-trips exact Unicode scalar sequences: %j", text => {
    const payload = encodeUnicodeCE(text);
    expect(payload.profile).toBe(UNICODE_CE_PROFILE);
    expect(payload.frames.length).toBe(new TextEncoder().encode(text).length);
    expect(decodeUnicodeCE(JSON.parse(JSON.stringify(payload)))).toBe(text);
  });

  it("has a stable golden vector and distinguishes the legacy bin alias", () => {
    expect(encodeUnicodeCE("中").frames).toEqual([
      { wdm: 100, oam: 1, pol: "H" }, { wdm: 56, oam: 1, pol: "H" },
      { wdm: 45, oam: 1, pol: "H" },
    ]);
    expect(encodeUnicodeCE("-").frames).toEqual([{ wdm: 45, oam: 0, pol: "H" }]);
    expect(unicodeCoordinateWavelength({ wdm: 45, oam: 1, pol: "H" })).toBe(520.625);
    expect(encodeUnicodeCE("𓀀").frames).toHaveLength(4);
  });
  it("retains Hebrew and cuneiform golden vectors without reassigning bins", () => {
    expect(encodeUnicodeCE("ש").frames).toEqual([
      { wdm: 87, oam: 1, pol: "H" }, { wdm: 41, oam: 1, pol: "H" },
    ]);
    expect(encodeUnicodeCE("𒀀").frames).toEqual([
      { wdm: 112, oam: 1, pol: "H" }, { wdm: 18, oam: 1, pol: "H" },
      { wdm: 0, oam: 1, pol: "H" }, { wdm: 0, oam: 1, pol: "H" },
    ]);
  });

  it("retains legacy ASCII wavelengths without changing legacy encoder output", () => {
    const require = createRequire(import.meta.url);
    const { charToNm } = require("../packages/ce-encoder/index.js");
    for (let value = 0; value < 128; value++) {
      const [frame] = encodeUnicodeCE(String.fromCharCode(value)).frames;
      expect(frame).toEqual({ wdm: value, oam: 0, pol: "H" });
      expect(unicodeCoordinateWavelength(frame)).toBe(charToNm(String.fromCharCode(value)));
    }
  });

  it("does not normalise equivalent spellings, remove BOMs or merge graphemes", () => {
    expect(encodeUnicodeCE("é")).not.toEqual(encodeUnicodeCE("e\u0301"));
    expect(decodeUnicodeCE(encodeUnicodeCE("\uFEFF"))).toBe("\uFEFF");
    expect([...decodeUnicodeCE(encodeUnicodeCE("👩🏽‍💻"))]).toHaveLength(4);
  });

  it.each([
    ["Hindi nukta", "\u0958", "\u0915\u093C"],
    ["Japanese voiced kana", "\u304C", "\u304B\u3099"],
    ["Korean Hangul", "한글", "한글"],
    ["Tamil split vowel sign", "\u0B95\u0BCA", "\u0B95\u0BC6\u0BBE"],
    ["Ancient Greek breathing and accent", "\u1F04", "\u03B1\u0313\u0301"],
  ])("preserves distinct but canonically equivalent %s sequences", (_label, composed, decomposed) => {
    expect(composed.normalize("NFC")).toBe(decomposed.normalize("NFC"));
    expect(encodeUnicodeCE(composed)).not.toEqual(encodeUnicodeCE(decomposed));
    expect(decodeUnicodeCE(encodeUnicodeCE(composed))).toBe(composed);
    expect(decodeUnicodeCE(encodeUnicodeCE(decomposed))).toBe(decomposed);
  });

  it.each([
    ["Hindi", "\u0915", [0xE0, 0xA4, 0x95]],
    ["Supplementary Han", "\u{20000}", [0xF0, 0xA0, 0x80, 0x80]],
    ["Old Persian", "\u{103A0}", [0xF0, 0x90, 0x8E, 0xA0]],
    ["Ogham", "\u1681", [0xE1, 0x9A, 0x81]],
    ["Linear B", "\u{10000}", [0xF0, 0x90, 0x80, 0x80]],
  ] as const)("matches independently specified UTF-8 bytes for %s", (_label, text, bytes) => {
    expect(encodeUnicodeCE(text).frames).toEqual(bytes.map(byte => ({
      wdm: byte & 127, oam: byte >>> 7, pol: "H",
    })));
  });

  it("matches the standalone Python reference in both directions", () => {
    const result = JSON.parse(execFileSync("python", ["-I", "-c", `
import json,sys
sys.path.insert(0,sys.argv[1])
from unicode_ce import encode_unicode_ce,decode_unicode_ce
samples=json.load(sys.stdin)
print(json.dumps([{"payload":encode_unicode_ce(s),"decoded":decode_unicode_ce(encode_unicode_ce(s))} for s in samples]))
`, resolve("packages/ce-encoder-py")], {
      input: JSON.stringify(samples), encoding: "utf8", timeout: 3000,
    }));
    samples.forEach((text, index) => {
      expect(result[index].payload).toEqual(encodeUnicodeCE(text));
      expect(decodeUnicodeCE(result[index].payload)).toBe(text);
      expect(result[index].decoded).toBe(text);
    });
  });

  it.each(["\uD800", "\uDFFF", "a\uD800b", "\uD800\uD800"])("rejects lone UTF-16 surrogates: %j", text => {
    expect(() => encodeUnicodeCE(text)).toThrow(/surrogate/);
  });

  it.each([
    { wdm: -1, oam: 0, pol: "H" }, { wdm: 128, oam: 0, pol: "H" },
    { wdm: 1.5, oam: 0, pol: "H" }, { wdm: true, oam: 0, pol: "H" },
    { wdm: 1, oam: 2, pol: "H" }, { wdm: 1, oam: 1, pol: "V" },
    { wdm: "1", oam: 0, pol: "H" }, { wdm: 1, oam: 0, pol: "H", authority: "admin" },
    { wdm: 1, pol: "H" }, null,
  ])("rejects malformed or ambiguous coordinates: %j", frame => {
    expect(() => decodeUnicodeCE({ profile: UNICODE_CE_PROFILE, frames: [frame] })).toThrow(/coordinate/i);
  });

  it.each([[0x80], [0xC0, 0xAF], [0xE4, 0xB8], [0xED, 0xA0, 0x80], [0xF4, 0x90, 0x80, 0x80]])(
    "rejects invalid UTF-8 rather than inserting replacement glyphs: %j", (...bytes) => {
      const frames = bytes.map(byte => ({ wdm: byte & 127, oam: byte >>> 7, pol: "H" }));
      expect(() => decodeUnicodeCE({ profile: UNICODE_CE_PROFILE, frames })).toThrow(/valid UTF-8/);
    },
  );

  it("rejects unknown profiles and enforces byte limits", () => {
    expect(() => decodeUnicodeCE({ profile: "ce128-character-table-v1", frames: [] })).toThrow(/profile/);
    expect(() => decodeUnicodeCE(null)).toThrow();
    expect(() => decodeUnicodeCE({ profile: UNICODE_CE_PROFILE, frames: "bad" })).toThrow();
    expect(() => encodeUnicodeCE("x".repeat(UNICODE_CE_MAX_BYTES + 1))).toThrow(/limit/);
    expect(() => encodeUnicodeCE("中".repeat(22_000))).toThrow(/limit/);
    expect(() => decodeUnicodeCE({
      profile: UNICODE_CE_PROFILE,
      frames: Array(UNICODE_CE_MAX_BYTES + 1).fill({ wdm: 0, oam: 0, pol: "H" }),
    })).toThrow(/oversized/);
  });
});
