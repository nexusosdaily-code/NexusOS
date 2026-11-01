// Disposable enclosing verdict: expiry must throw out of the real lifecycle
// checker, not be recognized as the expected native child-timeout rejection.
import { checkNestedLifecycleControls } from "../../../scripts/collection-renaming-isolation.mjs";

await checkNestedLifecycleControls("chromium", {
  watchdogTest: { hang: process.argv[2], deadlineMs: 1_500 },
});
throw new Error("Watchdog unexpectedly accepted the hung lifecycle check");
