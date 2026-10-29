import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  beforeDisclosurePR, checkLocalDisclosureTree, checkGitHubDisclosureTree,
  validateDisclosureSources,
} from "./check-disclosure-export.mjs";

const register = readFileSync("PRIOR_ART.md", "utf8");
const catalogue = readFileSync("server/prior-art-campaign.ts", "utf8");
const truncated = register.slice(0, register.indexOf("### Claim 36"));
const treeSha = "a".repeat(40);
function metadataOnlyClaim(number: number, indented = false) {
  const pattern = new RegExp(`^### Claim ${number}\\n([\\s\\S]*?)(?=^### Claim |^## |$(?![\\s\\S]))`, "m");
  return register.replace(pattern, section => {
    const metadata = section.split("\n").filter(line => /^\*\*[^*]+\*\*:/.test(line));
    return `### Claim ${number}\n` + metadata.map(line => indented ? `  ${line}` : line).join("\n") +
      (indented ? "\n  metadata continuation, not a disclosure paragraph\n" : "\n") +
      "\n---\n\n";
  });
}
function remoteFixture(text = register) {
  const blobs: Record<string, any> = {};
  const tree = [text, catalogue].map((source, i) => {
    const bytes = Buffer.from(source);
    const sha = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    blobs[`git/blobs/${sha}`] = { sha, size: bytes.length, encoding: "base64", content: bytes.toString("base64") };
    return { path: ["PRIOR_ART.md", "server/prior-art-campaign.ts"][i], mode: "100644", type: "blob", sha };
  });
  const listing = { sha: treeSha, truncated: false, tree };
  return { listing, blobs, request: vi.fn(async (path: string) =>
    path === `git/trees/${treeSha}?recursive=1` ? listing : blobs[path]) };
}

describe("isolated pre-PR disclosure export", () => {
  it("accepts the complete register, including CRLF, without executing catalogue code", () => {
    expect(validateDisclosureSources(register.replace(/\n/g, "\r\n"),
      catalogue + '\nthrow new Error("must not execute");')).toEqual({ claims: 39, indexRows: 39, anchors: 39 });
  });

  it.each([
    ["truncated full register", truncated],
    ["missing index row", register.replace(/^\| \[39\].*\n/m, "")],
    ["wrong anchor", register.replace("[39](#claim-39)", "[39](#claim-38)")],
    ["duplicate heading", register.replace("### Claim 39", "### Claim 38")],
    ["out-of-order rows", register.replace("[38](#claim-38)", "[40](#claim-40)")],
    ["wrong title", register.replace("| Ghost Nodes", "| Different Ghost Nodes")],
    ["heading without body", register.slice(0, register.indexOf("### Claim 39")) +
      "### Claim 39\n**Title**: test\n**First disclosed**: 2026-08-08\n\n## Appendix\nNot a disclosure."],
  ])("rejects %s", (_, source) => {
    expect(() => validateDisclosureSources(source, catalogue)).toThrow(/Disclosure export rejected/);
  });

  it("rejects missing, dynamic, empty or syntactically invalid catalogues", () => {
    for (const source of ["", "export const PRIOR_ART_CLAIMS = []", "export const PRIOR_ART_CLAIMS = load()",
      "export const PRIOR_ART_CLAIMS = [", catalogue.replace(/,\n\] as const/, ',\n"extra",\n] as const')]) {
      expect(() => validateDisclosureSources(register, source)).toThrow();
    }
  });

  it.each([
    [1, false], [39, false], [1, true], [39, true],
  ])("rejects metadata-only claim %i (indented=%s) through both tree paths", async (number, indented) => {
    const source = metadataOnlyClaim(number, indented);
    expect(source).toContain(number === 1 ? "**Route**:" : "**Basis**:");
    const cwd = mkdtempSync(join(tmpdir(), "metadata-only-disclosure-"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
    try {
      git("init", "-q");
      mkdirSync(join(cwd, "server"));
      writeFileSync(join(cwd, "PRIOR_ART.md"), source);
      writeFileSync(join(cwd, "server/prior-art-campaign.ts"), catalogue);
      git("add", ".");
      const tree = git("write-tree");
      const message = `claim ${number} lacks disclosure metadata or body`;
      expect(() => checkLocalDisclosureTree(tree, cwd)).toThrow(message);
      const createPR = vi.fn();
      await expect(beforeDisclosurePR(treeSha, remoteFixture(source).request, createPR))
        .rejects.toThrow(message);
      expect(createPR).not.toHaveBeenCalled();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("reads the proposed Git tree, not the repaired workspace, and exits nonzero", () => {
    const cwd = mkdtempSync(join(tmpdir(), "disclosure-export-"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
    try {
      git("init", "-q");
      mkdirSync(join(cwd, "server"));
      writeFileSync(join(cwd, "PRIOR_ART.md"), truncated);
      writeFileSync(join(cwd, "server/prior-art-campaign.ts"), catalogue);
      git("add", ".");
      const badTree = git("write-tree");
      writeFileSync(join(cwd, "PRIOR_ART.md"), register);
      expect(() => checkLocalDisclosureTree(badTree, cwd)).toThrow(/full claims: expected 1–39/);
      try {
        execFileSync(process.execPath, [join(process.cwd(), "scripts/check-disclosure-export.mjs"),
          "--tree", badTree], { cwd, stdio: "pipe" });
        throw new Error("CLI unexpectedly passed");
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(String(error.stderr)).toContain("Disclosure export rejected");
      }
      git("add", ".");
      expect(checkLocalDisclosureTree(git("write-tree"), cwd).claims).toBe(39);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("blocks PR creation for a truncated remote tree, then permits a complete tree", async () => {
    const createPR = vi.fn(async evidence => evidence);
    await expect(beforeDisclosurePR(treeSha, remoteFixture(truncated).request, createPR))
      .rejects.toThrow(/full claims: expected 1–39/);
    expect(createPR).not.toHaveBeenCalled();
    const result = await beforeDisclosurePR(treeSha, remoteFixture().request, createPR);
    expect(result.tree).toBe(treeSha);
    expect(result.claims).toBe(39);
    expect(createPR).toHaveBeenCalledTimes(1);
  });

  it.each(["truncated", "wrong tree", "missing", "symlink", "corrupt", "unavailable"])(
    "fails closed on %s readback", async mode => {
      const fixture = remoteFixture();
      if (mode === "truncated") fixture.listing.truncated = true;
      if (mode === "wrong tree") fixture.listing.sha = "b".repeat(40);
      if (mode === "missing") fixture.listing.tree.pop();
      if (mode === "symlink") fixture.listing.tree[0].mode = "120000";
      if (mode === "corrupt") Object.values(fixture.blobs)[0].content = "Y29ycnVwdA==";
      if (mode === "unavailable") fixture.request.mockRejectedValue(new Error("GitHub unavailable"));
      const createPR = vi.fn();
      await expect(beforeDisclosurePR(treeSha, fixture.request, createPR)).rejects.toThrow();
      expect(createPR).not.toHaveBeenCalled();
    });

  it("requires immutable remote SHAs", async () => {
    await expect(checkGitHubDisclosureTree("main", remoteFixture().request)).rejects.toThrow(/immutable/);
  });
});
