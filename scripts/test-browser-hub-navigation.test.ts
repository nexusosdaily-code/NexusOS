import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const runner = path.join(root, "scripts/test-browser-hub-navigation.mjs");
const observer = path.join(root, "tests/browser/hub-navigation/observe-server.mjs");
const node = path.join(root, "node_modules/.bin/node");

type ListenerEvent = {
  event: "listening" | "close";
  id: number;
  address: { address: string; port: number; family: string } | null;
};

function groupExists(pid: number) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}

async function run(args: string[]) {
  const directory = await mkdtemp(path.join(tmpdir(), "hub-navigation-cli-"));
  const browsers = path.join(directory, "empty-browsers");
  const trace = path.join(directory, "listeners.jsonl");
  await mkdir(browsers);
  // Do not inherit credentials, DATABASE_URL, NODE_OPTIONS or browser overrides.
  // Real Playwright must fail against this empty directory; never install engines.
  const child = spawn(node, ["--import", observer, runner, ...args], {
    cwd: root,
    detached: true,
    env: {
      PATH: process.env.PATH,
      HOME: directory,
      TMPDIR: directory,
      NO_COLOR: "1",
      PLAYWRIGHT_BROWSERS_PATH: browsers,
      HUB_SERVER_TRACE: trace,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.setEncoding("utf8").on("data", chunk => { output += chunk; });
  child.stderr.setEncoding("utf8").on("data", chunk => { output += chunk; });
  let timedOut = false;
  const kill = () => {
    if (child.pid && groupExists(child.pid)) process.kill(-child.pid, "SIGKILL");
  };
  // A leaked fixture listener must fail the test, not hang the suite indefinitely.
  const timer = setTimeout(() => { timedOut = true; kill(); }, 30_000);
  try {
    const [code, signal] = await once(child, "close");
    clearTimeout(timer);
    // esbuild's subprocess can take a moment to exit after its parent closes.
    const deadline = Date.now() + 2_000;
    while (child.pid && groupExists(child.pid) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    expect(timedOut, `Command hung instead of exiting:\n${output}`).toBe(false);
    expect(signal, output).toBeNull();
    expect(code, output).not.toBe(0);
    expect(typeof code, output).toBe("number");
    expect(groupExists(child.pid!), "Runner or descendant process leaked").toBe(false);
    let events: ListenerEvent[] = [];
    try {
      events = (await readFile(trace, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return { output, events };
  } finally {
    clearTimeout(timer);
    kill(); // Also clean up on failed assertions or a launch/timeout error.
    if (child.exitCode === null && child.signalCode === null && child.pid) {
      await once(child, "close");
    }
    await rm(directory, { recursive: true, force: true });
  }
}

async function expectPortReleased(port: number) {
  const probe = createServer();
  try {
    // Match the fixture's wildcard bind, not only a loopback connection refusal.
    await new Promise<void>((resolve, reject) => {
      probe.once("error", reject);
      probe.listen(port, "0.0.0.0", resolve);
    });
  } finally {
    if (probe.listening) await new Promise<void>(resolve => probe.close(() => resolve()));
  }
}

describe("Hub navigation runner fails closed without installed browsers", () => {
  for (const engine of ["firefox", "webkit"]) {
    it(`fails for missing ${engine}, explains installation and closes its fixture`, async () => {
      const { output, events } = await run([engine]);
      expect(output).toContain(`Hub navigation checks failed in ${engine}`);
      expect(output).toContain(`Cannot launch requested engine ${engine}`);
      expect(output).toContain(`node node_modules/playwright-core/cli.js install ${engine}`);
      expect(output).toContain("host libraries");
      // Prove this reached the real missing-executable failure, not an unrelated
      // build/import/configuration error or an intentionally mocked launch.
      expect(output).toContain("Executable doesn't exist");
      expect(output).not.toMatch(/\bPASS\b/);
      const opened = events.filter(event => event.event === "listening");
      expect(opened).toHaveLength(1);
      expect(events.filter(event => event.event === "close").map(event => event.id))
        .toEqual(opened.map(event => event.id));
      await expectPortReleased(opened[0].address!.port);
    }, 40_000);
  }

  it.each(["safari", "Firefox", "--unknown"])("rejects unknown engine %s before starting a server", async engine => {
    const { output, events } = await run([engine]);
    expect(output).toContain(`Unknown browser engine: ${engine}`);
    expect(output).not.toContain("Cannot launch requested engine");
    expect(output).not.toMatch(/\bPASS\b/);
    expect(events).toEqual([]);
  }, 40_000);

  it("validates the entire engine list before launching a valid prefix", async () => {
    const { output, events } = await run(["firefox", "safari"]);
    expect(output).toContain("Unknown browser engine: safari");
    expect(output).not.toContain("Cannot launch requested engine");
    expect(events).toEqual([]);
  }, 40_000);

  it.each([
    ["--serve", "firefox"],
    ["webkit", "--serve"],
    ["--serve", "safari"],
  ])("rejects conflicting arguments %j %j without starting a server", async (...args) => {
    const { output, events } = await run(args);
    expect(output).toContain("--serve cannot be combined with engine names");
    expect(output).not.toContain("Isolated navigation fixture:");
    expect(output).not.toContain("Cannot launch requested engine");
    expect(output).not.toMatch(/\bPASS\b/);
    expect(events).toEqual([]);
  }, 40_000);
});
