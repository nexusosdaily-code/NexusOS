// Separate entry point: normal navigation never imports or attempts these faults.
const params = new URLSearchParams(location.search);
const kind = params.get("kind");
const target = params.get("target");
const url = new URL(target);
// Even a manual visit cannot turn this fixture into an Internet request tool.
if (!["api", "external", "websocket"].includes(kind) ||
    url.hostname !== "127.0.0.1" ||
    url.protocol !== (kind === "websocket" ? "ws:" : "http:") ||
    (kind === "api" && (url.origin !== location.origin || !url.pathname.startsWith("/api"))) ||
    (kind === "external" && url.origin === location.origin)) {
  throw new Error("Isolation faults require the runner's loopback-only targets");
}

const result = window.isolationResult = {
  kind, target, attempts: 1, settled: false, outcome: "pending",
};
if (kind === "websocket") {
  const socket = new WebSocket(target);
  let opened = false;
  socket.onopen = () => {
    opened = true;
    result.outcome = "connected";
    socket.close();
  };
  socket.onclose = () => {
    if (!opened) result.outcome = "blocked";
    result.settled = true;
  };
} else {
  try {
    await fetch(target);
    result.outcome = "resolved";
  } catch {
    result.outcome = "blocked";
  }
  result.settled = true;
}
