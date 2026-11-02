import React from "react";
import { createRoot } from "react-dom/client";
import CollectionWorkspace from "../../../client/src/components/collection-workspace";

// This is deliberately not App: no accounts, providers, analytics mount,
// application server or persistence. The component still uses its real VM.
createRoot(document.getElementById("root")!).render(
  <CollectionWorkspace profile="WLS-MAP/1" />,
);

// A fixture-only transport, not a replacement algorithm or production UI hook.
// Exercise native structured cloning and a bundled same-origin module worker.
const workerLifecycle = { created: 0, terminated: 0, deadlines: 0, cloneFailure: null as unknown, child: null as unknown };
function runWorker(message: unknown) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./execute.worker.ts", import.meta.url), { type: "module" });
    workerLifecycle.created++;
    workerLifecycle.deadlines++;
    let terminated = false;
    const terminate = () => {
      if (terminated) return;
      terminated = true;
      clearTimeout(timeout);
      workerLifecycle.deadlines--;
      worker.terminate();
      workerLifecycle.terminated++;
    };
    const timeout = setTimeout(() => {
      terminate();
      reject(new Error("Native collection worker timed out; no main-thread fallback"));
    }, 10_000);
    worker.onmessage = event => {
      if (event.data.lifecycleStarted === true) {
        workerLifecycle.child = event.data.childLifecycle;
        return; // Startup is progress, never a completed transport result.
      }
      clearTimeout(timeout);
      terminate();
      if (event.data.controlError) {
        workerLifecycle.child = event.data.childLifecycle;
        reject(new Error(event.data.controlError));
        return;
      }
      resolve(event.data);
    };
    worker.onerror = event => {
      event.preventDefault();
      clearTimeout(timeout);
      terminate();
      reject(new Error(`Native collection worker failed: ${event.message || "load error"}`));
    };
    try {
      worker.postMessage(message);
    } catch (error) {
      terminate();
      workerLifecycle.cloneFailure = {
        name: error instanceof Error ? error.name : String(error),
        cleanedSynchronously: terminated && workerLifecycle.deadlines === 0,
      };
      reject(new Error(`Native collection worker could not copy input: ${String(error)}`));
    }
  });
}

Object.assign(window, {
  renamingWorkerLifecycle: workerLifecycle,
  runRenamingWorker: (source: string, inputs: unknown) => runWorker({ source, inputs }),
  runCompleteConsumerWorker: (complete: unknown) => runWorker({ complete }),
  runRenamingNetworkControl: (kind: string, url: string, nested = false) =>
    runWorker({ networkFault: { kind, url, nested } }),
  runRenamingNestedLifecycleFault: (fault: string) =>
    fault === "page-clone-failure"
      ? runWorker({ uncloneable: () => undefined })
      : runWorker({ networkFault: { nested: true, lifecycleFault: fault } }),
  runRenamingNestedRedirectControl: () =>
    runWorker({ networkFault: { nested: true, redirectProbe: true } }),
  runRenamingImportControl: (url: string, nested = false) => runWorker({ importFault: { url, nested } }),
});

// Ordinary page task, not debugger-origin evaluation (which can bypass CSP).
setTimeout(() => {
  let blocked = false;
  try { new Function("return 1")(); } catch (error) {
    blocked = error instanceof EvalError;
  }
  Object.assign(window, { renamingPageEvalBlocked: blocked });
}, 0);
