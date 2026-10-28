// Separate entry point: ordinary navigation never imports redirect faults.
const params = new URLSearchParams(location.search);
const kind = params.get("kind");
const target = params.get("target");
const url = new URL(target);
if (!["api", "external"].includes(kind) ||
    location.hostname !== "127.0.0.1" ||
    url.hostname !== "127.0.0.1" ||
    url.protocol !== "http:" ||
    url.origin !== location.origin ||
    url.pathname !== `/isolation-redirect/${kind}` ||
    url.search || url.hash || url.username || url.password) {
  throw new Error("Redirect faults require the runner's same-origin loopback entry");
}

const button = document.querySelector("button");
button.disabled = false;
button.addEventListener("click", () => {
  button.disabled = true;
  // The first destination is allowed. Only the server's real HTTP 302 names
  // the forbidden destination; no client-side redirect or forbidden fetch.
  window.open(url.href, "_blank");
}, { once: true });
