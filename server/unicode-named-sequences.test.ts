import { describe, expect, it } from "vitest";
import data from "../shared/unicode-named-sequences-data.json";
import {
  lookupUnicodeNamedSequences, searchUnicodeNamedSequences, searchUnicodeNamedSequencesContaining, searchUnicodeNames, UNICODE_NAMED_SEQUENCES_VERSION,
} from "../shared/unicode-character-names";
import { inspectCodePoint, UNICODE_CATALOGUE_VERSION } from "../shared/unicode-catalogue";
import { encodeUnicodeCE, decodeUnicodeCE } from "../shared/unicode-ce";

describe("official Unicode named sequences", () => {
  it.each([0x300, 0xFE0F, 0x20E3, 0x17D2, 0x646, 0x13000, 0xE000, 0x10FFFF])(
    "matches only exact scalar membership for U+%s, in stable bounded pages", point => {
      const expected = data.sequences.filter(([, points]) => (points as number[]).includes(point))
        .map(([name, points]) => ({ name, points }));
      const actual = [];
      for (let offset = 0; offset < Math.max(1, expected.length); offset += 7) {
        const page = searchUnicodeNamedSequencesContaining(point, offset, 7);
        expect(page.total).toBe(expected.length);
        expect(page.sequences.length).toBeLessThanOrEqual(7);
        actual.push(...page.sequences);
      }
      expect(actual).toEqual(expected);
      expect(searchUnicodeNamedSequencesContaining(point, expected.length, 7)).toEqual({ sequences: [], total: expected.length });
    },
  );
  it("rejects non-scalars and invalid membership pages and protects catalogue data", () => {
    for (const point of [-1, 0x110000, 0xD800, 0xDFFF, 1.5, NaN, Infinity]) {
      expect(() => searchUnicodeNamedSequencesContaining(point)).toThrow("requires a Unicode scalar");
    }
    for (const [offset, limit] of [[-1, 16], [0.5, 16], [Infinity, 16], [Number.MAX_SAFE_INTEGER + 1, 16], [0, 0], [0, 65], [0, 1.5]]) {
      expect(() => searchUnicodeNamedSequencesContaining(0x300, offset, limit)).toThrow("Invalid named sequence search page");
    }
    const first = searchUnicodeNamedSequencesContaining(0xFE0F);
    expect(first.total).toBe(12);
    (first.sequences[0].points as number[])[0] = 0;
    expect(searchUnicodeNamedSequencesContaining(0xFE0F).sequences[0].points[0]).not.toBe(0);
    // Canonically related marks and selectors are not interchangeable.
    expect(searchUnicodeNamedSequencesContaining(0xFE0E).total).toBe(0);
    expect(searchUnicodeNamedSequencesContaining(0x0340).total).toBe(0);
    expect(searchUnicodeNamedSequencesContaining(0x300).total).toBeGreaterThan(0);
  });
  it("finds every approved sequence by exact points, in pinned source order, with defensive copies", () => {
    for (const [name, rawPoints] of data.sequences) {
      const points = rawPoints as number[];
      const input = points.map(point => `U+${point.toString(16).padStart(4, "0")}`).join(" ");
      const result = lookupUnicodeNamedSequences(input);
      expect(result.status).toBe("valid");
      if (result.status !== "valid") throw new Error(result.error);
      const expected = data.sequences.filter(([, other]) => JSON.stringify(other) === JSON.stringify(points))
        .map(([name, points]) => ({ name, points }));
      expect(result.sequences).toEqual(expected);
      expect(result.points).toEqual(points);
      expect(result.total).toBe(expected.length);
      expect(result.sequences).toContainEqual({ name, points });
      expect(lookupUnicodeNamedSequences(input, 1)).toMatchObject({
        total: expected.length, sequences: expected.slice(0, 1),
      });
      result.points[0] = 0;
      (result.sequences[0].points as number[])[0] = 0;
      expect(lookupUnicodeNamedSequences(input)).toMatchObject({ sequences: expected });
    }
  });
  it("accepts whitespace and hex case but never normalizes, reorders, drops or invents scalars", () => {
    expect(lookupUnicodeNamedSequences(" \tu+0031\nU+00fe0f  U+20e3\r ")).toMatchObject({
      status: "valid", points: [0x31, 0xFE0F, 0x20E3],
      sequences: [{ name: "KEYCAP DIGIT ONE", points: [0x31, 0xFE0F, 0x20E3] }], total: 1,
    });
    expect(lookupUnicodeNamedSequences("U+0101 U+0300")).toMatchObject({
      sequences: [{ name: "LATIN SMALL LETTER A WITH MACRON AND GRAVE", points: [0x101, 0x300] }],
    });
    for (const input of [
      "U+0061 U+0304 U+0300", // Canonically equivalent NFD, not the official list.
      "U+0300 U+0101", "U+0031 U+20E3", "U+0031 U+FE0F",
      "U+0031 U+FE0F U+20E3 U+0041", "U+0031 U+FE0F U+20E3 U+20E3",
      "U+06A9 U+0646", "U+2603", "U+E000", "U+0378", "U+FFFF",
      "U+0000 U+10FFFF", "U+1F600 U+1F601",
    ]) {
      expect(lookupUnicodeNamedSequences(input)).toMatchObject({ status: "valid", sequences: [], total: 0 });
    }
    expect(lookupUnicodeNamedSequences("U+0B95 U+0BCD U+0BB7 U+0BCD")).toMatchObject({
      sequences: [{ name: "TAMIL CONSONANT KSS", points: [0xB95, 0xBCD, 0xBB7, 0xBCD] }],
    });
  });
  it("validates the entire bounded scalar list and result cap, distinguishing invalid from unmatched", () => {
    for (const input of [
      "", " \n ", "KEYCAP DIGIT ONE", "1\uFE0F\u20E3", "0031 FE0F 20E3",
      "0x0031 U+FE0F U+20E3", "U+0031,U+FE0F,U+20E3", "U+31 U+FE0F U+20E3",
      "U+0031 U+FE0F U+20E3 junk", "U+GGGG", "U+-001", "U+0000000",
      "U+D800", "U+DFFF", "U+110000", "U+FFFFFF",
      "U+0031 U+FE0F U+20E3 U+D800", "\uD800", " ".repeat(513),
      Array(33).fill("U+0041").join(" "),
    ]) {
      expect(lookupUnicodeNamedSequences(input).status, input).toBe("invalid");
    }
    expect(lookupUnicodeNamedSequences("U+0041" + " ".repeat(506))).toMatchObject({ status: "valid", total: 0 });
    expect(lookupUnicodeNamedSequences(Array(32).fill("U+0041").join(" "))).toMatchObject({ status: "valid", total: 0 });
    for (const limit of [0, -1, 65, 1.5, NaN, Infinity]) {
      expect(() => lookupUnicodeNamedSequences("U+0041", limit)).toThrow("Invalid named sequence lookup limit");
    }
  });
  it("uses the pinned release, unique name-order entries and assigned scalars that fit the preview", () => {
    expect(UNICODE_NAMED_SEQUENCES_VERSION).toBe(UNICODE_CATALOGUE_VERSION);
    expect(data.version).toBe("17.0.0");
    expect(data.sequences).toHaveLength(461);
    let previous = "";
    for (const [rawName, rawPoints] of data.sequences) {
      const name = rawName as string, points = rawPoints as number[];
      expect(name > previous).toBe(true);
      previous = name;
      expect(points.length).toBeGreaterThan(1);
      expect(points.length).toBeLessThanOrEqual(32);
      for (const point of points) expect(inspectCodePoint(point).status).toBe("assigned");
      const text = String.fromCodePoint(...points);
      expect(text.length).toBeLessThanOrEqual(512);
      expect(decodeUnicodeCE(encodeUnicodeCE(text))).toBe(text);
      expect(encodeUnicodeCE(text).frames).toEqual(points.flatMap(point => encodeUnicodeCE(String.fromCodePoint(point)).frames));
      expect(searchUnicodeNamedSequences(name).sequences).toContainEqual({ name, points });
    }
  });
  it("preserves variation selectors, combining marks and logical RTL order without normalization", () => {
    expect(searchUnicodeNamedSequences(" keycap digit one ").sequences).toEqual([
      { name: "KEYCAP DIGIT ONE", points: [0x31, 0xFE0F, 0x20E3] },
    ]);
    const points = searchUnicodeNamedSequences("LATIN SMALL LETTER A WITH MACRON AND GRAVE").sequences[0].points;
    expect(points).toEqual([0x101, 0x300]);
    expect(String.fromCodePoint(...points)).not.toBe(String.fromCodePoint(...points).normalize("NFD"));
    expect(searchUnicodeNamedSequences("ARABIC SEQUENCE NOON WITH KEHEH").sequences[0].points).toEqual([0x646, 0x6A9]);
    // Golden bytes 31 EF B8 8F E2 83 A3 mapped by the existing byte coordinate profile.
    expect(encodeUnicodeCE("1\uFE0F\u20E3").frames).toEqual([
      { wdm: 49, oam: 0, pol: "H" }, { wdm: 111, oam: 1, pol: "H" },
      { wdm: 56, oam: 1, pol: "H" }, { wdm: 15, oam: 1, pol: "H" },
      { wdm: 98, oam: 1, pol: "H" }, { wdm: 3, oam: 1, pol: "H" },
      { wdm: 35, oam: 1, pol: "H" },
    ]);
  });
  it("keeps scalar names separate and applies literal bounded name-order pagination", () => {
    expect(searchUnicodeNames("KEYCAP DIGIT ONE")).toEqual({ points: [], total: 0 });
    expect(searchUnicodeNamedSequences("SNOWMAN")).toEqual({ sequences: [], total: 0 });
    expect(searchUnicodeNamedSequences("KEYCAP-DIGIT-ONE").total).toBe(0);
    expect(searchUnicodeNamedSequences("keycap  digit one").total).toBe(0);
    expect(searchUnicodeNamedSequences("   ")).toEqual({ sequences: [], total: 0 });
    const first = searchUnicodeNamedSequences("LETTER");
    const second = searchUnicodeNamedSequences("letter", 64);
    expect(first.sequences).toHaveLength(64);
    expect(second.sequences).toHaveLength(first.total - 64);
    expect(second.total).toBe(first.total);
    expect(second.sequences[0].name > first.sequences[63].name).toBe(true);
    expect(searchUnicodeNamedSequences("LETTER", first.total).sequences).toEqual([]);
    expect(searchUnicodeNamedSequences("LETTER", 0, 1).sequences).toHaveLength(1);
    // Returned results cannot mutate the offline catalogue.
    (first.sequences[0].points as number[])[0] = 0;
    expect(searchUnicodeNamedSequences("LETTER").sequences[0].points[0]).not.toBe(0);
    for (const [offset, limit] of [[-1, 64], [0.5, 64], [Infinity, 64], [Number.MAX_SAFE_INTEGER + 1, 64], [0, 0], [0, 65], [0, 1.5]]) {
      expect(() => searchUnicodeNamedSequences("a", offset, limit)).toThrow("Invalid named sequence search page");
    }
    expect(() => searchUnicodeNamedSequences("a".repeat(121))).toThrow("120");
  });
});
