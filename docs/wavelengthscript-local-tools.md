# Local tooling for existing WavelengthScript collections

This developer tool compiles and runs standalone `WLS-COLLECTION/1` and
separate `WLS-MAP/1` source
files. It builds on the existing language profile and interpreter; it is not
a new language, an application rewrite or a general package/import system.

No installation or application startup is required in this workspace. Use the
already installed TypeScript runner:

```sh
node_modules/.bin/tsx scripts/wls-collections-cli.ts --help
node_modules/.bin/tsx scripts/wls-collections-cli.ts compile path/to/program.wls
node_modules/.bin/tsx scripts/wls-collections-cli.ts run path/to/program.wls path/to/inputs.json
node_modules/.bin/tsx scripts/wls-collections-cli.ts run path/to/program.wls path/to/inputs.json --trace
node_modules/.bin/tsx scripts/wls-collections-cli.ts test path/to/suite.json
node_modules/.bin/tsx scripts/wls-collections-cli.ts package-check path/to/manifest.json
node_modules/.bin/tsx scripts/wls-collections-cli.ts package-run path/to/manifest.json string.contains path/to/inputs.json --trace
```

For example, save this as `count.wls`:

```text
WLS-COLLECTION/1
LIST_LEN ["size","items"]
RETURN ["size"]
```

With `inputs.json` containing `{"items":["alpha","beta"]}`, running it produces:

```json
{
  "profile": "WLS-COLLECTION/1",
  "value": 2,
  "cycles": 2
}
```

`compile` emits instructions, resolved branch operands, source lines and
coordinate-derived wavelength metadata. `run --trace` additionally emits only
the instructions actually visited. Compilation output is inspection data:
the tool accepts executable **source**, never serialized bytecode.

The `test` command runs fixed-catalogue library programs from a bounded JSON
manifest. See [repeatable library tests](wavelengthscript-test-tools.md) for its
schema, included example and exit-code contract.

The `package-check` and `package-run` commands add exact-version local dependency
declarations and declared-program loading. See
[dependency manifests](wavelengthscript-package-manifests.md) for the supported
format and the distinction between version labels and source-integrity locks.

For explicit source-integrity checking, use `package-lock`, `package-verify`
and `package-run-locked` as documented in
[exact-source locks](wavelengthscript-package-locks.md). Existing commands
remain unlocked; lock mismatches never trigger automatic regeneration.

## Limits and capabilities

- Only the two explicitly selected regular files are read by the command adapter.
  UTF-8 is checked strictly, and reads have byte and character bounds.
- Source is limited to 8,192 UTF-16 code units; JSON text to 16,384.
- JSON inputs must be a non-null object. Existing register, type, string/list,
  instruction and execution-cycle limits are enforced by the interpreter.
- The adapter does not write source/inputs or import/start the website,
  database, wallet, session or network services.
- Executed collection programs have no file, network, storage, import, dynamic
  host-code execution or financial instructions.
- Errors return a nonzero exit code, without stack traces, read-file paths
  or JSON parser excerpts. Results and requested traces intentionally appear
  in the local terminal: do not publish output containing private input data.

This is a capability-free instruction profile inside a normal local Node
process, **not an OS security sandbox for untrusted JavaScript**. The host runner
and existing TypeScript dependencies remain required.

The standalone-library packaging work is separate; the command accepts any
valid collection source file and does not depend on a new package loader.
See [native collections](wavelengthscript-native-collections.md) and the
[string-list library](wavelengthscript-string-library.md).

## Verification

`scripts/wls-collections-cli.test.ts` exercises compile/run/help, optional
tracing, explicit errors, input/file limits, UTF-8, unchanged files, foreign
source rejection, cycle exhaustion and actual separate-process CLI output.

```sh
WNSP_PUBLISH_BUILD=1 \
DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:1/fixture \
node_modules/.bin/node node_modules/vitest/vitest.mjs run --project server \
  scripts/wls-collections-cli.test.ts \
  server/wls-string-collections.test.ts server/wls-collections.test.ts
```
