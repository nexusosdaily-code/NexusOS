/** Production executes only same-origin script files, never inline handlers/code. */
export function browserContentSecurityPolicy(production: boolean): string {
  return [
    "default-src 'self'",
    production ? "script-src 'self'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    production ? "connect-src 'self' wss: https:" : "connect-src 'self' ws: wss: https:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
