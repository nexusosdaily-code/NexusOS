/**
 * Loaded separately from the small property catalogue. Names are identifiers,
 * not translations. Scalar algorithms follow Unicode 17 §4.8 and §3.12;
 * approved named sequences are a separate search, never scalar names.
 */
import data from "./unicode-character-names-data.json";
import sequenceData from "./unicode-named-sequences-data.json";
import { inspectCodePoint } from "./unicode-catalogue";

export const UNICODE_NAMES_VERSION = data.version;
export const UNICODE_NAMED_SEQUENCES_VERSION = sequenceData.version;
if (UNICODE_NAMES_VERSION !== UNICODE_NAMED_SEQUENCES_VERSION) throw new Error("Unicode sequence/name version mismatch");
export interface UnicodeNamedSequence {
  readonly name: string;
  readonly points: readonly number[];
}
const namedSequences: readonly UnicodeNamedSequence[] = sequenceData.sequences.map(([name, points]) => ({
  name: name as string, points: points as number[],
}));

export const UNICODE_SEQUENCE_LOOKUP_MAX_INPUT = 512;
/** Approved sequence names only, separate from scalar names and aliases.
 * Literal substring search with bounded, stable name-order pages.
 */
export function searchUnicodeNamedSequences(query: string, offset = 0, limit = 64) {
  if (query.length > 120) throw new Error("Named sequence search is limited to 120 characters");
  const needle = query.trim().toUpperCase();
  return namedSequencePage(sequence => !!needle && sequence.name.includes(needle), offset, limit);
}

/** Exact scalar membership in approved sequences only; no normalization,
 * glyph matching or inferred combinations. Uses the same stable name-order pages.
 */
export function searchUnicodeNamedSequencesContaining(point: number, offset = 0, limit = 64) {
  if (!Number.isInteger(point) || point < 0 || point > 0x10FFFF || (point >= 0xD800 && point <= 0xDFFF)) {
    throw new Error("Named sequence membership requires a Unicode scalar");
  }
  return namedSequencePage(sequence => sequence.points.includes(point), offset, limit);
}

function namedSequencePage(matches: (sequence: UnicodeNamedSequence) => boolean, offset: number, limit: number) {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 64) {
    throw new Error("Invalid named sequence search page");
  }
  const sequences: UnicodeNamedSequence[] = [];
  let total = 0;
  for (const sequence of namedSequences) {
    if (!matches(sequence)) continue;
    if (total >= offset && sequences.length < limit) {
      sequences.push({ name: sequence.name, points: [...sequence.points] });
    }
    total++;
  }
  return { sequences, total };
}
type NameRange = [number, number, string];
export type UnicodeAliasType = "correction" | "control" | "alternate" | "figment" | "abbreviation";
export interface UnicodeNameAlias { name: string; type: UnicodeAliasType }
const ranges = data.names as NameRange[];
// JSON inference widens fixed tuples to string[][]; the pinned generator
// validates the alias vocabulary before emitting this data.
const aliases = data.aliases as unknown as Record<string, [string, UnicodeAliasType][]>;
const leading = ["G", "GG", "N", "D", "DD", "R", "M", "B", "BB", "S", "SS", "", "J", "JJ", "C", "K", "T", "P", "H"];
const vowel = ["A", "AE", "YA", "YAE", "EO", "E", "YEO", "YE", "O", "WA", "WAE", "OE", "YO", "U", "WEO", "WE", "WI", "YU", "EU", "YI", "I"];
const trailing = ["", "G", "GG", "GS", "N", "NJ", "NH", "D", "L", "LG", "LM", "LB", "LS", "LT", "LP", "LH", "M", "B", "BS", "S", "SS", "NG", "J", "C", "K", "T", "P", "H"];

function rangeName(point: number, pattern: string): string | null {
  if (pattern === "<control>") return null;
  if (pattern === "HANGUL SYLLABLE *") {
    const index = point - 0xAC00;
    return `HANGUL SYLLABLE ${leading[Math.floor(index / 588)]}${vowel[Math.floor(index % 588 / 28)]}${trailing[index % 28]}`;
  }
  return pattern.replace("*", point.toString(16).toUpperCase().padStart(4, "0"));
}

export function inspectUnicodeName(point: number) {
  const { status, category } = inspectCodePoint(point);
  let low = 0, high = ranges.length - 1;
  let name: string | null = null;
  if (status === "assigned") {
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const [start, end, pattern] = ranges[mid];
      if (point < start) high = mid - 1;
      else if (point > end) low = mid + 1;
      else { name = rangeName(point, pattern); break; }
    }
  }
  return {
    name,
    controlLabel: category === "Cc" ? "<control>" : null,
    aliases: (status === "assigned" ? aliases[point] ?? [] : [])
      .map(([name, type]): UnicodeNameAlias => ({ name, type })),
  };
}

/** Case-insensitive literal substring search; bounded output, scalar-order pages.
 * No accent folding, inferred synonyms, Unicode 1 names or glyph matching.
 */
export function searchUnicodeNames(query: string, offset = 0, limit = 64) {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 64) {
    throw new Error("Invalid name search page");
  }
  if (query.length > 120) throw new Error("Name search is limited to 120 characters");
  const needle = query.trim().toUpperCase();
  const points: number[] = [];
  let total = 0;
  if (!needle) return { points, total };
  for (const [start, end, pattern] of ranges) {
    for (let point = start; point <= end; point++) {
      if (!rangeName(point, pattern)?.includes(needle) &&
          !aliases[point]?.some(([alias]) => alias.includes(needle))) continue;
      if (total >= offset && points.length < limit) points.push(point);
      total++;
    }
  }
  return { points, total };
}

/** Exact ordered scalar equality against approved, pinned sequences only.
 * Accept whitespace-separated U+ identifiers, never text or normalized forms.
 */
export function lookupUnicodeNamedSequences(input: string, limit = 64): UnicodeSequenceLookup {
  if (!Number.isInteger(limit) || limit < 1 || limit > 64) {
    throw new Error("Invalid named sequence lookup limit");
  }
  if (input.length > UNICODE_SEQUENCE_LOOKUP_MAX_INPUT) {
    return { status: "invalid", error: "Code-point list is limited to 512 characters." };
  }
  if (!input.trim()) {
    return { status: "invalid", error: "Enter an ordered code-point list, for example U+0031 U+FE0F U+20E3." };
  }
  const tokens = input.trim().split(/\s+/);
  if (tokens.length > UNICODE_SEQUENCE_LOOKUP_MAX_POINTS) {
    return { status: "invalid", error: "Code-point list is limited to 32 scalars." };
  }
  const points: number[] = [];
  for (const token of tokens) {
    if (!/^U\+[0-9A-F]{4,6}$/i.test(token)) {
      return { status: "invalid", error: "Use whitespace-separated U+ identifiers with 4–6 hexadecimal digits." };
    }
    const point = Number.parseInt(token.slice(2), 16);
    if (point > 0x10FFFF || (point >= 0xD800 && point <= 0xDFFF)) {
      return { status: "invalid", error: "Every code point must be a Unicode scalar (U+0000–U+10FFFF, excluding surrogates)." };
    }
    points.push(point);
  }
  const sequences: UnicodeNamedSequence[] = [];
  let total = 0;
  for (const sequence of namedSequences) {
    if (sequence.points.length !== points.length ||
        !sequence.points.every((point, index) => point === points[index])) continue;
    if (sequences.length < limit) {
      sequences.push({ name: sequence.name, points: [...sequence.points] });
    }
    total++;
  }
  return { status: "valid", points, sequences, total };
}

export const UNICODE_SEQUENCE_LOOKUP_MAX_POINTS = 32;

export type UnicodeSequenceLookup =
  | { status: "invalid"; error: string }
  | { status: "valid"; points: number[]; sequences: UnicodeNamedSequence[]; total: number };
