import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { chromium, firefox, webkit } from "playwright-core";
import { fixedPointFixtures, fixedPointReference, type FixedPointFixture, type FixedPointReference } from "./wls-fixed-point-reference";
import { collectFixedPointEvidence } from "./wls-fixed-point-browser-evidence";
import { LOCKED_PACKAGE_CSP } from "../tests/browser/locked-packages/policy";
import {
  fixedPointMutations, fixedPointMutationPlugin, type FixedPointMutation,
} from "../tests/browser/fixed-point/mutations";

export function assertFixedPointEvidence(
  evidence: ReturnType<typeof collectFixedPointEvidence>,
  fixtures: readonly FixedPointFixture[], reference: readonly FixedPointReference[],
) {
  assert.equal(evidence.cases.length, fixtures.length, "Every fixture must execute");
  assert.equal(reference.length, fixtures.length);
  assert.equal(evidence.oversizedRejected, true, "17-element vector rejected");
  evidence.cases.forEach((actual, index) => {
    const fixture = fixtures[index], expected = reference[index];
    const label = `case ${index}: ${JSON.stringify(fixture)}`;
    assert.equal(actual.status, expected.status, label);
    assert.deepEqual(actual.profileRejections, [true, true], `${label}: wrong-profile fencing`);
    assert.ok(actual.source.startsWith("// WLS-PY/1"), `${label}: real WLS-PY source`);
    assert.ok(actual.cycles > 0 && actual.cycles <= 2048, `${label}: bounded visited cycles`);
    assert.equal(actual.trace.length, actual.cycles, `${label}: complete visited trace`);
    const calls = actual.trace.filter(i => i.op === "CALL").map(i => String(i.args[0]));
    const steps = fixture.operation === "sum" ? Array(fixture.left.length).fill("fixedSumStep") :
      fixture.operation === "dot" || fixture.operation === "score" ? Array(fixture.left.length).fill("fixedDotStep") : [];
    const rounded = ["multiply", "divide", "dot", "score"].includes(fixture.operation);
    const expectedCalls = [...steps, ...(rounded ? ["fixedRound"] : []),
      ...(expected.status === "division-by-zero" ? [] : ["fixedCheck"])];
    assert.deepEqual(calls, expectedCalls, `${label}: actual visited kernel calls`);
    if (expected.status === "ok") {
      assert.equal(actual.status, "ok");
      if (actual.status !== "ok") throw Error(label);
      assert.equal(actual.units, expected.units, label);
      assert.equal(actual.value, expected.value, label);
      assert.equal(actual.raw, expected.units, `${label}: direct VM result`);
      assert.equal(actual.scale, 1000);
      assert.equal(actual.length, typeof fixture.left === "string" ? null : fixture.left.length);
      assert.equal(actual.adapterCycles, actual.cycles);
      assert.deepEqual(actual.kernelCalls, calls, `${label}: adapter uses visited calls`);
    } else if (expected.status === "overflow") {
      assert.equal(actual.status, "overflow");
      assert.ok("raw" in actual && actual.raw === null, `${label}: real VM range refusal`);
    }
    if (rounded && expected.status !== "division-by-zero") {
      assert.ok(actual.trace.some(i => i.op === "FLOORDIV"), `${label}: WLS rounding visited`);
    }
    if (["multiply", "divide", "dot", "score"].includes(fixture.operation) &&
        !(Array.isArray(fixture.left) && fixture.left.length === 0 && fixture.operation === "dot")) {
      assert.ok(actual.trace.some(i => i.op === "MUL"), `${label}: WLS multiplication visited`);
    }
  });
}

export function assertFixedPointMutationRejected(
  evidence: ReturnType<typeof collectFixedPointEvidence>,
  fixtures: readonly FixedPointFixture[], reference: readonly FixedPointReference[],
  mutation: FixedPointMutation,
) {
  assert.equal(evidence.cases.length, fixtures.length, `${mutation.name}: complete execution, not a browser fault`);
  const index = fixtures.findIndex(fixture => JSON.stringify(fixture) === JSON.stringify(mutation.witness));
  assert.ok(index >= 0, `${mutation.name}: unchanged corpus contains witness`);
  const actual = evidence.cases[index], expected = reference[index];
  assert.equal(expected.status, "ok", `${mutation.name}: independently successful witness`);
  assert.equal(actual.status, "ok", `${mutation.name}: valid execution, not an encoding/range/startup failure`);
  if (actual.status !== "ok" || expected.status !== "ok") throw Error("Unreachable");
  assert.equal(actual.raw, actual.units, `${mutation.name}: real VM result agrees with adapter`);
  assert.notEqual(actual.units, expected.units, `${mutation.name}: numeric witness must expose the mutation`);
  // Check the witness alone as well: an unrelated trace mismatch elsewhere in
  // the corpus must not substitute for detecting its incorrect arithmetic.
  assert.throws(() => assertFixedPointEvidence(
    { cases: [actual], oversizedRejected: evidence.oversizedRejected },
    [fixtures[index]], [expected],
  ), { code: "ERR_ASSERTION", actual: actual.units, expected: expected.units, operator: "strictEqual" },
  `${mutation.name}: unchanged witness expectations reject the numeric result`);
  assert.throws(() => assertFixedPointEvidence(evidence, fixtures, reference),
    { code: "ERR_ASSERTION" }, `${mutation.name}: unchanged full matrix rejects`);
}

async function buildFixedPointFixture(mutation?: FixedPointMutation) {
  const control = mutation && fixedPointMutationPlugin(mutation);
  const bundle = await build({
    configFile: false, envFile: false, root: path.resolve("tests/browser/fixed-point"),
    css: { postcss: { plugins: [] } },
    plugins: control ? [control.plugin] : [],
    build: { write: false, minify: false, target: "es2022" }, logLevel: "warn",
  });
  control?.assertApplied();
  assert.ok(!Array.isArray(bundle) && "output" in bundle);
  return new Map(bundle.output.map(asset => [
    `/${asset.fileName}`, asset.type === "asset"
      ? (typeof asset.source === "string" ? asset.source : Buffer.from(asset.source)) : asset.code,
  ]));
}

export type FixedPointIO = { violations: string[]; forbidden: string[]; arrivals: string[]; errors: string[] };

export function assertFixedPointIO(io: FixedPointIO) {
  assert.deepEqual(io.errors, [], "No uncaught browser faults");
  assert.deepEqual(io.violations, [], "No CSP-blocked I/O attempts");
  assert.deepEqual(io.forbidden, [], "No API, socket or external attempts");
  assert.deepEqual(io.arrivals, [], "No requests forwarded, including to loopback");
}

// The ordinary matrix and all sensitivity controls must use this same verdict.
export function assertFixedPointVerdict(
  evidence: ReturnType<typeof collectFixedPointEvidence>,
  fixtures: readonly FixedPointFixture[], reference: readonly FixedPointReference[],
  node: ReturnType<typeof collectFixedPointEvidence>, io: FixedPointIO,
) {
  assertFixedPointEvidence(evidence, fixtures, reference);
  assert.deepEqual(evidence, node, "Exact Node source, trace, result and error parity");
  assertFixedPointIO(io);
}

const controls = [
  { id: "quiet", kind: null, layer: "quiet" },
  { id: "csp-fetch", kind: "fetch", layer: "violations" },
  { id: "csp-websocket", kind: "websocket", layer: "violations" },
  { id: "route-fetch", kind: "fetch", layer: "forbidden" },
  { id: "route-websocket", kind: "websocket", layer: "forbidden" },
  { id: "sentinel-fetch", kind: "fetch", layer: "arrivals" },
  { id: "sentinel-websocket", kind: "websocket", layer: "arrivals" },
] as const;

export async function runFixedPointBrowsers(requested = ["chromium", "firefox", "webkit"]) {
  const engines = { chromium, firefox, webkit };
  assert.ok(requested.length > 0, "At least one browser required");
  for (const name of requested) assert.ok(Object.hasOwn(engines, name), `Unknown browser: ${name}`);
  const fixtures = fixedPointFixtures(), reference = fixedPointReference(fixtures);
  const node = collectFixedPointEvidence(fixtures);
  assertFixedPointEvidence(node, fixtures, reference);
  const variants = await Promise.all([undefined, ...fixedPointMutations].map(async mutation => ({
    mutation, assets: await buildFixedPointFixture(mutation),
  })));
  // I/O sensitivity needs unchanged arithmetic. Mutated kernels retain the
  // ordinary quiet policy; no detector is relaxed for those runs.
  const runs = variants.flatMap(variant =>
    (variant.mutation ? [controls[0]] : controls).map(control => ({ ...variant, control })));
  // No app/config/env files, database, provider or accounts are loaded.
  // All permitted requests are fulfilled in memory; even loopback is a sentinel.
  const arrivals: string[] = [];
  const server = createServer((req, res) => { arrivals.push(req.url!); res.writeHead(403).end(); });
  server.on("upgrade", (req, socket) => { arrivals.push(req.url!); socket.destroy(); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    for (const name of requested) {
      const browser = await engines[name as keyof typeof engines].launch({
        ...(name === "chromium" ? {
          ...(existsSync("/repl/tools/bin/chromium") ? { executablePath: "/repl/tools/bin/chromium" } : {}),
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
        } : {}),
      }).catch(cause => {
        throw new Error(`Requested ${name} unavailable; install its Playwright browser and host libraries. Not a pass.`, { cause });
      });
      try {
        for (const { mutation, assets, control } of runs) {
          const context = await browser.newContext({ serviceWorkers: "block" });
          try {
            // Routed documents have unknown address space in Chromium. Permit
            // loopback only for sentinel sensitivity, never for quiet/CSP runs.
            if (name === "chromium" && control.layer === "arrivals") {
              await context.grantPermissions(["local-network-access"], { origin });
            }
            const arrivalStart = arrivals.length;
            const forbidden: string[] = [], errors: string[] = [];
            const endpoint = `/api/fixed-point-control/${control.id}`;
            const probeURL = `${control.kind === "websocket" ? origin.replace("http:", "ws:") : origin}${endpoint}`;
            // Only disposable controls relax connect-src, only to this sentinel.
            const policy = control.layer === "forbidden" || control.layer === "arrivals"
              ? LOCKED_PACKAGE_CSP.replace("connect-src 'none'", `connect-src ${origin} ${origin.replace("http:", "ws:")}`)
              : LOCKED_PACKAGE_CSP;
            // CSP-blocked attempts never reach routing. Count them independently.
            await context.addInitScript(`globalThis.fixedPointPolicyViolations = [];
              addEventListener("securitypolicyviolation", event => {
                globalThis.fixedPointPolicyViolations.push(event.violatedDirective + ": " + event.blockedURI);
              });`);
            await context.route("**/*", route => {
              const url = new URL(route.request().url());
              if (control.layer === "arrivals" && control.kind === "fetch" &&
                  url.href === probeURL && route.request().method() === "GET") return route.continue();
              const key = url.pathname === "/" ? "/index.html" : url.pathname;
              if (url.origin !== origin || !assets.has(key) || url.search ||
                  !["GET", "HEAD"].includes(route.request().method())) {
                forbidden.push(url.href);
                return route.abort();
              }
              return route.fulfill({
                contentType: key.endsWith(".html") ? "text/html" : "application/javascript",
                // Empty icon prevents automatic /favicon.ico probes in Firefox.
                headers: { "Content-Security-Policy": `${policy}; img-src data:` }, body: assets.get(key),
              });
            });
            // Observe native CSP without Playwright's socket shim in front of
            // it. The sentinel control also needs a real loopback handshake.
            if (control.kind !== "websocket" || control.layer === "forbidden") {
              await context.routeWebSocket("**/*", socket => { forbidden.push(socket.url()); socket.close(); });
            }
            context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
            const page = await context.newPage();
            const response = await page.goto(origin);
            assert.equal(response?.headers()["content-security-policy"], `${policy}; img-src data:`);
            await page.waitForFunction(() => Boolean((globalThis as any).fixedPointFixture));
            const evidence = await page.evaluate(cases => (globalThis as any).fixedPointFixture.run(cases), fixtures);
            if (!mutation) {
              assertFixedPointEvidence(evidence, fixtures, reference);
              assert.deepEqual(evidence, node, `${name}: exact Node source, trace, result and error parity`);
            }
            if (control.kind) {
              const result = await page.evaluate(
                ({ kind, url }) => (globalThis as any).fixedPointFixture.attemptNetwork(kind, url),
                { kind: control.kind, url: probeURL },
              );
              assert.match(result, /^(fetch-rejected|http-403|socket-error|socket-closed|socket-security-error|socket-native-rejection)$/);
              if (control.layer === "violations") {
                await page.waitForFunction(() => (globalThis as any).fixedPointPolicyViolations.length > 0);
              }
            }
            await page.evaluate("new Promise(resolve => setTimeout(resolve, 0))");
            const violations = await page.evaluate("globalThis.fixedPointPolicyViolations") as string[];
            await context.close();
            const io: FixedPointIO = { violations, forbidden, errors, arrivals: arrivals.slice(arrivalStart) };
            if (control.layer === "quiet") {
              if (mutation) {
                assertFixedPointIO(io);
                assertFixedPointMutationRejected(evidence, fixtures, reference, mutation);
                console.log(`REJECTED ${name}: ${mutation.name}; valid numeric witness, unchanged expectations, zero network`);
              } else {
                assertFixedPointVerdict(evidence, fixtures, reference, node, io);
              }
            } else {
              assert.deepEqual(errors, [], "A broken probe is not evidence of isolation");
              for (const layer of ["violations", "forbidden", "arrivals"] as const) {
                if (layer === control.layer) {
                  assert.equal(io[layer].length, 1, `${name}/${control.id}: one native detection required`);
                  assert.ok(io[layer][0].includes(endpoint), `${name}/${control.id}: expected probe detected`);
                  if (layer === "violations") assert.match(io[layer][0], /^connect-src:/);
                } else assert.deepEqual(io[layer], [], `${name}/${control.id}: isolated detector`);
              }
              const message = control.layer === "violations" ? /No CSP-blocked I\/O attempts/
                : control.layer === "forbidden" ? /No API, socket or external attempts/
                : /No requests forwarded, including to loopback/;
              assert.throws(() => assertFixedPointVerdict(evidence, fixtures, reference, node, io), message,
                `${name}/${control.id}: matching arithmetic must not hide I/O`);
              console.log(`CONTROL ${name}/${control.id}: native ${control.kind} detected; matching arithmetic verdict rejected`);
            }
          } finally { await context.close(); }
        }
      } finally { await browser.close(); }
      console.log(`PASS ${name}: ${fixtures.length} fixed-point cases match Python Fraction and Node; ${fixedPointMutations.length} browser-only mutations rejected; visited kernel calls, wrong-profile rejection, zero network; six native I/O sensitivity controls rejected`);
    }
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runFixedPointBrowsers(process.argv.length > 2 ? process.argv.slice(2) : undefined);
}
