import { networkControl } from "./network-control";
import { importControl } from "./import-control";

// A real same-origin dedicated worker created by another worker, never a
// main-thread substitute. Native errors/load failures must fail the transport.
self.onmessage = async ({ data: { kind, url, lifecycleFault, redirectProbe } }) => {
  if (redirectProbe) {
    let evalBlocked = false;
    try { new Function("return 1")(); } catch (error) {
      evalBlocked = error instanceof EvalError;
    }
    self.postMessage({
      kind: "child-script-redirect", outcome: "allowed",
      marker: "native-child-redirect", executionUrl: self.location.href, evalBlocked,
    });
    return;
  }
  if (lifecycleFault === "no-reply" || lifecycleFault === "child-clone-failure") {
    // Native startup acknowledgement is not a network result. Deliberately
    // never answer the request; the parent's shorter deadline must reject.
    self.postMessage({ lifecycleStarted: true });
    return;
  }
  try {
    self.postMessage(kind === "module-import" ? await importControl(url) : await networkControl(kind, url));
  } catch (error) {
    self.postMessage({ controlError: String(error) });
  }
};
