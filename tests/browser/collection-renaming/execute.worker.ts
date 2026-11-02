import { executeMap, MAP_LIMITS } from "../../../shared/wls-map-vm";
import { networkControl } from "./network-control";
import { importControl } from "./import-control";
import nestedWorkerUrl from "./nested-network.worker.ts?worker&url";
import { completeConsumer } from "./complete-consumer";

function freeze(value: unknown): void {
  if (!value || typeof value !== "object") return;
  Object.values(value).forEach(freeze);
  Object.freeze(value);
}

function frozen(value: unknown): boolean {
  return !value || typeof value !== "object" ||
    (Object.isFrozen(value) && Object.values(value).every(frozen));
}

self.onmessage = async ({ data: { source, inputs, networkFault, importFault, complete } }) => {
  if (complete) {
    try { self.postMessage(await completeConsumer(complete)); }
    catch (error) { self.postMessage({ controlError: String(error) }); }
    return;
  }
  if (importFault && !importFault.nested) {
    self.postMessage(await importControl(importFault.url));
    return;
  }
  if (networkFault || importFault) {
    const fault = networkFault ?? importFault;
    if (fault.nested) {
      const childLifecycle = {
        started: false, terminated: false, created: 0, deadlines: 0,
        cloneFailure: null as unknown,
      };
      let parentEvalBlocked = false;
      try { new Function("return 1")(); } catch (error) {
        parentEvalBlocked = error instanceof EvalError;
      }
      let nativeLoadFailure = false;
      const childScriptAttempts: string[] = [];
      try {
        const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
          if (networkFault?.redirectProbe) {
            childScriptAttempts.push(new URL(nestedWorkerUrl, self.location.href).href);
          }
          const worker = new Worker(new URL(nestedWorkerUrl, self.location.href), { type: "module" });
          childLifecycle.created++;
          childLifecycle.deadlines++;
          const terminate = () => {
            if (childLifecycle.terminated) return;
            clearTimeout(timeout);
            childLifecycle.deadlines--;
            worker.terminate();
            childLifecycle.terminated = true;
          };
          const timeout = setTimeout(() => {
            terminate();
            reject(new Error("Nested network worker timed out"));
          }, 8_000);
          const send = (message: unknown) => {
            try {
              worker.postMessage(message);
            } catch (error) {
              terminate();
              childLifecycle.cloneFailure = {
                name: error instanceof Error ? error.name : String(error),
                cleanedSynchronously: childLifecycle.terminated && childLifecycle.deadlines === 0,
              };
              reject(new Error(`Nested network worker could not copy input: ${String(error)}`));
            }
          };
          worker.onmessage = event => {
            if (["no-reply", "child-clone-failure"].includes(fault.lifecycleFault) &&
                event.data.lifecycleStarted === true) {
              childLifecycle.started = true;
              self.postMessage({ lifecycleStarted: true, childLifecycle: { ...childLifecycle } });
              if (fault.lifecycleFault === "child-clone-failure") {
                // Created in this realm: the page-to-parent message stays cloneable.
                send({ uncloneable: () => undefined });
              }
              return;
            }
            clearTimeout(timeout);
            terminate();
            resolve(event.data);
          };
          worker.onerror = event => {
            event.preventDefault();
            nativeLoadFailure = true;
            clearTimeout(timeout);
            terminate();
            reject(new Error(`Nested network worker failed: ${event.message || "load error"}`));
          };
          send(importFault ? { ...importFault, kind: "module-import" } : networkFault);
        });
        self.postMessage({ ...result, parentEvalBlocked, parentUrl: self.location.href,
          ...(networkFault?.redirectProbe ? { childScriptAttempts, childLifecycle } : {}) });
      } catch (error) {
        if (networkFault?.redirectProbe && nativeLoadFailure) {
          self.postMessage({
            kind: "child-script-redirect", outcome: "rejected", childScriptAttempts,
            childLifecycle, parentEvalBlocked, parentUrl: self.location.href,
          });
        } else {
          self.postMessage({ controlError: String(error), childLifecycle });
        }
      }
      return;
    }
    self.postMessage(await networkControl(networkFault.kind, networkFault.url));
    return;
  }
  // Structured cloning does not preserve frozen descriptors. Freeze the actual
  // worker-side input before invoking the real VM, not just the sender's copy.
  freeze(inputs);
  const before = JSON.stringify(inputs);
  let evalBlocked = false;
  try { new Function("return 1")(); } catch (error) {
    evalBlocked = error instanceof EvalError;
  }
  let outcome;
  try {
    const result = executeMap(source, inputs);
    const container = inputs.map ?? inputs.set;
    outcome = {
      value: result.value,
      cycles: result.trace.length,
      lastOp: result.trace.at(-1)?.op,
      resultFrozen: frozen(result.value),
      freshResult: result.value !== container && result.value.entries !== container.entries,
    };
  } catch (error) {
    outcome = { error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage({
    ...outcome, source, before, after: JSON.stringify(inputs),
    inputsFrozen: frozen(inputs), evalBlocked, cycleLimit: MAP_LIMITS.cycles,
    networkAttempts: [], importAttempts: [],
  });
};
