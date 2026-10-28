import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const disclosurePaths = ["PRIOR_ART.md", "server/prior-art-campaign.ts"];
const shaPattern = /^[a-f0-9]{40}$/;
function requireSha(sha) {
  if (!shaPattern.test(sha)) throw new Error("An immutable Git object SHA is required.");
}

// Parse data, never import/evaluate exported application code or start a campaign.
function catalogueTitles(source) {
  const file = ts.createSourceFile("catalogue.ts", source, ts.ScriptTarget.Latest, true);
  if (file.parseDiagnostics.length) throw new Error("Invalid announcement catalogue syntax.");
  const declarations = file.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .filter(declaration => declaration.name.getText(file) === "PRIOR_ART_CLAIMS");
  if (declarations.length !== 1) throw new Error("Expected one PRIOR_ART_CLAIMS catalogue.");
  let value = declarations[0].initializer;
  if (value && ts.isAsExpression(value)) value = value.expression;
  if (!value || !ts.isArrayLiteralExpression(value) || !value.elements.length ||
      !value.elements.every(ts.isStringLiteral)) {
    throw new Error("Catalogue must be a nonempty literal string array.");
  }
  return value.elements.map(element => element.text);
}

export function validateDisclosureSources(register, catalogue) {
  register = register.replace(/\r\n/g, "\n");
  const titles = catalogueTitles(catalogue);
  const full = [...register.matchAll(/^### Claim (\d+)\s*$/gm)];
  const rows = [...register.matchAll(/^\| \[(\d+)\]\(#claim-(\d+)\) \| (.*?) \|/gm)];
  const expected = titles.map((_, i) => i + 1);
  const problems = [];
  for (const [label, actual] of [
    ["full claims", full.map(match => Number(match[1]))],
    ["index rows", rows.map(match => Number(match[1]))],
    ["anchor numbers", rows.map(match => Number(match[2]))],
  ]) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      problems.push(`${label}: expected 1–${titles.length}, received [${actual.join(", ")}]`);
    }
  }
  rows.forEach((row, i) => {
    if (row[3] !== titles[i]) problems.push(`index/catalogue title mismatch at claim ${row[1]}`);
  });
  full.forEach((heading, i) => {
    // Stop before the next section, so an appendix cannot supply missing prose.
    const block = register.slice(heading.index + heading[0].length,
      full[i + 1]?.index ?? register.length).split(/^## /m)[0];
    const prose = block.split("\n").filter(line => line.trim() &&
      !/^(?:\*\*[^*]+\*\*:|---|\*AGPL|\*Repository)/.test(line));
    if (!/^\*\*Title\*\*: .+/m.test(block) ||
        !/^\*\*First disclosed\*\*: \d{4}-\d{2}-\d{2}/m.test(block) ||
        !prose.length) problems.push(`claim ${heading[1]} lacks disclosure metadata or body`);
  });
  if (problems.length) throw new Error(`Disclosure export rejected:\n${problems.join("\n")}`);
  return { claims: titles.length, indexRows: rows.length, anchors: rows.length };
}

export function checkLocalDisclosureTree(treeish, cwd = process.cwd()) {
  const git = args => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  const tree = git(["rev-parse", "--verify", "--end-of-options", `${treeish}^{tree}`]).trim();
  requireSha(tree);
  const sources = disclosurePaths.map(path => {
    const entry = git(["ls-tree", tree, "--", path]);
    if (!/^100644 blob [a-f0-9]{40}\t/.test(entry)) throw new Error(`Missing regular file: ${path}`);
    return git(["show", `${tree}:${path}`]);
  });
  return { tree, ...validateDisclosureSources(...sources) };
}

// request is an authenticated, read-only GitHub JSON adapter. No credentials here.
export async function checkGitHubDisclosureTree(tree, request) {
  requireSha(tree);
  const listing = await request(`git/trees/${tree}?recursive=1`);
  if (listing.sha !== tree || listing.truncated !== false || !Array.isArray(listing.tree)) {
    throw new Error("Git tree readback is incomplete or has the wrong SHA.");
  }
  const blobs = {};
  const sources = [];
  for (const path of disclosurePaths) {
    const entries = listing.tree.filter(entry => entry.path === path);
    const entry = entries[0];
    if (entries.length !== 1 || entry.type !== "blob" || entry.mode !== "100644") {
      throw new Error(`Missing regular file in proposed tree: ${path}`);
    }
    requireSha(entry.sha);
    const blob = await request(`git/blobs/${entry.sha}`);
    if (blob.sha !== entry.sha || blob.encoding !== "base64" || typeof blob.content !== "string") {
      throw new Error(`Invalid blob readback: ${path}`);
    }
    const bytes = Buffer.from(blob.content, "base64");
    const hash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    if (hash !== entry.sha || bytes.length !== blob.size) throw new Error(`Blob hash/size mismatch: ${path}`);
    blobs[path] = hash;
    sources.push(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  }
  return { tree, blobs, ...validateDisclosureSources(...sources) };
}

// Only this continuation may create a release PR, using this exact checked tree.
export async function beforeDisclosurePR(tree, request, createPR) {
  const evidence = await checkGitHubDisclosureTree(tree, request);
  return createPR(evidence);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== "--tree") {
      throw new Error("Usage: node scripts/check-disclosure-export.mjs --tree <proposed-tree-or-commit>");
    }
    console.log(JSON.stringify(checkLocalDisclosureTree(process.argv[3]), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
