// Standalone synthetic entry point, never imported by ordinary navigation.
const params = new URLSearchParams(location.search);
const kind = params.get("kind");
const target = params.get("target");
const url = new URL(target);
if (!["api", "external"].includes(kind) ||
    location.hostname !== "127.0.0.1" || url.hostname !== "127.0.0.1" ||
    url.protocol !== "http:" ||
    (kind === "api" && (url.origin !== location.origin || !url.pathname.startsWith("/api"))) ||
    (kind === "external" && url.origin === location.origin)) {
  throw new Error("Worker faults require the runner's loopback-only targets");
}

window.isolationResult = { settled: false };
const worker = new Worker(new URL("./dedicated-worker.js", import.meta.url), { type: "module" });
worker.onmessage = event => {
  window.isolationResult = event.data;
  worker.terminate();
};
worker.onerror = () => {
  worker.terminate();
  // Do not turn script/worker errors into a successful fetch rejection.
  window.isolationResult = { settled: true, outcome: "worker-error" };
};
worker.postMessage({ kind, target });
