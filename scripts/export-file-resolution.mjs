import { isBuiltin } from "node:module";
import { posix } from "node:path";

// Deliberately not Node/TypeScript's full resolver: no filesystem, package.json,
// extension substitution, package exports, loaders, or transitive traversal.
export const fileExtensions = Object.freeze([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json",
]);

function localPath(path) {
  if (!path || posix.isAbsolute(path) || path.includes("\\") || /[\x00-\x1f?#]/.test(path)) {
    throw new Error("Unsupported local import path");
  }
  const normalized = posix.normalize(path);
  if (normalized === ".." || normalized.startsWith("../") ||
      normalized.split("/").includes("node_modules")) {
    throw new Error("Local import must stay inside the repository, outside node_modules");
  }
  return normalized;
}

function candidates(path) {
  const extension = posix.extname(path);
  // ".generated" is part of a TypeScript source basename, not a loader
  // extension. Only accept concrete source files present in the proposed tree.
  if (extension === ".generated") return [path + ".ts", path + ".tsx"];
  if (extension) {
    if (!fileExtensions.includes(extension)) throw new Error(`Unsupported local import extension: ${extension}`);
    return [path];
  }
  return [...fileExtensions.map(ext => path + ext),
    ...fileExtensions.map(ext => posix.join(path, `index${ext}`))];
}

// Inputs are literal specifiers and metadata from the proposed immutable tree.
// A resolved target is inclusion evidence only; its bytes are never read/run.
export function resolveFileImports(files, aliases, entries) {
  const index = new Map();
  for (const entry of entries) {
    if (index.has(entry.path)) throw new Error(`Duplicate proposed tree path: ${entry.path}`);
    index.set(entry.path, entry);
  }
  for (const alias of aliases) {
    if (alias.targets.some(target => target.split("*").length > 2 ||
        (!alias.key.includes("*") && target.includes("*")))) {
      throw new Error(`Unsupported resolution alias: ${alias.key}`);
    }
    for (const target of alias.targets) localPath(posix.join(alias.base, target));
  }
  const checked = [];
  const problems = [];
  for (const { path, imports } of files) {
    for (const specifier of imports) {
      if (isBuiltin(specifier)) continue;
      try {
        let targets;
        if (specifier.startsWith("./") || specifier.startsWith("../")) {
          // Reject unsupported syntax before normalizing the relative path.
          if (specifier.includes("\\") || /[\x00-\x1f?#]/.test(specifier)) {
            throw new Error("Unsupported local import path");
          }
          targets = [localPath(posix.join(posix.dirname(path), specifier))];
        } else {
          // TypeScript paths precedence: exact match, then longest prefix
          // before '*'; configuration order breaks equal-prefix ties.
          const matches = aliases.filter(alias => alias.pattern.test(specifier));
          matches.sort((a, b) => Number(b.key === specifier) - Number(a.key === specifier) ||
            b.key.split("*")[0].length - a.key.split("*")[0].length);
          const alias = matches[0];
          if (!alias) continue;
          if (posix.isAbsolute(specifier) || specifier.includes("\\") || /[\x00-\x1f?#]/.test(specifier)) {
            throw new Error("Unsupported local alias specifier");
          }
          const capture = alias.pattern.exec(specifier)[1] ?? "";
          if (capture.split("/").some(part => part === "." || part === "..") ||
              capture.includes("\\") || /[\x00-\x1f?#]/.test(capture)) {
            throw new Error("Unsupported alias wildcard capture");
          }
          targets = alias.targets.map(target =>
            localPath(posix.join(alias.base, target.replace("*", () => capture))));
        }
        let resolved;
        for (const target of targets) {
          for (const candidate of candidates(target)) {
            const entry = index.get(candidate);
            if (!entry) continue;
            if (entry.type === "tree") continue;
            if (entry.type !== "blob" || !["100644", "100755"].includes(entry.mode) ||
                !/^[a-f0-9]{40}$/.test(entry.sha)) {
              throw new Error(`Target is not a regular Git blob: ${candidate}`);
            }
            resolved = candidate;
            break;
          }
          if (resolved) break;
        }
        if (!resolved) throw new Error(`Missing target in proposed tree (supported files/indexes only): ${targets.join(", ")}`);
        checked.push({ path, specifier, target: resolved });
      } catch (error) {
        problems.push(`${path}: ${specifier}: ${error.message}`);
      }
    }
  }
  if (problems.length) throw new Error(`File resolution export rejected:\n${problems.join("\n")}`);
  return checked;
}
