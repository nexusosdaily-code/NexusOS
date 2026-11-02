# Isolated fixed-point browser checks

Run `npm run test:browser-fixed-point` to require Chromium, Firefox and WebKit.
Optional engine arguments select a focused run, for example
`npm run test:browser-fixed-point -- firefox`. An unavailable requested engine
is a failure, never a skip. CI installs the matching Playwright builds and their
host libraries and runs the full matrix.

This fixture builds only the shared fixed-point package and its test dispatch.
It does not start the application server, mount the application shell, read
environment files, connect to databases or load participant data.

Each engine runs the same decimal corpus as the server suite, compared with the
independent Python `Fraction` oracle and Node execution. Checks include exact
decimal/unit results, typed overflow/division-by-zero failures, maximum-length
vectors, cancellation after large products, complete visited WLS traces, exact
kernel CALL sequences and legacy-profile rejection with and without the header.
A 17-element vector must also be rejected.

Permitted built assets are fulfilled in memory. Routing rejects other requests
and sockets; CSP blocks connections and workers; policy violations are counted
even when they never reach routing. The loopback server is a sentinel that must
receive no requests. An inline icon avoids Firefox's automatic favicon request.

The Node evidence-contract tests deliberately corrupt results, errors, traces,
profile refusals and vector-limit evidence to confirm they cannot pass.

Every requested engine also runs four disposable browser-only kernels: dot
products changed to addition, altered positive-tie rounding, altered negative-tie
rounding, and premature clamping of intermediate dot totals. A build-only Vite
transform replaces exactly the kernel module in each in-memory bundle; it never
edits the shared production kernel, Node evidence or Python expectations.
The early-range kernel is re-encoded with valid jump targets, after checking
that its unaltered fixture matches the canonical encoded kernel byte for byte.
Each control executes the full unchanged corpus in a fresh browser context with
the same no-network assertions. It must return a successful but numerically
incorrect witness (including the negative half-tie and cancellation of large
intermediate products), and the normal evidence checker must reject both that
witness and the full corpus. Crashes, invalid encodings, unavailable browsers,
missing cases and unchanged kernels do not count as detected mutations. An
engine prints PASS only after its baseline and all four controls succeed.

On the Replit Nix host, Firefox/WebKit may need the engine-specific library
paths described in [the native-host notes](../../../scripts/test-browser-locked-packages.md#nix-host-reproduction-notes).
Use separate invocations with those paths, not a combined global library path.
Headless WebKit may also need `LIBGL_ALWAYS_SOFTWARE=1`,
`EGL_PLATFORM=surfaceless` and the compatible Mesa vendor selection described
in [the fractional-learning host notes](../../../scripts/test-browser-fractional-learning.md#reproducing-this-nix-host).
These settings affect test startup only, never the kernel or its expectations.

Playwright WebKit on Linux is engine compatibility evidence, not a test of
Safari.app or physical iOS devices.
