const { writeSync } = require("node:fs");
const { fileURLToPath } = require("node:url");
const { resolve, sep } = require("node:path");

function audit(event) {
  writeSync(3, JSON.stringify(event) + "\n");
}
const forbiddenRoots = ["server", "client"].map(dir => resolve(dir) + sep);
const forbiddenPackages = /^(?:pg(?:-pool|-native|-protocol)?|drizzle-orm|express|vite)(?:\/|$)/;
function checkImport(specifier, url) {
  const path = url?.startsWith("file:") ? fileURLToPath(url) : "";
  if (forbiddenPackages.test(specifier) ||
      forbiddenRoots.some(root => path.startsWith(root)) ||
      /[/\\]node_modules[/\\](?:pg|pg-pool|pg-native|pg-protocol|drizzle-orm|express|vite)[/\\]/.test(path)) {
    audit({ violation: "startup import" });
    throw new Error("CLI isolation guard: startup import");
  }
}
module.exports = { audit, checkImport };
