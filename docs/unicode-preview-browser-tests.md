# Unicode preview native-input checks

## Copy character details

For a backend-free clipboard check, run a frontend-only development workflow
with `npm run dev:client -- --host 0.0.0.0` on port 5000, then run
`node_modules/.bin/node scripts/test-browser-unicode-copy.mjs`.
Do not run the normal backend or supply credentials for this check.

The script mounts the real Unicode panel through an intercepted local HTML
fixture. It blocks API requests and cross-origin resources and asserts that
the panel makes no API calls. It checks actual clipboard writes and readback
in desktop Chromium and a 390-pixel mobile-touch Chromium context:

- Pinned version, official names, control labels and typed aliases, with
  explicit no-name statements for unnamed points.
- Controls, private-use, unassigned points and noncharacters retain their
  distinct properties rather than receiving invented character names.
- Exact ordered frames match the inspector, including repeated frames for
  the supplementary U+13000 golden vector.
- Rejected and unavailable clipboard APIs show a visible error; restoring
  access allows retry.
- Preview text, payload and decoded output remain unchanged.
- The copy action fits both viewports and works with click or touch.

Mobile touch is browser emulation, not a physical Android/iOS clipboard check;
Firefox, Safari/WebKit and OS permission prompts are not covered by this script.
Component tests additionally check pending copies across inspection changes and
disabled copying while official name data is loading or unavailable.

## Native preview input

Run `npm run test:browser-unicode` with the existing development workflow
running (`npm run dev`). The script uses the installed Chromium at
`/repl/tools/bin/chromium` and Playwright Core. It visits the actual
`/ce-code-writer` route, signed out. It uses the Replit development domain when
available, otherwise the local port 5000.

All `/api/` requests are intercepted; no test request reaches accounts,
databases or financial services. The legacy Live Encode panel's single
automatic mount request is explicitly checked and blocked before measurement.
Unicode interactions must cause no further state-changing requests.

## Coverage

- Actual clipboard writes and keyboard Ctrl+V, with trusted paste,
  beforeinput and accepted-input events. Fixture setup alone uses `fill`.
- Supplementary characters at 510, 511 and 512 UTF-16 units, including
  all-supplementary input, truncation after a BMP prefix, and selection
  replacement at the full limit.
- Mixed decomposed accents, Hebrew, Arabic, bidi isolation controls, a
  leading U+FEFF, Egyptian hieroglyphs and musical symbols.
- Chromium composition-engine pre-edit and commit through the DevTools IME
  protocol at 510 and 511 units. These are not synthetic DOM composition
  events, but neither are they tests of a real operating-system input method.
- Every accepted committed string must be well-formed UTF-16, fit within
  512 units, produce exactly the independently calculated UTF-8 coordinate
  frames, and recover exactly using the visible payload load/decode controls.
  Comparisons use logical string order, not visual glyph appearance.

## Native behavior observed

Chromium accepts a supplementary scalar if two units remain, and rejects it
whole when only one unit remains. It does not fill that unused unit by
skipping the rejected scalar and accepting a later character.

Composition pre-edit can temporarily exceed `maxLength` (513 units in the
511-unit case). On commit Chromium removes the non-fitting supplementary
scalar whole. The test checks this intermediate state for well-formedness
without blurring or interrupting composition, then checks exact payload
recovery after commit. This is a native-input caveat, not a catalogue
assignment or encoder error; no application behavior was changed.

The limit counts UTF-16 units, not grapheme clusters. A combining sequence
can therefore lose its final accent at the boundary. The accepted base
character is preserved exactly, without normalization or replacement.

The initial run on 2026-10-23 passed all 11 cases. The companion component
suites passed 46 tests and the incremental TypeScript check passed. The
command prints the actual Chromium version for each run. Firefox, WebKit,
mobile keyboards and OS-level IMEs were not tested.

## Scope and security

No catalogue assignments, authority rules, encoding mappings, authentication,
or production data were modified. This is a standalone browser command, not
part of the DOM-only Vitest suite; it requires a running dev app and Chromium.

The repository-wide scans were also run. Static analysis reported one medium
finding in existing founder cookie handling, and privacy analysis reported
one low finding about an existing physics energy-budget print. The dependency
scanner reported 10 critical and 64 high findings against existing Python
package inventories. These are outside this browser-test-only change and are
not a security clearance; see the pre-existing inventory discrepancy discussion
in `docs/practical-security-assessment.md`.
