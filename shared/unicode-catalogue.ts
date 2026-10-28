/**
 * Official pinned properties, independent of the browser's Unicode/ICU version.
 * Blocks are not languages or scripts; Script is not Script_Extensions.
 */
import data from "./unicode-catalogue-data.json";

export const UNICODE_CATALOGUE_VERSION = data.version;
export const UNICODE_UCD_SOURCE = `https://www.unicode.org/Public/${data.version}/ucd/`;
/** Keep the larger name index out of the initial property/codec bundle. */
export async function loadUnicodeNames() {
  const names = await import("./unicode-character-names");
  if (names.UNICODE_NAMES_VERSION !== UNICODE_CATALOGUE_VERSION) throw new Error("Unicode name/property version mismatch");
  return names;
}
export interface UnicodeRange { start: number; end: number; name: string }
type RangeTuple = [number, number, string];
const blocks = data.blocks as RangeTuple[];
const scripts = data.scripts as RangeTuple[];
const categories = data.categories as RangeTuple[];
export const UNICODE_BLOCKS: readonly UnicodeRange[] = blocks.map(([start, end, name]) => ({ start, end, name }));

function property(ranges: RangeTuple[], point: number): string | undefined {
  let low = 0, high = ranges.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const [start, end, name] = ranges[mid];
    if (point < start) high = mid - 1;
    else if (point > end) low = mid + 1;
    else return name;
  }
}
export function codePointLabel(point: number): string {
  if (!Number.isInteger(point) || point < 0 || point > 0x10FFFF) throw new Error("Code point must be U+0000–U+10FFFF");
  return `U+${point.toString(16).toUpperCase().padStart(4, "0")}`;
}
export function parseCodePoint(input: string): number {
  const match = /^(?:U\+|0x)?([0-9a-f]{1,6})$/i.exec(input.trim());
  if (!match) throw new Error("Enter a hexadecimal code point, for example U+13000");
  const point = parseInt(match[1], 16);
  codePointLabel(point);
  if (point >= 0xD800 && point <= 0xDFFF) throw new Error("Surrogates are not Unicode scalar values");
  return point;
}
export type UnicodePointStatus = "assigned" | "unassigned" | "private-use" | "noncharacter";
export function inspectCodePoint(point: number) {
  codePointLabel(point);
  if (point >= 0xD800 && point <= 0xDFFF) throw new Error("Surrogates are not Unicode scalar values");
  const category = property(categories, point) ?? "Cn";
  const noncharacter = (point >= 0xFDD0 && point <= 0xFDEF) || (point & 0xFFFF) >= 0xFFFE;
  const status: UnicodePointStatus = noncharacter ? "noncharacter"
    : category === "Co" ? "private-use" : category === "Cn" ? "unassigned" : "assigned";
  return {
    point, label: codePointLabel(point), character: String.fromCodePoint(point),
    block: property(blocks, point) ?? "No_Block",
    script: (property(scripts, point) ?? "Unknown").replace(/_/g, " "),
    category, status,
  };
}
export function searchUnicodeBlocks(query: string): readonly UnicodeRange[] {
  const needle = query.trim().toLowerCase().replace(/_/g, " ");
  if (!needle) return UNICODE_BLOCKS;
  return UNICODE_BLOCKS.filter(block => block.name.toLowerCase().includes(needle) ||
    scripts.some(([start, end, name]) => start <= block.end && end >= block.start &&
      name.toLowerCase().replace(/_/g, " ").includes(needle)));
}
/** Only assigned characters; private-use/noncharacters never enter the catalogue. */
export function browseUnicodeBlock(block: UnicodeRange, offset = 0, limit = 64) {
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 64) {
    throw new Error("Invalid catalogue page");
  }
  // Iterate assigned property ranges, rather than millions of empty/private points.
  let total = 0;
  const points: number[] = [];
  for (const [start, end, category] of categories) {
    if (category === "Cn" || category === "Co" || category === "Cs") continue;
    const first = Math.max(start, block.start), last = Math.min(end, block.end);
    if (first > last) continue;
    const count = last - first + 1;
    for (let index = Math.max(0, offset - total); index < count && points.length < limit; index++) {
      points.push(first + index);
    }
    total += count;
  }
  return { points, total };
}
