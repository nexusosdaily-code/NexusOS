// Shared by the real package runner and disposable native controls.
export const LOCKED_PACKAGE_CSP =
  "default-src 'none'; script-src 'self'; connect-src 'none'; worker-src 'none'; base-uri 'none'";

// Change only worker-src. All other restrictions remain the real policy.
export const WORKER_ALLOWED_CSP = LOCKED_PACKAGE_CSP.replace("worker-src 'none'", "worker-src 'self'");
