// Same-origin external bootstrap: no inline JavaScript or event attributes.
window.addEventListener("unhandledrejection", function (event) {
  var message = event.reason && (event.reason.message || String(event.reason));
  if (message && (message.includes("WebSocket") || message.includes("vite-hmr") || message.includes("failed to connect"))) {
    event.preventDefault();
  }
});

(function () {
  var skip = document.getElementById("nexus-skip-link");
  if (skip) {
    skip.addEventListener("focus", function () { skip.style.left = "4px"; });
    skip.addEventListener("blur", function () { skip.style.left = "-9999px"; });
  }
  var boot = document.getElementById("nexus-boot");
  if (!boot) return;
  var observer = new MutationObserver(function () {
    var root = document.getElementById("root");
    if (root && root.childElementCount > 0) {
      boot.style.opacity = "0";
      boot.style.transition = "opacity 0.15s";
      setTimeout(function () { boot.remove(); }, 160);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
