// Only disposable synthetic contexts load these assets. The numerical bundle
// and its real page-click task are unchanged; no native network API is replaced.
export const fractionalPolicy =
  "default-src 'none'; script-src 'self'; connect-src 'none'; worker-src 'none'; img-src data:; base-uri 'none'";
export const fractionalNetworkControls = [
  { id: "quiet", kind: null, layer: "quiet" },
  { id: "csp-http", kind: "fetch", layer: "violations" },
  { id: "csp-websocket", kind: "websocket", layer: "violations" },
  { id: "csp-worker", kind: "worker", layer: "violations" },
  { id: "route-http", kind: "fetch", layer: "forbidden" },
  { id: "route-websocket", kind: "websocket", layer: "forbidden" },
  { id: "worker-http", kind: "worker-fetch", layer: "violations" },
  { id: "worker-websocket", kind: "worker-websocket", layer: "violations" },
] as const;
export const probeScriptPath = "/__fractional_control__/probe.js";
export const workerScriptPath = "/__fractional_control__/worker.js";

// Raw JavaScript avoids tsx's inferred-name helpers in serialized page code.
// All attempts originate in a native click/worker message task, never evaluate.
const nativeAttempt = `
async function attempt(kind, url) {
  if (kind === "fetch") {
    try { await fetch(url); return "unexpected-http-response"; }
    catch (error) { return "fetch-rejected:" + error.name; }
  }
  return new Promise(resolve => {
    let socket;
    try {
      socket = new WebSocket(url);
      socket.onopen = () => { socket.close(); resolve("unexpected-socket-open"); };
      socket.onerror = () => resolve("socket-error");
      socket.onclose = () => resolve("socket-closed");
    } catch (error) {
      resolve("socket-rejected:" + error.name + ":" + error.message);
    }
  });
}`;
export const fractionalProbeScript = `
${nativeAttempt}
const button = document.createElement("button");
button.id = "network-probe";
button.textContent = "Run isolated network probe";
document.body.append(button);
button.addEventListener("click", async () => {
  const config = JSON.parse(button.dataset.config);
  const evidence = { kind: config.kind, url: config.url, started: true, result: null,
    workerStarted: false, workerTerminated: false, workerViolations: [] };
  globalThis.fractionalProbe = evidence;
  try {
    if (config.kind === "worker") {
      try {
        const worker = new Worker(config.url);
        try {
          evidence.result = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Worker rejection timed out")), 10000);
            worker.onerror = event => { event.preventDefault(); clearTimeout(timer); resolve("worker-error"); };
            worker.onmessage = () => { clearTimeout(timer); resolve("unexpected-worker-message"); };
          });
        } finally {
          worker.terminate();
          evidence.workerTerminated = true;
        }
      } catch (error) { evidence.result = "worker-rejected:" + error.name; }
    } else if (config.kind.startsWith("worker-")) {
      const worker = new Worker(config.workerURL);
      try {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Worker probe timed out")), 10000);
          worker.onerror = event => { clearTimeout(timer); reject(new Error(event.message)); };
          worker.onmessage = event => {
            if (event.data.type === "started") evidence.workerStarted = true;
            if (event.data.type === "complete") {
              clearTimeout(timer);
              evidence.result = event.data.result;
              evidence.workerViolations = event.data.violations;
              resolve();
            }
          };
          worker.postMessage({ kind: config.kind.slice(7), url: config.url });
        });
      } finally {
        worker.terminate();
        evidence.workerTerminated = true;
      }
    } else {
      evidence.result = await attempt(config.kind, config.url);
    }
  } catch (error) { evidence.error = String(error); }
  // CSP violation events are queued separately from the rejected API promise.
  setTimeout(() => { button.dataset.complete = "true"; }, 50);
});
`;
export const fractionalWorkerScript = `
${nativeAttempt}
const violations = [];
addEventListener("securitypolicyviolation", event => {
  violations.push({ directive: event.effectiveDirective, blockedURI: event.blockedURI,
    disposition: event.disposition });
});
addEventListener("message", async event => {
  postMessage({ type: "started" });
  const result = await attempt(event.data.kind, event.data.url);
  setTimeout(() => postMessage({ type: "complete", result, violations }), 50);
});
`;
