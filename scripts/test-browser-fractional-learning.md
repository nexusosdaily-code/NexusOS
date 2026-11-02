# Native fractional arithmetic and learning conformance

The local runner executes the actual unmodified fixed-point package, fractional
learner, compiler and WLS-PY/1 VM in real Chromium, Firefox and WebKit processes.
It does not replace their implementations with a host result or browser API mock.

## Observed engine matrix — 2026-11-02

This new run covers both retained **0.1.0** and opt-in **0.2.0**.
Earlier cross-browser results covered only 0.1.0; they are not evidence for
configurable rates.

| Engine | Reported version | Result |
| --- | --- | --- |
| Chromium | 152.0.7977.64 | PASS |
| Firefox | 157.0 | PASS |
| WebKit | 27.2 | PASS |

Each engine passed:

- **413** fixed-point fixtures: 344 successful results, 60 checked overflows and
  nine expected division-by-zero errors.
- **39 retained 0.1.0** fractional training scenarios, including all supported epoch counts,
  varied order, fractional scales, range boundaries and nonseparable controls.
- **39 train-to-evaluation pipelines**, evaluating the actual learned model on
  eight held-out points after each training run.
- **828 retained parameter assignments**, comparing every frozen post-assignment VM
  snapshot with the exact reference, including unchanged zero-error visits.
- **288 explicit 0.2.0 training runs**: 41 scenarios at each of 0.001, 0.002,
  0.125, 0.499, 0.500, 0.999 and 1.000, plus a signed half-grid-from-zero
  case. Every run calls `trainFractionalRateClassifier`, not the retained API.
- **6,051 configurable-rate parameter assignments** across 2,017 visits,
  including signed complete-parameter half-grid ties at nonzero weights,
  repeated sub-resolution stalls without residual accumulation, and unchanged
  zero-error visits. All three coordinates are checked at every visit.
- **273 configurable-rate train-to-evaluation pipelines** using the learned
  models on the eight held-out points. At rate 1.000, all 39 retained scenarios
  also agree with the retained API's semantics.
- **31** additional evaluation batches, including 289 distinct unseen grid
  points, exact-zero/sub-resolution decisions, signed halfway rounding,
  maximum-size batches and whole-operation score overflow.
- **20** invalid-input controls, including accessors/custom iterators that must
  never execute.
- **Four validly encoded incorrect-program controls**: wrong parameter updates,
  prematurely rounded classifications, wrong bias scaling and changed zero ties.

Every semantic result is compared directly with isolated CPython **Fraction**
arithmetic, independently of the WLS algorithm. The complete native report must
also equal Node execution, including native SHA-256 hashes of generated sources,
call counts and measured budgets. Node is not used to supply browser answers.
Training-to-evaluation source and resource evidence is checked separately.

Observed retained-training maxima with per-assignment snapshots remain
**1,242 cycles**, **774 instructions** and **33,809 source characters**.
Configurable-rate training maxima are **1,782 cycles**, **816 instructions**
and **35,331 source characters**, below unchanged caps of 2,048/2,048/65,536.
Throwing division calls do not return a measured cycle count; their report uses
**null**, not a fabricated zero. Their expected error is still mandatory.

## Execution and isolation

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs \
  scripts/test-browser-fractional-learning.ts
```

Default coverage is all three engines, in the order shown. Explicit arguments
can request a subset:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs \
  scripts/test-browser-fractional-learning.ts chromium firefox webkit
```

Unknown or duplicate engine arguments fail. A missing/crashing engine fails the
run rather than becoming a skip or inferred pass. The summary is first marked
RUNNING and only marked PASS after every requested engine has completed and
closed successfully. Failures during the engine loop write FAIL.

Vite builds only the isolated fixture, without application configuration or
environment files. Playwright enters synthetic input JSON into a textarea and
clicks the real button. Normal browser page tasks run the computations; no
debugger-evaluated arithmetic or dynamic-code bypass is used.

The fixture loads only exact built assets fulfilled from memory. CSP disallows
connections and workers; service workers are blocked; unknown HTTP requests and
WebSockets are rejected and recorded. The independent loopback HTTP/upgrade
sentinel must receive zero requests. Every engine's clean numerical context
requires **zero page errors, zero policy violations, zero forbidden requests and
zero sentinel arrivals**. Separate native fault controls now independently
exercise the network detectors, as described below.

No account, provider, production database, wallet action, private participant
data or application workflow is needed. Browser children receive only a narrow
host-environment allowlist, not application secrets.

## Reproducing this Nix host

Matching Playwright Firefox and WebKit downloads are kept in the ignored
`.cache/ms-playwright/` directory. Chromium uses `/repl/tools/bin/chromium`
when available. No application dependency or native browser executable is patched.

Firefox and WebKit need separate compatible shared-library closures on this host.
Use `WLS_FIREFOX_LIBRARY_PATH` and `WLS_WEBKIT_LIBRARY_PATH`; do not combine them
or globally replace Chromium's library path. The pinned closures and additional
libraries are described in the
[existing native-host reproduction notes](test-browser-locked-packages.md#nix-host-reproduction-notes).

The downloaded WebKit MiniBrowser shell launcher must preserve the inherited
library path after its bundled paths, as documented there. This adjusts only
the ignored test launcher, not the engine binary or application code.

WebKit initially launched but failed before page creation because this host has
no graphics display. Real native rendering and arithmetic completed with the
host-only software graphics settings:

```sh
WLS_FIREFOX_LIBRARY_PATH="$FF_LIBS" \
WLS_WEBKIT_LIBRARY_PATH="$WK_LIBS" \
LIBGL_ALWAYS_SOFTWARE=1 EGL_PLATFORM=surfaceless \
__EGL_VENDOR_LIBRARY_FILENAMES=/nix/store/cpwib3zazj49fm0y04y53w4xkbqsgrgm-mesa-25.0.7/share/glvnd/egl_vendor.d/50_mesa.json \
node_modules/.bin/node node_modules/tsx/dist/cli.mjs \
  scripts/test-browser-fractional-learning.ts
```

`FF_LIBS` and `WK_LIBS` must first be constructed from those compatible host
closures. These paths are host-specific, not portable installation requirements.
Custom executable paths avoid generic distribution dependency catalogues;
actual engine startup, rendering and calculations are still mandatory.
Firefox's local sandbox accommodation and software graphics are not evidence
about production browser sandboxing or physical-device performance.

Reports and screenshots are written under the ignored
`generated-artifacts/browser-fractional-learning/` directory.

## Verdict regression tests and scope

Thirty-three tests exercise the real verdict against damaged evidence: missing
results, altered arithmetic/weights/margins, absent train-to-evaluation results,
changed source hashes/cycles, raised budgets, invented cycle measurements and
failed/missing controls. These tests run in the ordinary regression build
without requiring installed browsers.

The intermediate-update tampering test changes a snapshot while keeping the
final model correct. Even when the Node baseline carries that same alteration,
the independent Fraction comparison must reject it. Browser evidence retains
the actual returned WLS snapshots, not a host-reconstructed trajectory.
The 0.2.0 controls alter each coordinate of an intermediate signed-tie snapshot
while preserving the final model and corrupting the Node baseline identically.
They must still fail the independent reference comparison. Missing stalled or
zero-error snapshots and invalid explicit-rate fallback are also rejected.

After integrating the additional retained-assignment and rate-sweep regressions,
the focused five-file numerical/verdict set passes **320 tests**. Standalone
strict TypeScript checks cover the fixture, runner, verdict and verdict tests.
The following full-regression and security figures are historical 0.1.0 results,
not new full-build or security-scan measurements for this extension:
the full regression/build
completed with **11,442 passing tests** and **51 unchanged pre-existing
conditional skips** (275 passing files and four skipped files). Client/server
bundling, size budgets, navigation/preload checks and startup safety checks pass.
Fresh scans report zero known dependency vulnerabilities and no new static or
privacy findings; four existing medium static alerts and one existing low
privacy alert remain outside this verification work.

Desktop Playwright WebKit is **not** physical iPhone/iPad Safari certification.
This run does not establish mobile UI usability, deployed application
integration, general AI capability, model persistence, complete network-policy
sensitivity, or operator-inaccessible privacy. The dependency remains a local,
bounded two-feature learner: retained 0.1.0 uses rate 1.000, while the explicit
0.2.0 API accepts bounded configurable rates. Neither result is physical-device
certification or a claim that smaller rates improve learning.

## Fractional-runner native network fault controls

The runner now uses `assertFractionalLearningVerdict` for both the clean run and
every deliberately faulty run. This calls the unchanged numerical comparison
first, then rejects uncaught errors, CSP violations, forbidden requests and
sentinel arrivals. Correct arithmetic cannot override failed isolation.

Each engine runs eight fresh, disposable browser contexts:

| Context | Native attempt | Required independent detection |
| --- | --- | --- |
| Quiet | None | Clean numerical and isolation verdict |
| CSP HTTP | Page fetch | Enforced `connect-src` event for the exact URL |
| CSP WebSocket | Page WebSocket | Enforced `connect-src` event for the exact URL |
| CSP worker | Worker construction | Enforced `worker-src` event for the exact script |
| Route HTTP | Page fetch | Exactly one forbidden HTTP guard hit |
| Route WebSocket | Page WebSocket | Exactly one forbidden socket guard hit |
| Worker HTTP | Dedicated-worker fetch | Worker-reported enforced `connect-src` event for the exact URL |
| Worker WebSocket | Dedicated-worker WebSocket | Worker-reported enforced `connect-src` event for the exact URL |

All eight contexts execute all 413 fixed-point, 327 training and 31 evaluation
cases with the existing native button task. Only fault contexts load the separate
in-memory probe script; native clicks and worker message tasks attempt the
forbidden operations. No fetch, WebSocket or Worker stand-ins are installed.
Numerical inputs, fixtures and report format are unchanged.

Route-only controls relax `connect-src` solely to the disposable loopback
sentinel origins. Native page socket CSP controls omit Playwright's socket
interception, which otherwise runs before CSP. Worker connection controls allow
only the exact in-memory worker asset through the request allowlist and relax
the document's `worker-src` to `'self'`; the worker still receives enforced
`connect-src 'none'`. Actual worker start, rejection, target-matched enforced
CSP evidence, termination invocation and completed native context closure are
required. This does **not** claim independent worker WebSocket route-guard
protection, pre-context-close worker disappearance, nested-worker coverage or
general protection against every browser network API.

Every fault context must have matching arithmetic, no uncaught errors and zero
sentinel arrivals, then the **real** verdict must reject its observed violation
or forbidden request. Missing probes, wrong targets, unexpected responses,
timeouts or unavailable engines fail the suite rather than count as blocking.
The sentinel remains a deny-only HTTP/upgrade arrival recorder, not a provider
or an application server. The suite never starts the application workflow.
The narrow browser environment allowlist is unchanged.

Diagnostic screenshots are taken only after clean native evidence passes.
WebKit's Playwright screenshot preparation injects an inline `body {}` style,
which the unchanged CSP blocks. That exact screenshot-only event is checked
separately and retained as `screenshotViolations`; it is not ignored in the
numerical/network verdict and no style or network policy is relaxed for capture.
Unknown screenshot-stage events, errors or network arrivals still fail.

Verification on this host: Chromium **152.0.7977.64**, Firefox **157.0** and
WebKit **27.2** passed all three clean contexts and **21 rejected native fault
controls**, with zero sentinel arrivals throughout. The five-file focused
numerical/verdict suite passed **328 tests**, including eight new combined-verdict
regressions. Standalone strict TypeScript checks passed. JSON evidence includes
each control's target, rejection, detector evidence and expected rejected verdict
under `generated-artifacts/browser-fractional-learning/`.
