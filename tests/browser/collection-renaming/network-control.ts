// Fixture-only native faults. No replacement fetch/WebSocket, debugger-origin
// calls, blob workers, app endpoints or Internet destinations.
export async function networkControl(kind: "fetch" | "websocket", url: string) {
  const target = new URL(url);
  if (target.hostname !== "127.0.0.1" || !target.port ||
      target.pathname !== `/worker-${kind}` || target.search || target.hash ||
      target.username || target.password ||
      target.protocol !== (kind === "fetch" ? "http:" : "ws:")) {
    throw new Error("Network control requires its separate loopback sentinel");
  }
  const violations: { directive: string; disposition: string }[] = [];
  self.addEventListener("securitypolicyviolation", event => {
    if (event.effectiveDirective === "connect-src") {
      violations.push({ directive: event.effectiveDirective, disposition: event.disposition });
    }
  });
  let evalBlocked = false;
  try { new Function("return 1")(); } catch (error) {
    evalBlocked = error instanceof EvalError;
  }
  const networkAttempts = [url];
  let outcome: string;
  let nativeError: string | undefined;
  let opened = false;
  let closeCode: number | undefined;
  if (kind === "fetch") {
    try {
      const response = await fetch(url);
      outcome = response.ok && await response.text() === "sentinel" ? "allowed" : "unexpected-response";
    } catch (error) {
      nativeError = String(error);
      outcome = error instanceof TypeError ? "rejected" : "unexpected-error";
    }
  } else {
    outcome = await new Promise<string>(resolve => {
      try {
        const socket = new WebSocket(url);
        socket.onopen = () => { opened = true; };
        socket.onmessage = event => {
          resolve(event.data === "sentinel" ? "allowed" : "unexpected-response");
          socket.close();
        };
        socket.onerror = () => resolve("rejected");
        socket.onclose = event => { closeCode = event.code; resolve("rejected"); };
      } catch (error) {
        nativeError = String(error);
        // Gecko uses an XPCOM content-blocked exception in workers rather
        // than the DOMException used by the other native engines.
        const blocked = (error instanceof DOMException && error.name === "SecurityError") ||
          (error as { name?: string })?.name === "NS_ERROR_CONTENT_BLOCKED";
        resolve(blocked ? "rejected" : "unexpected-error");
      }
    });
  }
  // CSP violation delivery is an ordinary worker task, not synchronous with
  // fetch rejection. Give that native event task time to report.
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    kind, outcome, violations, networkAttempts, evalBlocked, nativeError, opened, closeCode,
    executionUrl: self.location.href,
  };
}
