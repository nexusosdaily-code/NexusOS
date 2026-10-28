/**
 * Reproduce the small offline property index from official Unicode 17 files.
 * Usage: npx tsx scripts/generate-unicode-catalogue.ts /tmp/unicode-17
 * Download URLs, hashes and limitations: docs/unicode-catalogue.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const inputs = [
  ["Blocks.txt", "c0edefaf1a19771e830a82735472716af6bf3c3975f6c2a23ffbe2580fbbcb15"],
  ["Scripts.txt", "9f5e50d3abaee7d6ce09480f325c706f485ae3240912527e651954d2d6b035bf"],
  ["DerivedGeneralCategory.txt", "d62e5bab70ca74f099343f71224fa051cb1fdd61a1ab45c0488c44cfc0b6102e"],
  ["UnicodeData.txt", "2e1efc1dcb59c575eedf5ccae60f95229f706ee6d031835247d843c11d96470c"],
  ["NameAliases.txt", "793f6f1e4d15fd90f05ae66460191dc4d75d1fea90136a25f30dd6a4cb950eac"],
  ["NamedSequences.txt", "0cd1c928edac72ea1369187599727c4f0d92367316b4c5ee5140475ab9298be0"],
] as const;
const directory = process.argv[2];
if (!directory) throw new Error("Supply the directory containing the six official source files");
const sources = inputs.map(([file, hash]) => {
  const bytes = readFileSync(join(directory, file));
  if (createHash("sha256").update(bytes).digest("hex") !== hash) throw new Error(`Source hash mismatch: ${file}`);
  return bytes.toString("utf8");
});
const tables = sources.slice(0, 3).map(source => {
  return source.split("\n").flatMap(line => {
    const match = /^([0-9A-F]+)(?:\.\.([0-9A-F]+))?\s*;\s*([^#;]+?)(?:\s*#.*)?$/.exec(line);
    return match ? [[parseInt(match[1], 16), parseInt(match[2] ?? match[1], 16), match[3].trim()]] : [];
  }).sort((a, b) => Number(a[0]) - Number(b[0]));
});
writeFileSync("shared/unicode-catalogue-data.json", JSON.stringify({
  version: "17.0.0", blocks: tables[0], scripts: tables[1], categories: tables[2],
}) + "\n");

// UnicodeData angle-bracket range markers are not character names.
// Hangul uses the normative syllable algorithm; Han/Tangut use hex patterns.
const names: [number, number, string][] = [];
let pending: { point: number; label: string } | undefined;
for (const line of sources[3].trim().split("\n")) {
  const [hex, label, category] = line.split(";");
  const point = parseInt(hex, 16);
  if (label.endsWith(", First>")) {
    if (pending) throw new Error("Nested UnicodeData range");
    pending = { point, label: label.replace(", First>", "") };
  } else if (label.endsWith(", Last>")) {
    if (!pending || pending.label !== label.replace(", Last>", "")) throw new Error("Unpaired UnicodeData range");
    if (category !== "Cs" && category !== "Co") {
      const pattern = pending.label.startsWith("<CJK Ideograph") ? "CJK UNIFIED IDEOGRAPH-*"
        : pending.label.startsWith("<Tangut Ideograph") ? "TANGUT IDEOGRAPH-*"
        : pending.label === "<Hangul Syllable" ? "HANGUL SYLLABLE *" : null;
      if (!pattern) throw new Error(`Unsupported algorithmic name range: ${label}`);
      names.push([pending.point, point, pattern]);
    }
    pending = undefined;
  } else if (!label.startsWith("<") || label === "<control>") {
    names.push([point, point, label]);
  } else {
    throw new Error(`Unsupported UnicodeData label: ${label}`);
  }
}
if (pending) throw new Error("Unclosed UnicodeData range");
const aliases: Record<string, [string, string][]> = {};
for (const line of sources[4].split("\n")) {
  const text = line.split("#")[0].trim();
  if (!text) continue;
  const [hex, alias, type] = text.split(";").map(field => field.trim());
  if (!["correction", "control", "alternate", "figment", "abbreviation"].includes(type)) {
    throw new Error(`Unknown alias type: ${type}`);
  }
  (aliases[parseInt(hex, 16)] ??= []).push([alias, type]);
}
writeFileSync("shared/unicode-character-names-data.json", JSON.stringify({
  version: "17.0.0", names, aliases,
}) + "\n");

// Only approved named sequences, never the separate provisional data file.
const sequences: [string, number[]][] = [];
const sequenceNames = new Set<string>();
for (const line of sources[5].split("\n")) {
  const text = line.split("#")[0].trim();
  if (!text) continue;
  const match = /^([A-Z0-9 -]+);\s*([0-9A-F]{4,6}(?: [0-9A-F]{4,6})+)$/.exec(text);
  if (!match || sequenceNames.has(match[1])) throw new Error(`Invalid or duplicate named sequence: ${text}`);
  const points = match[2].split(" ").map(hex => parseInt(hex, 16));
  if (points.some(point => point > 0x10FFFF || point >= 0xD800 && point <= 0xDFFF ||
    !tables[2].some(([start, end, category]) => point >= Number(start) && point <= Number(end) &&
      !["Cn", "Co", "Cs"].includes(String(category))))) {
    throw new Error(`Named sequence contains a non-assigned scalar: ${text}`);
  }
  sequenceNames.add(match[1]);
  sequences.push([match[1], points]);
}
// Stable name-order pages; never reorder scalars inside a sequence.
sequences.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
writeFileSync("shared/unicode-named-sequences-data.json", JSON.stringify({
  version: "17.0.0", sequences,
}) + "\n");
