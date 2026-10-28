# Local Hub navigation checks

Run `npm run test:browser-hub-navigation`. No application workflow, login,
database, API, private file or credentials are needed. The runner builds the real
`AppNav` and `QuickActions` with the application's CSS into memory and serves only
those compiled assets. The fixture-only auth alias returns no user; it does not
change application authentication. Queries are disabled and navigation uses
Wouter's memory router, never the real Wave Vault page.

The default runs Chromium, Firefox and Linux WebKit. Install engines matching
the project's `playwright-core` version:

```sh
node node_modules/playwright-core/cli.js install chromium firefox webkit
npm run test:browser-hub-navigation
# Explicit engine selection for focused runs:
npm run test:browser-hub-navigation -- firefox webkit
```

Chromium uses `/repl/tools/bin/chromium` when available, otherwise the installed
Playwright Chromium. Firefox and WebKit use their installed Playwright engines.
Missing requested browsers or host libraries fail rather than silently skipping
checks; unknown engine names also fail. For Nix browser-host prerequisites, see
the **Host prerequisites** section of `scripts/test-browser-unicode-copy.md`.

### Browser-free command-line regression tests

```sh
node_modules/.bin/node node_modules/vitest/vitest.mjs run --project server scripts/test-browser-hub-navigation.test.ts
```

These tests also run in the normal `npm test` / `npm run test:all` server suite.
They invoke the real runner with an empty temporary `PLAYWRIGHT_BROWSERS_PATH`
and no inherited credentials or database configuration. No browser downloads
are performed. Missing Firefox/WebKit must exit nonzero with engine-specific
installation guidance, close their real fixture listener and leave no runner
or descendant process behind. Unknown engines and mixed `--serve`/engine
arguments must fail before any listener starts. Each subprocess has a bounded
timeout and emergency process-group cleanup so a leaked server fails the test
rather than hanging the suite.

At 320, 360 and 390 pixels wide, every touch-enabled engine checks:

- Quick-action tap and dropdown-link tap navigate to `/wave-vault`.
- Repeated trigger taps and outside taps close the dropdown.
- Enter and Space toggle the disclosure; Tab reaches links; Escape closes and
  restores trigger focus; Tab leaving the navigation closes it.
- Enter activates both entry points, with the memory path reset between checks.
- Forward and reverse tabbing reach the trigger with a visible outline.
- Trigger, quick action and Wave Vault link are at least 44 pixels tall, fit the
  viewport and show their full labels; the page has no horizontal overflow.
- API, cross-origin and WebSocket requests are blocked and asserted absent,
  and browser runtime errors fail the test.

Before navigation, each engine also runs three **separate synthetic fault
contexts**: one native API fetch, one cross-origin HTTP fetch and one native
WebSocket attempt. Their standalone entry point imports no application code.
They use the exact same guards and zero-attempt assertion as normal navigation.
Each case must attempt exactly once, reject/close without success, record the
exact target once, and cause the normal assertion to throw. Expected violations
are caught only inside these fault cases; ordinary navigation still requires
zero attempts.

Three additional, separate popup contexts open a new page from a synthetic
button click. API and cross-origin faults are the popup's **initial navigation**,
before page-event handlers could install a route; each must fail as a native
navigation without an HTTP response. The WebSocket case opens the standalone
socket probe in the popup and requires closure without opening. All use the same
context-wide guards, record exactly one target, leave both sentinels untouched,
and fail the ordinary zero-attempt assertion. The runner verifies that the failed
navigation belongs to the popup, not the opener. No popup faults are imported by
the normal navigation fixture.

Two more popup contexts navigate first to an **allowed same-origin HTTP redirect**.
The fixture server registers only exact runner-owned loopback destinations and
returns a real 302 to either an API path or the second-origin sentinel. Each
allowed endpoint must be reached exactly once, but neither forbidden destination
may receive a request or produce a browser response. The context-wide guard
must record the exact destination once, abort the popup navigation, and make
`assertNoForbiddenRequests` reject it.

Playwright's route handler is only invoked for the first URL of a native HTTP
redirect chain. The shared guard therefore fetches allowed responses with
`maxRedirects: 0`, inspects each Location, and checks each destination before
following it. It never hands an unchecked redirect to the browser or allows
the fetch client to follow automatically. Consequently, the native failed
request is the allowed entry navigation: the forbidden Location is intercepted
before a browser request to that URL can be dispatched. This is not evidence
that Playwright itself routes subsequent native redirect requests.

Two more separate contexts load a standalone dedicated-Web-Worker fixture, one
for API fetch and one for second-origin HTTP fetch. A real module worker makes
exactly one native fetch and reports its rejection to the owner page. The runner
checks that exactly one fixture-local worker started, the result came from the
dedicated-worker realm, the native fetch rejected with `TypeError`, the
context-wide guard recorded exactly the target once, neither sentinel received
traffic, and the ordinary zero-attempt assertion throws. Worker startup errors
cannot count as a blocked fetch. The owner page and worker import no application
shell or authentication code; ordinary navigation imports neither fixture.

All fault targets are loopback-only. The external origin is a second ephemeral
local port, not an Internet host. HTTP/upgrade sentinels fail the test if a guard
records but forwards a request; no application API or real WebSocket service
exists. Service workers remain blocked in both fault and navigation contexts.

Engine-prefixed touch and keyboard screenshots are saved under ignored
`generated-artifacts/hub-navigation/`, so one engine cannot overwrite another.
For visual inspection only, `npm run test:browser-hub-navigation -- --serve`
keeps the same isolated fixture on port 5174.

## Enlarged text and zoom-equivalent reflow

In every engine, the same interactions also run at **200% root font size** at 320, 360 and 390
CSS pixels wide. The fixture's `?text=200` setting survives reloads and doubles
the real rem-based typography and spacing without overriding the components'
layout or focus styles. Assertions verify the computed label fonts themselves:
Wave Vault's quick action grows from 14px to 28px; the disclosure and link grow
from 12px to 24px. This is a conservative rem-resize simulation, not Chromium's
native text-only zoom or a claim about fixed-pixel text elsewhere in the app.

Desktop keyboard reflow runs separately at a 320px viewport (1280px / 400% zoom)
and at 640px with doubled text (1280px / 200% zoom plus enlarged text).
These reduced CSS viewports are zoom-equivalent layout checks, not browser
chrome zoom automation; changing device pixel ratio would not test reflow.

Every scenario checks closed and open disclosure states for horizontal overflow,
including mobile viewport auto-expansion that could otherwise hide overflow.
Text-node rectangles must fit inside their controls and clipping ancestors in
both dimensions. Keyboard-focused controls must retain their full labels and
their visible outline inside the viewport and clipping ancestors. Screenshots
record touch-open navigation and each of the three keyboard-focused controls.

This runner remains independent of `check:release-wave-vault`: it does not inspect
or depend on a published build and does not visit the authenticated Vault.
The real Hub styles let quick actions and disclosure labels wrap, reflow the
link grid based on available room, and reserve scroll margin for focus outlines.

The component test `client/src/pages/hub-wave-vault-access.test.tsx` separately
checks disclosure state, semantics and focus behavior in the normal client suite.
Only the browser runner establishes rendered CSS, touch and viewport behavior.

These are Linux **engine** tests, not physical device tests or Safari.app
certification. Chromium and WebKit use mobile/touch emulation for the narrow
scenarios, and desktop contexts for zoom-equivalent reflow. Firefox does not
support Playwright's `isMobile`, so it uses touch-enabled desktop contexts at
the same widths, with real taps and keyboard/focus behavior.
They do **not** establish iPhone Safari, native share-sheet, file sharing,
authenticated uploads/downloads or private-file compatibility. The app shell
is never mounted and application authentication is never bypassed.
