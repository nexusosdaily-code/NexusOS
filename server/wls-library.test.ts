import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COLLECTION_PROGRAM_FILES, COLLECTION_V0_1_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { COLLECTION_PROGRAM_IDS, getCollectionProgramSource } from "../shared/wls-library";
import { readCollectionProgramSource } from "../shared/wls-library-node";
import { STRING_COLLECTION_SOURCE } from "../shared/wls-string-collections";
import { RECIPIENT_COLLECTION_SOURCE } from "../shared/wls-recipient-collections";
import { COLLECTION_LIMITS, CollectionVMError, compileCollection, executeCollection } from "../shared/wls-collection-vm";
import { collectionLibraryArtifactURL, renderCollectionLibraryArtifact } from "../scripts/wls-library-artifact";

vi.mock("node:fs/promises", async importOriginal => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});
afterEach(() => vi.clearAllMocks());

// Digests of the original embedded sources, excluding the new file-ending LF.
// This pins extraction equivalence independently of generated/bridge exports.
const originalDigests = {
  "string.contains": "12c00456dbba1023b8396fec8cb4b326249987f3ab39309589443de8f85e6816",
  "string.indexOf": "2d2491de2712eadae89c7763f2f4e5a8a8ad98b78579226345aa0e22eb0b65ff",
  "string.concat": "0df1cfb02e7ce7cceb6a9c00e298c9ff9d737219bc317a4e2fa44f5466220839",
  "recipient.add": "a4652b4d62a996b62b66fa9f9c993bdc9f7d0201d61deef2152f3a58064b1ed0",
  "recipient.remove": "bb64df8c9f3e2e115123532edd75dbe3f122349134178e64dff86a33e4a01cf9",
  "recipient.count": "b2bddf05bcd7b58dd4a0100f21212e17ea54bd77996c112c85bb2bcf2700a909",
  "recipient.at": "f7da642a04d1b8b5cd3f7530f42031f1b88a8d521570b952f3f7c93745d26bf6",
};
const bridges = {
  "string.contains": STRING_COLLECTION_SOURCE.contains,
  "string.indexOf": STRING_COLLECTION_SOURCE.indexOf,
  "string.concat": STRING_COLLECTION_SOURCE.concat,
  "recipient.add": RECIPIENT_COLLECTION_SOURCE.add,
  "recipient.remove": RECIPIENT_COLLECTION_SOURCE.remove,
  "recipient.count": RECIPIENT_COLLECTION_SOURCE.count,
  "recipient.at": RECIPIENT_COLLECTION_SOURCE.at,
  "string.lastIndexOf": STRING_COLLECTION_SOURCE.lastIndexOf,
  "string.reverse": STRING_COLLECTION_SOURCE.reverse,
};

describe("standalone bounded WavelengthScript library", () => {
  it("preserves seven original programs and adds two through immutable catalogues", () => {
    expect(COLLECTION_V0_1_PROGRAM_IDS).toEqual(Object.keys(originalDigests));
    expect(COLLECTION_PROGRAM_IDS).toEqual([...Object.keys(originalDigests), "string.lastIndexOf", "string.reverse"]);
    expect(Object.isFrozen(COLLECTION_V0_1_PROGRAM_IDS)).toBe(true);
    expect(Object.isFrozen(COLLECTION_PROGRAM_IDS)).toBe(true);
    expect(Object.isFrozen(COLLECTION_PROGRAM_FILES)).toBe(true);
    expect(Object.isFrozen(STRING_COLLECTION_SOURCE)).toBe(true);
    expect(Object.isFrozen(RECIPIENT_COLLECTION_SOURCE)).toBe(true);
  });

  it.each(COLLECTION_PROGRAM_IDS)("loads %s identically from file, portable loader and compatibility bridge", async id => {
    const canonical = await readFile(new URL(`../shared/wls-library/${COLLECTION_PROGRAM_FILES[id]}`, import.meta.url), "utf8");
    expect(await readCollectionProgramSource(id)).toBe(canonical);
    expect(getCollectionProgramSource(id)).toBe(canonical);
    expect(bridges[id]).toBe(canonical);
    expect(canonical.endsWith("\n")).toBe(true);
    if (Object.hasOwn(originalDigests, id)) {
      expect(createHash("sha256").update(canonical.slice(0, -1)).digest("hex"))
        .toBe(originalDigests[id as keyof typeof originalDigests]);
    }
    expect(compileCollection(canonical)).toEqual(compileCollection(canonical.slice(0, -1)));
  });

  it("keeps the committed portable artifact reproducible and current", async () => {
    const expected = await renderCollectionLibraryArtifact();
    expect(await readFile(collectionLibraryArtifactURL, "utf8")).toBe(expected);
    expect(await renderCollectionLibraryArtifact()).toBe(expected);
  });

  it.each([
    "", "contains", "string.Contains", "recipient.add ", "string.missing",
    "__proto__", "constructor", "toString", "../string/contains.wls",
    "string/contains.wls", "https://example.invalid/program.wls", "file:///etc/passwd",
    null, undefined, 1, ["string.contains"], { toString: () => "string.contains" },
  ])("rejects unknown or non-string program %j before I/O", async unknown => {
    const before = vi.mocked(readFile).mock.calls.length;
    expect(() => getCollectionProgramSource(unknown as string)).toThrow(CollectionVMError);
    await expect(readCollectionProgramSource(unknown as string)).rejects.toThrow("Unknown collection library program.");
    expect(vi.mocked(readFile).mock.calls.length).toBe(before);
  });

  it("propagates missing-source failures rather than silently falling back to generated data", async () => {
    const missing = Object.assign(new Error("fixture source missing"), { code: "ENOENT" });
    vi.mocked(readFile).mockRejectedValueOnce(missing);
    await expect(readCollectionProgramSource("recipient.count")).rejects.toBe(missing);
  });

  it("bundles the portable entry for browsers without Node, filesystem or runtime imports", async () => {
    const result = await build({
      entryPoints: ["shared/wls-library.ts"], bundle: true, platform: "browser",
      format: "esm", write: false, metafile: true, logLevel: "silent",
    });
    expect(Object.keys(result.metafile!.inputs).some(file => file.includes("wls-library-node"))).toBe(false);
    expect(Object.values(result.metafile!.outputs).flatMap(output => output.imports)).toEqual([]);
    expect(result.outputFiles[0].text).not.toMatch(/\b(fetch|XMLHttpRequest|eval|readFile)\s*\(/);
  });

  it("retains every VM resource budget at its exact original value", () => {
    expect(COLLECTION_LIMITS).toEqual({
      items: 20, stringLength: 256, sourceLength: 8192, instructions: 128, cycles: 1024, registers: 32,
    });
    const count = getCollectionProgramSource("recipient.count");
    expect(executeCollection(count, { items: Array(20).fill("x".repeat(256)) }).value).toBe(20);
    expect(() => executeCollection(count, { items: Array(21).fill("x") })).toThrow(/at most 20/);
    expect(() => executeCollection(count, { items: ["x".repeat(257)] })).toThrow(/Invalid collection item/);
    expect(() => compileCollection(count.padEnd(8193, " "))).toThrow(/source is too large/);
    expect(() => compileCollection(`WLS-COLLECTION/1\n${'CONST ["x",0]\n'.repeat(128)}RETURN ["x"]`)).toThrow(/instruction limit/);
    expect(() => executeCollection('WLS-COLLECTION/1\n:loop\nJUMP ["loop"]\nRETURN ["items"]', { items: [] })).toThrow(/cycle limit/);
    const inputs = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`r${i}`, 0]));
    expect(executeCollection('WLS-COLLECTION/1\nRETURN ["r0"]', inputs).value).toBe(0);
    expect(() => executeCollection('WLS-COLLECTION/1\nRETURN ["r0"]', { ...inputs, extra: 0 })).toThrow(/register limit/);
    expect(() => executeCollection(count, { ...inputs, items: [] })).toThrow(/register limit/);
  });

  it.each(["IMPORT", "FETCH", "EVAL", "STORE", "SEND", "PAY", "DOM"])("does not add the %s capability or module grammar", op => {
    expect(() => executeCollection(`WLS-COLLECTION/1\n${op} ["items"]\nRETURN ["items"]`, { items: [] }))
      .toThrow(/Unknown collection instruction/);
  });
});
