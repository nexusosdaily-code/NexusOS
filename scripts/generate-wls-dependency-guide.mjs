import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const overview = "docs/wavelengthscript-dependencies.md";
// Include the complete linked dependency guides, rather than metadata-only
// summaries. No application code, private uploads or credentials are imported.
const docs = [...new Set([overview, ...[...read(overview).matchAll(/\]\(([^)]+\.md)\)/g)]
  .map(match => `docs/${match[1]}`)])];
for (const path of docs) {
  if (!/^docs\/(?:wavelengthscript-[a-z0-9-]+|WAVELENGTHSCRIPT_POSITIONING)\.md$/.test(path)) {
    throw new Error("Unexpected dependency guide path.");
  }
}
const id = path => path.slice(5, -3);
const title = path => read(path).split("\n").find(line => line.startsWith("# "))?.slice(2) ?? path;
const sections = docs.map(path => `<section id="${id(path)}"><h2>${escape(title(path))}</h2><p>Repository source: <code>${escape(path)}</code></p><pre>${escape(read(path))}</pre><a href="#contents">Back to contents</a></section>`).join("\n");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WavelengthScript working dependencies 0.1.0–0.18.0</title>
<meta name="description" content="Executable local WavelengthScript dependency packages, real instructions, limits, examples and audit evidence for retained releases 0.1.0 through 0.18.0.">
<style>body{margin:0;background:#10121a;color:#e7e9f3;font:16px/1.65 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:24px clamp(16px,4vw,48px)}a{color:#bfb0ff}a:focus-visible{outline:3px solid #fff;outline-offset:4px}h1,h2{line-height:1.25}section{border-top:1px solid #454459;margin-top:36px;padding-top:20px;scroll-margin-top:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.65 ui-monospace,monospace;background:#191c28;padding:16px;border-radius:8px}li{margin:8px 0}.note{border-left:4px solid #a994ff;padding:12px 18px;background:#202030}code{overflow-wrap:anywhere}</style></head>
<body><main><p><a href="/learn">Open the learning tools</a></p><h1>Working WavelengthScript dependencies</h1>
<p>Retained releases <strong>0.1.0–0.18.0</strong>. These are repository-local executable libraries, not a public package registry or a completed replacement for every project dependency.</p>
<p class="note">Algorithms execute as actual WavelengthScript instructions in bounded profiles. The interpreter, compiler and developer adapters still use TypeScript/JavaScript. Source locks check content integrity, not author identity or complete host security. Unsupported operations fail explicitly; queues or host adapters are not native language implementations.</p>
<nav id="contents" aria-label="Dependency guide contents"><h2>Complete guide and audit</h2><ol>${docs.map(path => `<li><a href="#${id(path)}">${escape(title(path))}</a></li>`).join("")}</ol></nav>
${sections}</main></body></html>
`;
const output = resolve(root, "public/wavelengthscript-dependencies.html");
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8") !== html) throw new Error("Dependency webpage is stale. Run npm run generate:wls-dependency-guide.");
  console.log("Dependency webpage matches all linked disclosure guides.");
} else {
  writeFileSync(output, html);
  console.log(`Generated dependency webpage with ${docs.length} complete guides.`);
}
