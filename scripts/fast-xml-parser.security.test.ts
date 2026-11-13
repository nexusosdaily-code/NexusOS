import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const storageRequire = createRequire(require.resolve("@google-cloud/storage"));

describe("fast-xml-parser GHSA-474x-hrwr-fgx4 regression", () => {
  it("keeps every locked parser patched and compatible with its storage caller", () => {
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
    const callersRange = lock.packages["node_modules/@google-cloud/storage"].dependencies["fast-xml-parser"];
    const parsers = Object.entries(lock.packages).filter(([path]) =>
      path.endsWith("node_modules/fast-xml-parser"));
    expect(parsers.length).toBeGreaterThan(0);
    for (const [, entry] of parsers) {
      const { version } = entry as { version: string };
      expect(semver.satisfies(version, ">=5.12.0 <6")).toBe(true);
      expect(semver.satisfies(version, callersRange)).toBe(true);
      expect(semver.satisfies(version, manifest.overrides["fast-xml-parser"])).toBe(true);
    }
    expect(storageRequire.resolve("fast-xml-parser")).toBe(require.resolve("fast-xml-parser"));
  });

  for (const mode of ["import", "require"] as const) {
    it(`bounds unterminated stop-node scanning through ${mode}`, () => {
      // A separate, credential-free process bounds CPU/memory even if the
      // vulnerable scanner returns. Never import application startup or queues.
      const child = spawnSync(process.execPath, [
        "--max-old-space-size=96", "--input-type=module", "-e", `
          import assert from "node:assert/strict";
          import { createRequire } from "node:module";
          const require = createRequire(import.meta.url);
          const { XMLParser } = ${mode === "import"
            ? 'await import("fast-xml-parser")'
            : 'createRequire(require.resolve("@google-cloud/storage"))("fast-xml-parser")'};
          const parser = new XMLParser({ stopNodes: ["*.script"] });
          for (const fragment of ["<a ", '<a x="']) {
            assert.throws(
              () => parser.parse("<root><script>" + fragment.repeat(100_000)),
              /Unexpected end of script/
            );
          }
          assert.deepEqual(
            parser.parse("<root><script>raw <a> &amp; text</script></root>"),
            { root: { script: "raw <a> &amp; text" } }
          );
          console.log("stop-node-regression-passed");
        `,
      ], {
        cwd: fileURLToPath(new URL("../", import.meta.url)),
        env: { PATH: process.env.PATH, NODE_NO_WARNINGS: "1" },
        encoding: "utf8", timeout: 5_000, maxBuffer: 4096,
      });
      expect(child.error).toBeUndefined();
      expect(child.signal).toBeNull();
      expect(child.status, child.stderr).toBe(0);
      expect(child.stdout.trim()).toBe("stop-node-regression-passed");
    }, 10_000);

    it(`preserves the real storage multipart XML caller through ${mode}`, async () => {
      const { Storage, TransferManager } = mode === "import"
        ? await import("@google-cloud/storage")
        : require("@google-cloud/storage") as typeof import("@google-cloud/storage");
      const storage = new Storage({ projectId: "xml-fixture", retryOptions: { autoRetry: false } });
      // Replace the authentication client's request before invoking any SDK
      // operation. All upload bytes and responses stay in this local fixture.
      const request = vi.spyOn(storage.authClient, "request")
        .mockResolvedValueOnce({
          data: "<InitiateMultipartUploadResult><UploadId>fixture&amp;id</UploadId></InitiateMultipartUploadResult>",
        } as never)
        .mockResolvedValueOnce({ data: "", headers: { etag: '"fixture&etag"' } } as never)
        .mockResolvedValueOnce({ data: "completed" } as never)
        .mockRejectedValue(new Error("Unexpected storage request in XML fixture"));
      const directory = mkdtempSync(join(tmpdir(), "xml-parser-fixture-"));
      try {
        const file = join(directory, "fixture.txt");
        writeFileSync(file, "synthetic upload bytes");
        const manager = new TransferManager(storage.bucket("xml-fixture"));
        const response = await manager.uploadFileInChunks(file, {
          autoAbortFailure: false, chunkSizeBytes: 1024,
        });
        expect(response?.data).toBe("completed");
        expect(request).toHaveBeenCalledTimes(3);
        const [initiate, part, complete] = request.mock.calls.map(([options]) =>
          options as { method: string; url: string; body?: string | Buffer });
        expect(initiate.method).toBe("POST");
        expect(initiate.url).toMatch(/\?uploads$/);
        expect(part.method).toBe("PUT");
        expect(part.url).toContain("uploadId=fixture&id");
        expect(part.body).toEqual(Buffer.from("synthetic upload bytes"));
        expect(complete.method).toBe("POST");
        expect(complete.body).toBe(
          "<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>&quot;fixture&amp;etag&quot;</ETag></Part></CompleteMultipartUpload>",
        );
      } finally {
        request.mockRestore();
        rmSync(directory, { recursive: true, force: true });
      }
    });
  }
});
