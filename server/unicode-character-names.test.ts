import { describe, expect, it } from "vitest";
import { loadUnicodeNames, inspectCodePoint, UNICODE_CATALOGUE_VERSION } from "../shared/unicode-catalogue";
import { inspectUnicodeName, searchUnicodeNames, UNICODE_NAMES_VERSION } from "../shared/unicode-character-names";
import data from "../shared/unicode-character-names-data.json";
import { decodeUnicodeCE, encodeUnicodeCE } from "../shared/unicode-ce";

describe("official Unicode 17 names and aliases", () => {
  it("loads a separate same-release index with ordered, assigned-only name ranges", async () => {
    expect((await loadUnicodeNames()).UNICODE_NAMES_VERSION).toBe(UNICODE_CATALOGUE_VERSION);
    expect(UNICODE_NAMES_VERSION).toBe("17.0.0");
    let previous = -1;
    for (const [start, end] of data.names) {
      expect(Number(start)).toBeGreaterThan(previous);
      expect(inspectCodePoint(Number(start)).status).toBe("assigned");
      expect(inspectCodePoint(Number(end)).status).toBe("assigned");
      previous = Number(end);
    }
  });
  it.each([
    [0x41, "LATIN CAPITAL LETTER A"], [0x301, "COMBINING ACUTE ACCENT"],
    [0x13000, "EGYPTIAN HIEROGLYPH A001"],
    [0x3400, "CJK UNIFIED IDEOGRAPH-3400"], [0x4E00, "CJK UNIFIED IDEOGRAPH-4E00"],
    [0x20000, "CJK UNIFIED IDEOGRAPH-20000"], [0x33479, "CJK UNIFIED IDEOGRAPH-33479"],
    [0xF900, "CJK COMPATIBILITY IDEOGRAPH-F900"], [0x2FA1D, "CJK COMPATIBILITY IDEOGRAPH-2FA1D"],
    [0xAC00, "HANGUL SYLLABLE GA"], [0xAC01, "HANGUL SYLLABLE GAG"],
    [0xC544, "HANGUL SYLLABLE A"], [0xD7A3, "HANGUL SYLLABLE HIH"],
    [0x17000, "TANGUT IDEOGRAPH-17000"], [0x187FF, "TANGUT IDEOGRAPH-187FF"],
    [0x18D1E, "TANGUT IDEOGRAPH-18D1E"], [0x18B00, "KHITAN SMALL SCRIPT CHARACTER-18B00"],
    [0x1B170, "NUSHU CHARACTER-1B170"],
    [0xFE18, "PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRAKCET"],
  ])("preserves the official name at U+%s", (point, name) => {
    expect(inspectUnicodeName(point).name).toBe(name);
    expect(searchUnicodeNames(name).points).toContain(point);
    const text = String.fromCodePoint(point);
    expect(decodeUnicodeCE(encodeUnicodeCE(text))).toBe(text);
  });
  it("keeps controls nameless and preserves every official alias type without replacing names", () => {
    expect(inspectUnicodeName(0)).toEqual({
      name: null, controlLabel: "<control>",
      aliases: [{ name: "NULL", type: "control" }, { name: "NUL", type: "abbreviation" }],
    });
    expect(searchUnicodeNames("line feed").points).toContain(0xA);
    expect(inspectUnicodeName(0xFE18).aliases).toContainEqual({
      name: "PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRACKET", type: "correction",
    });
    expect(searchUnicodeNames("PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRACKET").points).toEqual([0xFE18]);
    const types = new Set<string>();
    for (const [hex, entries] of Object.entries(data.aliases)) {
      const point = Number(hex);
      expect(inspectUnicodeName(point).aliases).toEqual(entries.map(([name, type]) => ({ name, type })));
      for (const [, type] of entries) types.add(type);
    }
    expect([...types].sort()).toEqual(["abbreviation", "alternate", "control", "correction", "figment"]);
    // A match on both name and alias is still one scalar result.
    const matches = searchUnicodeNames("PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRA");
    expect(matches.points).toEqual([0xFE18]);
  });
  it.each([0x378, 0xE000, 0xF8FF, 0xF0000, 0x10FFFD, 0xFDD0, 0x10FFFF, 0x3347A, 0xD7A4])(
    "does not invent names for private, noncharacter or unassigned U+%s", point => {
      expect(inspectUnicodeName(point)).toEqual({ name: null, controlLabel: null, aliases: [] });
    },
  );
  it("bounds output, paginates in scalar order, handles empty search and rejects invalid bounds", () => {
    const first = searchUnicodeNames("cjk unified ideograph");
    const second = searchUnicodeNames("CJK UNIFIED IDEOGRAPH", 64);
    expect(first.total).toBeGreaterThan(100_000);
    expect(first.points).toHaveLength(64);
    expect(second.total).toBe(first.total);
    expect(second.points[0]).toBeGreaterThan(first.points[63]);
    expect(searchUnicodeNames("cjk unified ideograph", first.total).points).toEqual([]);
    expect(searchUnicodeNames("   ")).toEqual({ points: [], total: 0 });
    expect(searchUnicodeNames("not an official character name")).toEqual({ points: [], total: 0 });
    expect(searchUnicodeNames(" snowman ").points).toContain(0x2603);
    expect(searchUnicodeNames("<control>").points).toEqual([]);
    for (const [offset, limit] of [[-1, 64], [0.5, 64], [0, 65], [0, 0], [Infinity, 64]]) {
      expect(() => searchUnicodeNames("a", offset, limit)).toThrow("Invalid name search page");
    }
    expect(() => searchUnicodeNames("a".repeat(121))).toThrow("120");
    expect(() => inspectUnicodeName(0xD800)).toThrow("Surrogates");
  });
});
