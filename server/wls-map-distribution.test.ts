import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { expect, it } from "vitest";

it.each([
  ["esm", "0-3", 12, "map"], ["cjs", "0-3", 12, "map"],
  ["esm", "0-4", 5, "map"], ["cjs", "0-4", 5, "map"],
  ["esm", "0-5", 13, "set"], ["cjs", "0-5", 13, "set"],
  ["esm", "0-6", 10, "map-set"], ["cjs", "0-6", 10, "map-set"],
  ["esm", "0-7", 12, "map-set"], ["cjs", "0-7", 12, "map-set"],
  ["esm", "0-8", 12, "map-set"], ["cjs", "0-8", 12, "map-set"],
  ["esm", "0-9", 12, "map-set"], ["cjs", "0-9", 12, "map-set"],
  ["esm", "0-10", 12, "map-set"], ["cjs", "0-10", 12, "map-set"],
  ["esm", "0-11", 12, "map-set"], ["cjs", "0-11", 12, "map-set"],
  ["esm", "0-12", 12, "map-set"], ["cjs", "0-12", 12, "map-set"],
  ["esm", "0-13", 12, "map-set"], ["cjs", "0-13", 12, "map-set"],
  ["esm", "0-14", 12, "map-set"], ["cjs", "0-14", 12, "map-set"],
  ["esm", "0-15", 12, "map-set"], ["cjs", "0-15", 12, "map-set"],
] as const)("runs a standalone %s Node bundle for release %s with no source assets", async (format, version, cases, family) => {
  const root = await mkdtemp(join(tmpdir(), "wls-map-bundle-"));
  try {
    const src = join(root, "source"), output = join(root, "only-bundle"), cwd = join(root, "unrelated");
    await Promise.all([mkdir(src), mkdir(output), mkdir(cwd)]);
    const entry = join(src, "consumer.ts");
    const manifest = await readFile(`scripts/fixtures/wls-${family}-package-v${version}.json`, "utf8");
    const suite = await readFile(`scripts/fixtures/wls-${family}-v${version}-smoke.json`, "utf8");
    await writeFile(entry, `
import { createCollectionPackageLock, verifyCollectionPackageLock } from ${JSON.stringify(resolve("shared/wls-package-lock"))};
import { runLockedCollectionTestSuite } from ${JSON.stringify(resolve("shared/wls-test-runner"))};
import { mapEmpty, mapGet, mapSet, mapFilterByValue, mapInvertLast, mapEquals, mapIsSubmap, mapIntersectionEntries, mapDifferenceEntries } from ${JSON.stringify(resolve("shared/wls-map-library"))};
import { setFromMap, setFromValues, setAdd, setEquals, setSymmetricDifference } from ${JSON.stringify(resolve("shared/wls-set-library"))};
import { mapGetOrDefault, mapSetIfAbsent, mapReplaceIfPresent, mapTake, mapDrop } from ${JSON.stringify(resolve("shared/wls-map-library"))};
import { setTake, setDrop } from ${JSON.stringify(resolve("shared/wls-set-library"))};
import { mapHasValue, mapCountValue, mapFindKeyByValueOrDefault, mapReplaceValue, mapInvertFirst } from ${JSON.stringify(resolve("shared/wls-map-library"))};
import { compileMap, executeMap, MAP_PROFILE } from ${JSON.stringify(resolve("shared/wls-map-vm"))};
import { getCollectionProgramSource } from ${JSON.stringify(resolve("shared/wls-library"))};
async function main() {
 const manifest = ${JSON.stringify(manifest)}, suite = ${JSON.stringify(suite)};
 const lock = JSON.stringify(await createCollectionPackageLock(manifest));
 const report = await runLockedCollectionTestSuite(suite, manifest, lock);
 const m = mapSet(mapEmpty(), "__proto__", "Ψ🙂");
 const code = compileMap(getCollectionProgramSource("map.get"));
 let bounded = false;
 try { executeMap('WLS-MAP/1\\n:again\\nJUMP ["again"]\\nRETURN ["r"]', {}); }
 catch (e) { bounded = e.name === "CollectionVMError" && e.message.includes("cycle limit"); }
 console.log(JSON.stringify({report, verified: (await verifyCollectionPackageLock(manifest, lock)).verified,
   value: mapGet(m, "__proto__"), set: setAdd(setFromMap(m), "🌊"), profile: MAP_PROFILE, frozen: Object.isFrozen(m.entries[0]),
   filtered: mapFilterByValue(m, "Ψ🙂"), inverted: mapInvertLast(m),
   entryEqual: mapEquals(m, m), submap: mapIsSubmap(m, m),
   commonEntries: mapIntersectionEntries(m, m), differentEntries: mapDifferenceEntries(m, m),
   exclusive: setSymmetricDifference(m, setAdd(setFromMap(m), "🌊")),
   fallback: mapGetOrDefault(m, "missing", "fallback"),
   inserted: mapSetIfAbsent(m, "new", "v"), replaced: mapReplaceIfPresent(m, "__proto__", "new"),
   mapTaken: mapTake(m, 1), mapDropped: mapDrop(m, 1),
   setTaken: setTake(m, 1), setDropped: setDrop(m, 1),
   hasValue: mapHasValue(m, "Ψ🙂"), countValue: mapCountValue(m, "Ψ🙂"),
   valueKey: mapFindKeyByValueOrDefault(m, "Ψ🙂", "missing"),
   absentValueKey: mapFindKeyByValueOrDefault(m, "missing", "fallback"),
   replacedValues: mapReplaceValue(m, "Ψ🙂", ""), firstInverse: mapInvertFirst(m), valuesSet: setFromValues(m),
   setEqual: setEquals(m, setFromMap(m)), compiled: Object.isFrozen(code), bounded}));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
`);
    const bundle = join(output, format === "esm" ? "map.mjs" : "map.cjs");
    const result = await build({
      entryPoints: [entry], outfile: bundle, bundle: true, platform: "node", format,
      metafile: true, logLevel: "silent",
    });
    expect(Object.values(result.metafile!.outputs).flatMap(file => file.imports)).toEqual([]);
    expect(Object.keys(result.metafile!.inputs).some(path => /wls-library-node|\.wls$|server\/|client\//.test(path))).toBe(false);
    await rm(src, { recursive: true });
    expect(await readdir(output)).toEqual([format === "esm" ? "map.mjs" : "map.cjs"]);
    const text = execFileSync(process.execPath, [bundle], {
      cwd, encoding: "utf8", timeout: 5000, maxBuffer: 64_000,
      env: { PATH: process.env.PATH, NODE_OPTIONS: "" },
    });
    const resultValue = JSON.parse(text);
    expect(resultValue).toMatchObject({
      verified: true, value: "Ψ🙂", profile: "WLS-MAP/1", frozen: true, compiled: true, bounded: true,
      set: { entries: [["__proto__", ""], ["🌊", ""]] },
      filtered: { entries: [["__proto__", "Ψ🙂"]] },
      inverted: { entries: [["Ψ🙂", "__proto__"]] }, setEqual: true,
      entryEqual: true, submap: true, commonEntries: { entries: [["__proto__", "Ψ🙂"]] },
      differentEntries: { entries: [] }, exclusive: { entries: [["🌊", ""]] },
      fallback: "fallback", inserted: { entries: [["__proto__", "Ψ🙂"], ["new", "v"]] },
      replaced: { entries: [["__proto__", "new"]] },
      mapTaken: { entries: [["__proto__", "Ψ🙂"]] }, mapDropped: { entries: [] },
      setTaken: { entries: [["__proto__", ""]] }, setDropped: { entries: [] },
      hasValue: true, countValue: 1, valueKey: "__proto__", absentValueKey: "fallback",
      replacedValues: {entries: [["__proto__", ""]]}, firstInverse: {entries: [["Ψ🙂", "__proto__"]]},
      valuesSet: {entries: [["Ψ🙂", ""]]},
      report: { total: cases, passed: cases, failed: 0, integrity: "verified" },
    });
  } finally { await rm(root, { recursive: true, force: true }); }
});
