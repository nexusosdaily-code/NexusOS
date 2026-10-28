// Native fetch runs in the dedicated worker, not the owner page or an init script.
self.onmessage = async event => {
  const { kind, target } = event.data;
  const url = new URL(target);
  // Validate inside the worker too, before any request is attempted.
  if (!(self instanceof DedicatedWorkerGlobalScope) ||
      !["api", "external"].includes(kind) ||
      self.location.hostname !== "127.0.0.1" || url.hostname !== "127.0.0.1" ||
      url.protocol !== "http:" ||
      (kind === "api" && (url.origin !== self.location.origin || !url.pathname.startsWith("/api"))) ||
      (kind === "external" && url.origin === self.location.origin)) {
    throw new Error("Dedicated worker faults require the runner's loopback-only targets");
  }
  // One message, one native attempt. Do not accept another command while fetching.
  self.onmessage = null;
  const result = {
    kind, target, realm: "dedicated-worker", attempts: 1, settled: false, outcome: "pending",
  };
  try {
    await fetch(target);
    result.outcome = "resolved";
  } catch (error) {
    result.outcome = "blocked";
    result.errorName = error.name;
  }
  result.settled = true;
  self.postMessage(result);
};
