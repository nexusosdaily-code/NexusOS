# Browser session hardening — 28 October 2026

This is a security-only change. Founder access remains BTC-secret-only.
No real credentials, live account login or financial transactions were used
in the security tests.

## Changes

- Browser sign-in responses no longer return the session token in JSON.
- Browser API calls use the existing HttpOnly session cookie instead of
  retrieving credentials from localStorage. Authentication startup removes
  legacy localStorage and sessionStorage token entries.
- Pages use authenticated user state rather than treating a stored token as
  evidence that the user is signed in.
- Signaling and streaming WebSockets use handshake cookies, not token-bearing
  URLs. Their browser origins must match the request host, including the port;
  production requires an HTTPS origin. Duplicate or malformed session cookies
  and query-string-only credentials are rejected.
- Cookie-authenticated mutations and authentication endpoints reject explicit
  cross-origin/cross-site browser requests. Requests without browser-origin
  metadata are not assumed malicious; this is not client identity verification.
- Authentication responses have `Cache-Control: no-store`.
- Logout revokes the stored session before clearing the cookie. The frontend
  clears cached queries after successful logout and prevents earlier identity
  responses from restoring the signed-out user. Server logout failures are
  reported, not represented as successful revocation.

Existing HTTP bearer/API-key middleware is preserved for non-browser clients.
The retired founder password/Nostr/API-key access paths remain retired.
The session lifetime was not changed.

## Verification

- TypeScript passed.
- Full production build passed: 4,386 tests passed, two opt-in browser cases
  skipped; client/server compilation, bundle limits, preloads and startup
  artifact checks passed.
- Both opt-in browser cases subsequently passed against the newly built UI:
  desktop and phone-sized Chromium with local HTTPS, synthetic founder
  credentials and in-memory session storage. Tests cover stale storage cleanup,
  cookie attributes, login rejection/acceptance, reload persistence, actual
  language/Unicode pipelines, CSP, inactive accounts, expiry, revocation,
  logout and rejection of the copied pre-logout cookie.
- Request-policy tests exercise origin rejection, malformed/duplicate cookies,
  login CSRF and URL-token rejection. A source regression check rejects browser
  token storage/readback and token-bearing socket URLs.
- The development workflow restarted successfully and the public sign-in
  screen rendered. Its unsigned identity request correctly returned 401.

These tests are not an authenticated journey against the published website,
an independent penetration test, Safari evidence or a physical-phone test.
The mobile test changes Chromium's viewport, not its engine.

## Remaining boundaries

HttpOnly reduces credential theft by injected JavaScript; it does not prevent
such code from issuing actions through the victim's open browser. CSP, access
checks, input handling and browser updates remain necessary.

The language VM still shares the page's JavaScript context rather than a
separate-origin sandbox.

### Live connection lifecycle

Signaling and streaming now track the exact session of each open socket:

- Successful local session deletion/logout invalidates its sockets immediately;
  user-wide revocation invalidates that user's sessions without affecting
  other accounts.
- An expiry timer closes idle sockets at their recorded session deadline.
- Incoming messages and outgoing notifications require a fresh, batched store
  check. Relayed messages validate both the source and recipient. Pending checks
  cannot restore a session invalidated by a local revocation notification.
- Store failures/timeouts fail closed. Lookups have a two-second deadline;
  shared batches contain at most 200 session IDs, not browser tokens.
- One shared five-second sweep catches direct database changes and revocations
  from another server process, including inactive users. Idle external
  revocation detection is therefore bounded, not instantaneous. Traffic does
  not wait for the next sweep to revalidate.
- Cleanup starts on server-side invalidation without waiting for a peer's
  close handshake. Multiple sessions/tabs remain independently registered.
  Viewer registration is shared per user/stream; final cleanup waits for a
  pending join to finish, and active viewer rows—not historical visits—are
  marked left. Ending the last broadcaster connection notifies and closes
  remaining viewers after the final message.
- Both endpoints share a path-aware HTTP upgrade dispatcher, avoiding
  competing WebSocket servers rejecting one another's connections. Unrelated
  upgrade paths are left to their existing handlers.

This revokes server signaling access, not media or data already delivered to
a peer. Server-side session revocation cannot erase downloaded content or
guarantee termination of an independently established peer-to-peer media path.
The previous connection-time-only limitation is resolved for these two
authenticated server WebSocket endpoints.

Lifecycle validation: TypeScript and the full build passed with 4,417 tests
passing and the two opt-in browser-session tests skipped. New isolated tests
exercise the actual route blocks over real local WebSocket connections and
HTTP logout, with synthetic sessions and a forbidden real database import.
They cover expiry, account deactivation, store failures, incoming/outgoing
revocation checks, same-user independent sessions, viewer/broadcaster cleanup,
pending viewer registration and final-message delivery. Registry tests also
cover deadlines, stalled lookups, stale results, query batching and ordinary
tab closes without sibling-session revocation. The application restarted and
the unsigned sign-in screen rendered normally. Signed-in production sessions
were not used for these checks.

Legacy clients expecting login JSON tokens or query-string socket credentials
must migrate to cookie-based browser sessions or their appropriate non-browser
authentication mechanism. Do not restore JavaScript-readable browser session
tokens for compatibility.
