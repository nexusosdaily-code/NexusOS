# Local-only character reference browser checks

Start **only** the frontend with `npm run dev:client`. Do not start `npm run dev`:
the application server starts background services that this fixture does not need.
No account, database, backend, credentials, or external services are required.

Install the browsers matching the project's `playwright-core` version:

```sh
node node_modules/playwright-core/cli.js install chromium firefox webkit
npm run test:browser-unicode-copy
```

Chromium uses `/repl/tools/bin/chromium` when available, otherwise Playwright's
installed Chromium. Firefox and WebKit use Playwright's installed engines.
Missing engines fail the command; the default never silently skips coverage.
For focused troubleshooting, pass engine names:

```sh
npm run test:browser-unicode-copy -- firefox webkit
```

## Network guard fault checks

Every selected engine first runs separate fault contexts using the **same**
HTTP/WebSocket guards and zero-attempt verdict as the component checks.
To run only these checks, with no Vite server or application imports:

```sh
npm run test:browser-unicode-copy -- --isolation-only
# Or select one engine:
npm run test:browser-unicode-copy -- --isolation-only chromium
```

Two disposable HTTP servers bind only to `127.0.0.1` on random ports. A minimal
HTML entry point is fulfilled in-process; it mounts neither React nor the app.
Native fetch, XMLHttpRequest, sendBeacon and WebSocket attempts cover local
`/api` and `/api/…`, a second origin's HTTP and sockets (including API paths),
and that origin's root socket. Each transport/target uses a separate context.
XHR must reject; beacon must report queue acceptance, then the browser must
finish dispatching its request before records, sentinels and the ordinary
verdict are checked. Beacon's boolean alone is not evidence of blocking.
Each forbidden case must record exactly the expected pathname
and/or complete URL once, leave both HTTP/upgrade sentinels untouched, and fail
the ordinary zero-attempt verdict. HTTP classifies external origins first;
external API sockets are recorded in both lists. Query strings test that
distinction without credentials or real outbound targets.
A separate repeated-fault context attempts each forbidden target twice in a row,
then repeats the targets in reverse and forward order. Every native attempt must
reject/close, and after each attempt the full ordered history (including
duplicates) must match exactly, with zero HTTP/upgrade arrivals. The accumulated
API and external records must both fail the ordinary zero-attempt verdict.
Another separate context launches all forbidden targets twice in a single
concurrent batch, using native fetch and WebSocket calls before awaiting any
outcome. Every attempt must reject/close. Sorted copies of both recorded lists
must match the complete expected lists, retaining duplicates without requiring
a particular HTTP/WebSocket arrival order. Both sentinels must remain empty,
and both API and external history must reject the ordinary zero-attempt verdict.
Fault contexts grant Chromium's local-network permission so its own loopback
policy cannot hide a guard that records a request but forwards it to a sentinel.
This permission is not granted to the ordinary component contexts.

A separate native popup lifecycle case opens its loopback fixture through
`window.open`, waits for each forbidden fetch/socket attempt to reject/close,
then destroys the popup through its own `window.close`. Before any opener
attempt, the context must retain the popup's complete ordered duplicate evidence
and the ordinary verdict must still reject it. The surviving opener repeats the
targets in reverse order; after every attempt both evidence lists must match
exactly, both sentinels must remain untouched, and the ordinary verdict must keep
rejecting. The popup is not created or closed through Playwright page methods.

A separate initial-load popup case starts duplicate native fetch and WebSocket
attempts in its first inline script while `document.readyState` is `loading`.
No popup-page request listeners or routes are installed: the context guards
must already protect it. Every attempt must reject/close, and the exact API
and external evidence (including duplicates, regardless of concurrent arrival
order) must survive native self-closure with its arrival history unchanged.
Both sentinels stay empty, and each evidence list independently fails the
ordinary zero-attempt verdict. The opener itself makes no deliberate attempts.

The explicit local Vite HMR exception is also checked: a same-origin root socket
receives exactly the in-process `connected` message, records no forbidden attempt,
passes the verdict, and never reaches either server. The external-root fault
ensures that this exception cannot extend to another origin. Intentional faults
are never mixed into or excused from the ordinary component checks.

The fixture uses the development proxy when `REPLIT_DEV_DOMAIN` is present,
otherwise port 5000 on loopback. It mounts the real Unicode panel without the
application shell. HTTP requests and websocket attempts to APIs or other origins
are blocked **and asserted absent**; service workers are disabled. Only the test
context accepts development-proxy certificates unknown to bundled browser trust
stores.

## What passes mean

- All three engines run at 1280×900 and 390×844 with touch input for the narrow case.
- Chromium checks real clipboard write/read. Firefox and WebKit use a controlled
  clipboard boundary for success and denial; their DOM, focus, textarea selection,
  layout, clicks and taps are real browser-engine behavior.
- Chromium desktop also seeds a different native clipboard value and checks
  the browser's Copy keyboard shortcut while automatic writes remain denied.
  Whole-preview exports retain ordered, repeated scalars, bidi and combining text,
  and maximum-length/empty cases in every engine.
  The NUL-containing export fixture is seeded with a DOM input event because
  Firefox's native fill strips NUL; the exact accepted text is asserted first.
- Seven references cover supplementary characters, combining marks, aliases,
  controls, private-use, unassigned and noncharacter points. Both denied and
  unavailable clipboard access must expose the exact successful reference in a
  read-only textarea. Selecting it must focus the textarea and select every UTF-16
  code unit without trying the clipboard again.
- Changing inspection clears stale fallback text. Retrying both failure modes
  writes the complete reference and removes the fallback. Preview, encoded payload,
  and decoded text stay unchanged. Textarea and actions fit the viewport.
- Every engine also uses controllable pending clipboard promises (including
  Chromium for these timing cases). After inspecting another character, an old
  resolution or rejection cannot report success or expose stale manual text.
  With a newer copy in progress, both old outcomes are tested against both newer
  outcomes in both settlement orders. The newer pending/success/error status,
  exact manual reference, focus/full text selection, inspected character, preview,
  payload and decode must survive the old completion. These cases control only
  the clipboard boundary, not browser events or React scheduling.

These are Linux **engine** tests, not Safari.app certification or real iOS/Android
device tests. WebKit's narrow case uses Playwright mobile/touch emulation.
Playwright does not support `isMobile` for Firefox, so its narrow case is a
touch-enabled desktop engine. Native OS copy menus and device selection handles
are not exercised here.

## Host prerequisites

On supported Linux hosts, Playwright's `install --with-deps` can provision its
browser prerequisites. On Replit/Nix, use Nix system dependencies instead of apt.
Keep browser downloads in the ignored browser cache, not Git.

Downloaded WebKit builds may require ICU 74, JPEG 8, GTK, GStreamer, libevent and
GLib networking. Use compatible library closures rather than adding every
installed library directory to `LD_LIBRARY_PATH` (mixing libc versions can crash
the loader). TLS also requires GLib networking's `lib/gio/modules` via
`GIO_EXTRA_MODULES`. Check the downloaded MiniBrowser launcher: some versions
overwrite `LD_LIBRARY_PATH`; the local launcher must preserve the host library
path. These are browser-host setup issues, not reasons to skip an engine or change
the application. Do not disable host checks unless the required libraries have
been independently checked and the engines actually launch.
