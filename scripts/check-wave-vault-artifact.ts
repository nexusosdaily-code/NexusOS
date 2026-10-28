import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

type Manifest = Record<string, {
  file: string;
  isEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
}>;

function requireArtifact(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[check-wave-vault-artifact] ${message}`);
}

function objectsIn(node: ts.Node): ts.ObjectLiteralExpression[] {
  const result: ts.ObjectLiteralExpression[] = [];
  function visit(child: ts.Node) {
    if (ts.isObjectLiteralExpression(child)) result.push(child);
    ts.forEachChild(child, visit);
  }
  visit(node);
  return result;
}

function property(object: ts.ObjectLiteralExpression, key: string) {
  return object.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) &&
      (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
      p.name.text === key,
  )?.initializer;
}

function hasString(object: ts.ObjectLiteralExpression, key: string, value: string) {
  const node = property(object, key);
  return node && ts.isStringLiteral(node) && node.text === value;
}

/**
 * Reads only public production output. No app/server imports, database, auth,
 * browser, accounts or storage access. This is not Safari or deployment testing.
 * Use the Vite manifest rather than selecting an arbitrary old hashed filename.
 */
export async function checkWaveVaultArtifact(outDir = "dist/public") {
  const read = (file: string) => readFile(path.join(outDir, file), "utf8");
  let manifest: Manifest;
  try {
    manifest = JSON.parse(await read(".vite/manifest.json"));
  } catch {
    throw new Error(
      "[check-wave-vault-artifact] Missing or invalid Vite manifest; run npm run check:release-wave-vault to build and check fresh output.",
    );
  }
  const entryKey = "index.html";
  const hubKey = "src/pages/hub.tsx";
  const vaultKey = "src/pages/wave-vault.tsx";
  for (const key of [entryKey, hubKey, vaultKey]) {
    requireArtifact(manifest[key]?.file, `Missing ${key} production bundle in manifest.`);
  }
  requireArtifact(manifest[entryKey].isEntry, "index.html is not a production entry.");

  const html = await read("index.html");
  requireArtifact(
    html.includes(`/${manifest[entryKey].file}`),
    "index.html does not reference the manifest's current entry bundle.",
  );
  requireArtifact(
    html.includes(`/${manifest[hubKey].file}`),
    "index.html does not preload the manifest's current hub bundle.",
  );

  const reachable = new Set<string>();
  function visit(key: string) {
    if (reachable.has(key)) return;
    requireArtifact(manifest[key], `Missing imported manifest entry ${key}.`);
    reachable.add(key);
    const chunk = manifest[key];
    for (const dependency of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) {
      visit(dependency);
    }
  }
  visit(entryKey);
  for (const key of [hubKey, vaultKey]) {
    requireArtifact(reachable.has(key), `${key} is not reachable from the production entry.`);
  }

  const parse = (file: string, code: string) =>
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const hub = objectsIn(parse(hubKey, await read(manifest[hubKey].file)));
  requireArtifact(
    hub.some((o) => hasString(o, "label", "Wave Vault") && hasString(o, "href", "/wave-vault")),
    "Hub bundle is missing the Wave Vault quick action to /wave-vault.",
  );
  requireArtifact(
    hub.some((o) => {
      if (!hasString(o, "label", "Data & Storage")) return false;
      const items = property(o, "items");
      return items && objectsIn(items).some(
        (item) => hasString(item, "title", "Wave Vault") && hasString(item, "href", "/wave-vault"),
      );
    }),
    "Hub bundle is missing the Wave Vault destination inside Data & Storage.",
  );

  // App's route definitions may live in an extracted static dependency.
  const staticKeys = new Set<string>();
  function visitStatic(key: string) {
    if (staticKeys.has(key)) return;
    staticKeys.add(key);
    for (const dependency of manifest[key].imports ?? []) visitStatic(dependency);
  }
  visitStatic(entryKey);
  let hasRoute = false;
  for (const key of staticKeys) {
    const code = await read(manifest[key].file);
    hasRoute ||= objectsIn(parse(key, code)).some(
      (o) => hasString(o, "path", "/wave-vault") && property(o, "component"),
    );
  }
  requireArtifact(hasRoute, "Production app is missing the /wave-vault route registration.");
  const vaultCode = await read(manifest[vaultKey].file);
  requireArtifact(vaultCode.trim(), "Wave Vault route bundle is empty.");
  console.log("[check-wave-vault-artifact] PASS: hub quick action, Data & Storage destination and reachable Wave Vault route bundle.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkWaveVaultArtifact().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
