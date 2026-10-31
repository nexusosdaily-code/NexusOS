# Repeatable tests for WavelengthScript libraries

WavelengthScript programs can now be tested using a local JSON suite rather
than writing a separate TypeScript/Vitest harness for each program consumer.
This is host-backed developer tooling for the **existing** language and packaged
libraries, not a new language grammar or a self-hosted test runner.

## Run the included example

```sh
npm run check:wls-library
node_modules/.bin/tsx scripts/wls-collections-cli.ts test scripts/fixtures/wls-library-smoke.json
```

The example exercises exact search, first matching index, concatenation and an
expected out-of-range error. A passing suite exits with code `0`; assertion
failures or an invalid suite exit with code `1`. Assertion failures produce a
JSON report on stdout; invalid suites produce a bounded error on stderr.
No application, database, wallet or network service is started.

## Write a suite

```json
{
  "profile": "WLS-TEST/1",
  "cases": [
    {
      "name": "Find an exact match",
      "program": "string.contains",
      "inputs": {"items":["alpha","beta"],"value":"beta"},
      "expect": {"value":true}
    },
    {
      "name": "Reject an invalid index",
      "program": "recipient.at",
      "inputs": {"items":[],"index":0},
      "expect": {"error":true}
    }
  ]
}
```

Use exactly the documented keys. Each case has a unique nonblank name and a
program ID from `COLLECTION_PROGRAM_IDS` or the separate `MAP_PROGRAM_IDS`,
plus its named JSON input registers.
`expect` contains **either** `value` or `error: true`, not both.

Expected values are strings, safe integers, booleans, bounded string lists or
the bounded ordered map entry shape documented in
[map library 0.3.0](wavelengthscript-maps-v0-3.md).
Equality is exact, including list order, duplicates and Unicode code units;
there is no trimming, coercion, normalisation, regex or expression evaluation.
Map equality compares ordered key/value pairs, not unordered object fields.
An expected error matches any interpreter `CollectionVMError` during execution,
not a particular error category. Inputs may deliberately contain invalid VM
values when testing a runtime error.

The runner validates the whole manifest and compiles all selected library
sources before running any case. Unknown IDs, paths, URLs, malformed expectations
and broken package sources cannot become passing expected-error assertions.
Unexpected host exceptions abort rather than passing an error assertion.

## Resource and authority boundaries

- Suite text: at most 131,072 UTF-16 code units; strict UTF-8 at the CLI.
- Between 1 and 64 cases; names at most 80 code units, without control characters.
- Each case's compact serialized input object: at most 16,384 code units.
- Existing VM limits remain unchanged, including at most 1,024 visited
  instructions per case, 32 registers, 20 list items and 256 code units/string.
  At most 65,536 VM instruction visits are possible across 64 cases.
- Programs come only from the fixed generated library catalogue. The suite
  does not load source paths, URLs, callbacks or shell commands.
- The CLI reads only the explicitly selected suite file and writes its local
  report. It does not modify that file or grant programs new capabilities.
- Reports contain case names, program IDs and outcome categories, not input
  values, returned values, raw runtime exception text or source. Case names
  are user-supplied and visible; do not put private information in them.

The generated artifact is the execution source of truth for both browser and
Node tooling. Run `check:wls-library` first to catch a stale artifact; testing a
packaged program does not automatically read newer on-disk `.wls` sources.
This tool remains a normal Node/TypeScript bootstrap, not an OS sandbox or
proof of privacy, application parity or production readiness.

The pure, synchronous `runCollectionTestSuite(text)` function is also exported
from `shared/wls-test-runner.ts` for browser/Node developer integrations without
filesystem or network access. Adding a browser UI is separate work.

## Verification

Focused regressions are in `server/wls-test-runner.test.ts` and
`scripts/wls-collections-cli.test.ts`, including real CLI subprocesses,
pass/fail exit codes, all-before-execution validation, invalid fixtures, exact
comparisons, runtime bounds and unexpected host-error handling.
