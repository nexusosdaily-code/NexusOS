// Fixture-only native import: no API substitutions or application endpoints.
export async function importControl(url: string) {
  const target = new URL(url);
  if (target.protocol !== "http:" || target.hostname !== "127.0.0.1" ||
      !target.port || target.pathname !== "/worker-import.js" ||
      target.search || target.hash || target.username || target.password) {
    throw new Error("Import control requires its separate loopback module sentinel");
  }
  const violations: { directive: string; disposition: string; blockedURI: string }[] = [];
  self.addEventListener("securitypolicyviolation", event => {
    if (event.effectiveDirective === "script-src" || event.effectiveDirective === "script-src-elem") {
      violations.push({
        directive: event.effectiveDirective, disposition: event.disposition,
        blockedURI: event.blockedURI,
      });
    }
  });
  let evalBlocked = false;
  try { new Function("return 1")(); } catch (error) {
    evalBlocked = error instanceof EvalError;
  }
  // Ignore the eval violation; it is not evidence of a rejected module import.
  const importAttempts = [url];
  let outcome: string;
  let marker: unknown;
  let nativeError: string | undefined;
  try {
    const module = await import(/* @vite-ignore */ url);
    marker = module.sentinel;
    outcome = marker === "native-worker-import" ? "allowed" : "unexpected-module";
  } catch (error) {
    nativeError = String(error);
    outcome = error instanceof TypeError ? "rejected" : "unexpected-error";
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    kind: "module-import", outcome, marker, nativeError, evalBlocked,
    executionUrl: self.location.href,
    importAttempts, networkAttempts: [],
    violations: violations.filter(event => event.blockedURI !== "eval"),
  };
}
