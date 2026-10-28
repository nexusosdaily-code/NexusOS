import { describe, expect, it } from "vitest";
import {
  UNICODE_BLOCKS, UNICODE_CATALOGUE_VERSION, browseUnicodeBlock, codePointLabel,
  inspectCodePoint, parseCodePoint, searchUnicodeBlocks,
} from "../shared/unicode-catalogue";
import data from "../shared/unicode-catalogue-data.json";
import { decodeUnicodeCE, encodeUnicodeCE } from "../shared/unicode-ce";

describe("pinned Unicode character catalogue", () => {
  it("contains ordered non-overlapping official property ranges", () => {
    expect(UNICODE_CATALOGUE_VERSION).toBe("17.0.0");
    expect(UNICODE_BLOCKS).toHaveLength(346);
    for (const ranges of [data.blocks, data.scripts, data.categories]) {
      let previous = -1;
      for (const [start, end, value] of ranges) {
        expect(Number.isInteger(start)).toBe(true);
        expect(Number(start)).toBeGreaterThan(previous);
        expect(Number(end)).toBeGreaterThanOrEqual(Number(start));
        expect(Number(end)).toBeLessThanOrEqual(0x10FFFF);
        expect(typeof value).toBe("string");
        previous = Number(end);
      }
    }
    expect(inspectCodePoint(0x11F02)).toMatchObject({ script: "Kawi", status: "assigned" });
    expect(inspectCodePoint(0x1E6C0)).toMatchObject({ script: "Tai Yo", status: "assigned" });
  });
  it.each([
    [0, "assigned", "Cc"], [0x7F, "assigned", "Cc"], [0x80, "assigned", "Cc"],
    [0xD7FF, "unassigned", "Cn"], [0xE000, "private-use", "Co"],
    [0xF8FF, "private-use", "Co"], [0xF900, "assigned", "Lo"],
    [0xFDD0, "noncharacter", "Cn"], [0xFDEF, "noncharacter", "Cn"],
    [0xFEFF, "assigned", "Cf"], [0xFFFF, "noncharacter", "Cn"],
    [0x10000, "assigned", "Lo"], [0x10FFFD, "private-use", "Co"],
    [0x10FFFF, "noncharacter", "Cn"], [0x0378, "unassigned", "Cn"],
    [0x0301, "assigned", "Mn"],
  ])("classifies U+%s without interpreting it", (point, status, category) => {
    const entry = inspectCodePoint(Number(point));
    expect(entry).toMatchObject({ status, category });
    expect(decodeUnicodeCE(encodeUnicodeCE(entry.character))).toBe(entry.character);
  });
  it("does not infer language from writing system or block", () => {
    expect(inspectCodePoint(0x0301)).toMatchObject({ script: "Inherited", block: "Combining Diacritical Marks" });
    expect(inspectCodePoint(0x0020)).toMatchObject({ script: "Common", block: "Basic Latin" });
    expect(inspectCodePoint(0x13000)).toMatchObject({ script: "Egyptian Hieroglyphs", block: "Egyptian Hieroglyphs" });
    expect(searchUnicodeBlocks("Cuneiform").map(block => block.name)).toContain("Cuneiform");
    expect(searchUnicodeBlocks("Latin").map(block => block.name)).toContain("Basic Latin");
    expect(searchUnicodeBlocks("Sumerian")).toEqual([]);
  });
  it.each(["U+D800", "DFFF", "110000", "-1", "1.2", "U+123xyz", "𓀀", ""])("rejects invalid lookup %j", input => {
    expect(() => parseCodePoint(input)).toThrow();
  });
  it.each([-1, 0x110000, 0xD800, 0xDFFF, NaN, 1.5])("rejects invalid scalar inspection %j", point => {
    expect(() => inspectCodePoint(point)).toThrow();
  });
  it("uses font-independent canonical labels and accepts scalar boundaries", () => {
    expect(parseCodePoint(" U+0000 ")).toBe(0);
    expect(parseCodePoint("0x10ffff")).toBe(0x10FFFF);
    expect(parseCodePoint("13000")).toBe(0x13000);
    expect(codePointLabel(0)).toBe("U+0000");
    expect(codePointLabel(0x13000)).toBe("U+13000");
    expect(codePointLabel(0x10FFFF)).toBe("U+10FFFF");
  });
  it("browses only assigned points, paginates large blocks and handles empty blocks", () => {
    const greek = UNICODE_BLOCKS.find(block => block.name === "Greek and Coptic")!;
    const { points, total } = browseUnicodeBlock(greek);
    expect(total).toBeGreaterThan(64);
    expect(points).toHaveLength(64);
    expect(points).not.toContain(0x0378);
    const second = browseUnicodeBlock(greek, 64);
    expect(second.points.some(point => points.includes(point))).toBe(false);
    expect(browseUnicodeBlock(greek, total).points).toEqual([]);
    for (const name of ["High Surrogates", "Private Use Area", "Supplementary Private Use Area-B"]) {
      expect(browseUnicodeBlock(UNICODE_BLOCKS.find(block => block.name === name)!)).toEqual({ points: [], total: 0 });
    }
    for (const block of UNICODE_BLOCKS) {
      const page = browseUnicodeBlock(block, 0, 1);
      if (page.points.length) {
        expect(page.points[0]).toBeGreaterThanOrEqual(block.start);
        expect(inspectCodePoint(page.points[0]).status).toBe("assigned");
      }
    }
  });
  it("retains golden coordinates for combining, bidi, supplementary and scalar limits", () => {
    const fixtures: [string, number[]][] = [
      ["\0", [0]], ["\u007F", [127]], ["\u0080", [194, 128]],
      ["\u07FF", [223, 191]], ["\u0800", [224, 160, 128]],
      ["e\u0301", [101, 204, 129]], ["שָׁ", [215, 169, 214, 184, 215, 129]],
      ["\uD7FF", [237, 159, 191]], ["\uE000", [238, 128, 128]],
      ["\uFFFF", [239, 191, 191]], ["\u{10000}", [240, 144, 128, 128]],
      ["𓀀", [240, 147, 128, 128]], ["\u{10FFFF}", [244, 143, 191, 191]],
    ];
    for (const [text, bytes] of fixtures) {
      const payload = encodeUnicodeCE(text);
      expect(payload.frames).toEqual(bytes.map(byte => ({ wdm: byte & 127, oam: byte >>> 7, pol: "H" })));
      expect(decodeUnicodeCE(payload)).toBe(text);
    }
  });
});
