// Only this synthetic opener imports this code, never the navigation fixture.
const params = new URLSearchParams(location.search);
const kind = params.get("kind");
const target = params.get("target");
const url = new URL(target);
if (!["api", "external", "websocket"].includes(kind) ||
    location.hostname !== "127.0.0.1" ||
    url.hostname !== "127.0.0.1" ||
    url.protocol !== (kind === "websocket" ? "ws:" : "http:") ||
    (kind === "api" && (url.origin !== location.origin || !url.pathname.startsWith("/api"))) ||
    (kind === "external" && url.origin === location.origin)) {
  throw new Error("Popup faults require the runner's loopback-only targets");
}

const button = document.querySelector("button");
button.disabled = false;
button.addEventListener("click", () => {
  button.disabled = true;
  // HTTP faults must be the popup's very first navigation, not a fetch made
  // after a page-event handler has had time to install per-page interception.
  // The socket fault instead loads the standalone native-WebSocket probe.
  window.open(kind === "websocket" ?
    `/isolation.html?${new URLSearchParams({ kind, target })}` : target, "_blank");
}, { once: true });
