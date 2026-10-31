// Test-only preload. This is a regression tripwire, not an OS security sandbox.
// fd 3 is a separate audit channel: CLI output/error handling cannot hide attempts.
// Node replays --require in its loader worker; only the CLI thread owns lifecycle.
if (!require("node:worker_threads").isMainThread) return;
const Module = require("node:module");
const { register, syncBuiltinESMExports } = Module;
const workerThreads = require("node:worker_threads");
const { pathToFileURL } = require("node:url");
const { join, isAbsolute } = require("node:path");
const { audit, checkImport } = require("./wls-cli-isolation-boundaries.cjs");
function deny(operation) {
  return function () {
    audit({ violation: operation });
    throw new Error(`CLI isolation guard: ${operation}`);
  };
}
function block(object, names, prefix) {
  for (const name of names) {
    if (typeof object[name] === "function") object[name] = deny(`${prefix}.${name}`);
  }
}

const net = require("node:net");
block(net, ["connect", "createConnection"], "net");
block(net.Socket.prototype, ["connect"], "net.Socket");
block(net.Server.prototype, ["listen"], "net.Server");
block(require("node:tls"), ["connect"], "tls");
for (const protocol of ["http", "https"]) {
  block(require(`node:${protocol}`), ["request", "get"], protocol);
}
block(require("node:dgram"), ["createSocket"], "dgram");
const dns = require("node:dns");
const dnsMethods = Object.keys(dns).filter(name => name === "lookup" || name === "lookupService" || name.startsWith("resolve") || name === "reverse");
block(dns, dnsMethods, "dns");
block(dns.promises, dnsMethods, "dns.promises");
block(dns.Resolver.prototype, dnsMethods, "dns.Resolver");
block(dns.promises.Resolver.prototype, dnsMethods, "dns.promises.Resolver");
globalThis.fetch = deny("fetch");
if (globalThis.WebSocket) globalThis.WebSocket = deny("WebSocket");
const childProcess = require("node:child_process");
block(childProcess, ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"], "child_process");
// Also catch direct ChildProcess construction (and callers such as cluster).
block(childProcess.ChildProcess.prototype, ["spawn"], "child_process.ChildProcess");
syncBuiltinESMExports();

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (specifier, ...args) {
  checkImport(specifier);
  const result = originalResolve.call(this, specifier, ...args);
  if (isAbsolute(result)) checkImport(specifier, pathToFileURL(result).href);
  return result;
};
// Keep resolution and TS transpilation in one loader; tsx itself tries IPC
// connections, which would otherwise need exceptions in this strict guard.
register(pathToFileURL(join(__dirname, "wls-cli-isolation-loader.mjs")));
// Preserve the harness loader, but forbid application loaders: register() can
// reuse that worker, whose builtins are not patched by this main-thread guard.
// Also deny synchronous hooks on runtimes that expose registerHooks().
block(Module, ["register", "registerHooks"], "module");
// register() synchronously starts Node's internal loader worker. No application
// entrypoint has run yet; from here on all exported Worker construction is denied.
// Do not allow workers based on user-controlled filenames or constructor options.
workerThreads.Worker = deny("worker_threads.Worker");
syncBuiltinESMExports();

let drained = false;
process.on("beforeExit", () => { drained = true; });
process.on("exit", code => { audit({ exit: code, drained }); });
audit({ ready: true });
