import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { resolveFileImports } from "./export-file-resolution.mjs";
const entry = (path: string) => ({ path, type: "blob", mode: "100644",
  sha: createHash("sha1").update(path).digest("hex") });
describe("native dependency generated-source inclusion", () => {
  it("resolves a dotted generated basename only to an included regular source blob", () => {
    const files = [{ path: "shared/wls-library.ts", imports: new Set(["./wls-library-sources.generated"]) }];
    const result = resolveFileImports(files, [], [entry("shared/wls-library-sources.generated.ts")]);
    expect(result).toContainEqual({ path: "shared/wls-library.ts", specifier: "./wls-library-sources.generated", target: "shared/wls-library-sources.generated.ts" });
  });
  it("does not invent a missing generated target or accept unsupported loader extensions", () => {
    expect(() => resolveFileImports([{ path: "shared/lib.ts", imports: new Set(["./source.generated"]) }], [], []))
      .toThrow(/Missing target/);
    expect(() => resolveFileImports([{ path: "shared/lib.ts", imports: new Set(["./addon.node"]) }], [], [entry("shared/addon.node")]))
      .toThrow(/Unsupported local import extension/);
  });
});
