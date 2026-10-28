import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { execSync } from "child_process";
import { checkPreloads } from "../scripts/check-preloads.js";
import { checkProductionStartupArtifact } from "../scripts/check-startup-corrections.js";
import { checkWaveVaultArtifact } from "../scripts/check-wave-vault-artifact.js";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  console.log("running database-free server and client tests...");
  // Bound worker contention in the publishing container. All tests still run;
  // oversubscribed workers can exhaust short real-time polling/lock deadlines.
  execSync("npx vitest run --project server --project client --maxWorkers=2", {
    stdio: "inherit",
    env: {
      ...process.env,
      WNSP_PUBLISH_BUILD: "1",
      // Allow db module imports, but never expose the publish database to tests.
      // Any accidental real connection fails against an unused local port.
      DATABASE_URL: "postgresql://build_test:build_test@127.0.0.1:1/build_tests",
    },
  });

  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild({ build: { manifest: true } }); // bundle-size check fires inside Vite's closeBundle plugin hook

  console.log("checking Wave Vault production navigation...");
  await checkWaveVaultArtifact();

  console.log("checking critical modulepreloads...");
  await checkPreloads();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
  checkProductionStartupArtifact();
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
