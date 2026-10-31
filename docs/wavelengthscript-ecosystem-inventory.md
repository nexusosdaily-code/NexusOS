# WavelengthScript ecosystem: implementation inventory

## Purpose and scope

This inventory evaluates the supplied `FileHavenDependencies` proposal against
the existing project. WavelengthScript already exists; this is not an estimate
for inventing a language from scratch. The proposed File Haven module is an
interface sketch, not evidence that its named libraries are implemented.

This is a targeted source inspection, not an exhaustive dependency or security
audit. It does not authorise application rewrites, financial release, package
removal or changes to running services.

## Existing execution paths

### Contract execution

`server/wnsp_vm.ts` supplies `compileWLS`, instruction execution and collected
effects. It recognises spectral operations, state operations, transfers and
sub-contract calls. External effects are handled outside the pure VM.

Its generic `EXEC` fallback records source text in output. It does not implement
arbitrary source-language expressions, module imports or library calls.
Consequently, bytecode output alone cannot demonstrate semantic support for the
proposed source. Existing `fn` labels are not evidence of the proposed typed
function/module system.

### Bounded computation

`shared/wavelength-python.ts`, `shared/wavelength-python-expression.ts` and
`shared/wavelength-python-vm.ts` implement the Python-subset translation,
coordinate-tagged instruction compilation and execution path.

Supported capabilities include bounded integers, strings, booleans and None,
arithmetic, assignments, comparisons, short-circuit expressions, if/elif/else,
positional functions and returns. See `docs/wavelength-python-subset.md` for
exact semantics and limits.

This path rejects unknown bytecode. It does not expose file, browser, network,
wallet or persistent-storage capabilities. Imports, packages, collections,
loops, classes and exceptions are outside its documented subset.

Both engines are currently implemented in TypeScript. Their existence is real
software functionality, not evidence that the application or host runtime is
already implemented in WavelengthScript.

## Supported, host-backed and missing areas

| Area | Existing foundation | Missing from the proposal as executable native functionality |
|---|---|---|
| Native libraries | Scalar computation, function calls, branching, bounds, diagnostics, bounded string-list programs, bounded string-to-string maps and map-backed string-key Sets | General module resolution; general Set values/list conversion, richer Map and list values; richer text APIs; structured-data parsing; library-level error handling; authorised file abstractions |
| Dependency replacements | Working application packages listed in package.json | Exact used-API inventory, native implementations and behavioural parity tests; no implementation found for proposed wnsp_merge or nativeSecureDefault |
| Interoperability | Existing TypeScript browser/server application, authenticated routes, database and private storage integration | Explicit WavelengthScript host-call ABI, capability checks, data marshaling, asynchronous operation/cancellation and resource accounting |
| Development tools | npm/TypeScript/Vitest/Vite bootstrap, local collection compile/run/test CLI, exact-version offline manifests, explicit source-integrity locks and fixed-catalogue library packaging | General wnsp CLI/toolchain, transitive dependency/version resolution, signed/complete-runtime artifacts, module-aware diagnostics and debugger/source mapping |
| Dedicated development AI | Existing guide and operational agents; compiler/VM building blocks | Bounded source-edit/compiler/test orchestration, isolated workspace, reviewable diffs, allowed tools, attempt/time/spend limits and approval boundaries |
| Application migration | Working TypeScript application, including Wave Vault and P2P functionality | Selected components genuinely implemented in WavelengthScript and tested against existing behaviour; wrapping legacy modules alone is not replacement |
| Independent verification | Existing automated security, malformed-input, language and application tests | Migration-specific parity/performance suites and independent review of each new capability boundary; naming an audit function is not executing an audit |

Examples of remaining host dependence:

- `server/wave-vault-service.ts` uses PostgreSQL interfaces and Node streams.
- `server/wave-vault-storage.ts` uses Node streams/crypto and an object-storage
  client.
- `server/kernel_agents.ts` contains database-backed operational agents, not the
  dedicated WavelengthScript coding/migration agent.
- `client/src/components/GuideBot.tsx` is not that migration-agent deliverable.

These are examples, not a complete import graph. Existing support for native
browser media or storage is not automatically callable by a WavelengthScript
program.

## Recommended order

As of 2026-10-31, the bounded collection foundation, standalone sources,
browser/Node packaging and local compile/run tool exist. Repeatable
[library test suites](wavelengthscript-test-tools.md) now add a consumer-facing
test tool. These are dependency/tooling increments, not completion of every
item below or a self-hosted toolchain.

[Repository-local dependency manifests](wavelengthscript-package-manifests.md)
now declare exact library versions and permitted catalogue programs. They do
not constitute a general package registry, installer or source-integrity lock.

The separate [source-integrity lock workflow](wavelengthscript-package-locks.md)
now binds exact manifests and declared packaged program sources. It does not
authenticate authors or cover the interpreter/host runtime.

[Collection library 0.2.0](wavelengthscript-collections-v0-2.md) adds native
last-match search and list reversal without extending VM capabilities. The
original 0.1.0 release surface and source bytes remain available to pinned
consumers; these are additional bounded string-list operations, not a general
List/Map/Set implementation.

[Bounded maps 0.3.0](wavelengthscript-maps-v0-3.md) now provide eight pure
string-to-string map programs in a separate **WLS-MAP/1** profile. Exact
key matching, stable insertion order, immutable results and finite resource
budgets are specified there. The retained 0.1.0/0.2.0 string-list surfaces and
source commitments do not change; general Set values, general-purpose maps and host
capabilities remain missing.

[Map composition 0.4.0](wavelengthscript-map-composition-v0-4.md) adds three
native programs for right-biased merge, shared keys and unmatched left keys
under the existing map profile. The 0.3.0 map surface stays fixed. This is
shallow string-map composition, not deep structured-data merging, a Set
implementation or replacement of an application's dependency package.

[Map-backed string Sets 0.5.0](wavelengthscript-sets-v0-5.md) now add ten native
key-set programs under the existing Map interpreter, retaining all eleven Map
programs. Outputs normalize payloads to empty strings; this does not create a
general Set VM value type, array-to-Set conversion or a new host capability.

[Map values and Set comparisons 0.6.0](wavelengthscript-map-set-v0-6.md)
adds exact value filtering/rejection, explicitly last-key-wins inversion and
subset/disjoint/equality predicates. These remain bounded flat-string library
algorithms under the same Map profile, not richer structured-data parsing.

[Full-entry comparisons and Set symmetric difference 0.7.0](wavelengthscript-map-set-v0-7.md)
distinguish matching key/value pairs from matching keys. The older key-based
operations are unchanged; native symmetric difference avoids an unnecessary
union-size restriction while still enforcing the 20-member result cap.

[Conditional Maps 0.8.0](wavelengthscript-map-set-v0-8.md) adds fallback reads,
insert-if-absent and replace-if-present operations, retaining the previous
32 programs for a fixed 35-program surface. These are immutable local operations,
not shared-state atomic updates or database transactions.

[Ordered selection 0.9.0](wavelengthscript-map-set-v0-9.md) adds take/drop for
Maps and map-backed string Sets, for a fixed 39-program surface. Safe integer
counts clamp to the operand's cardinality, preserving order and Map payloads;
Set outputs have canonical empty payloads. Earlier exact releases, profiles
and interpreter budgets remain unchanged.

[Map value queries 0.10.0](wavelengthscript-map-set-v0-10.md) adds value
membership, entry-match counting and first matching key lookup with a required
string fallback. The fixed surface is 42 Map/Set programs under the same Map
profile. These are exact bounded local data queries, not identity checks,
database access or measured application speed improvements.

[Value transformations 0.11.0](wavelengthscript-map-set-v0-11.md) adds
all-match payload replacement, first-key-wins inversion and unique-value
string Sets. Its fixed 45-program surface uses the unchanged Map interpreter
and budgets. Earlier inversion policies and key-Set extraction are retained;
this does not introduce callbacks, arbitrary transforms or new I/O capabilities.

[Ordered value operations 0.12.0](wavelengthscript-map-set-v0-12.md) adds
last-key lookup and first/last matching-payload replacement. Its fixed
48-program surface retains the same interpreter, limits and all previous
sources. It does not add callbacks, sorting, arbitrary value types or host
capabilities.

[Indexed Map reads 0.13.0](wavelengthscript-map-set-v0-13.md) adds strict
value-by-position reads and key/value-by-position reads with required string
fallbacks. Its 51-program surface preserves insertion order and the existing
Map interpreter and limits. Fallbacks cover out-of-range safe-integer indices,
not malformed arguments; strict `map.keyAt` is unchanged.

[Ordered membership queries 0.14.0](wavelengthscript-map-set-v0-14.md) adds
Map key positions, Set member positions and Set indexed reads with a required
string fallback. Its 54-program surface uses the existing Map interpreter and
budgets. Member positions follow insertion order and ignore Map payloads;
these are local data operations, not live participant tracking.

[Ordered Map/Set slices 0.15.0](wavelengthscript-map-set-v0-15.md) adds native
offset-and-count windows, preserving Map payloads and canonicalizing Set
payloads. Its 56-program surface retains existing execution limits and source
commitments. These are bounded local selections, not database pagination or a
live P2P integration.

1. **Define a small execution/library contract.** Specify which engine runs the
   first native library, how modules and values are represented, and how unknown
   operations fail. Do not merge the two VMs or grant the computation VM
   financial effects merely to share syntax.
2. **Prove one bounded collection library.** Implement a small immutable list
   value with length/index operations, explicit bounds and tests. Define any
   iteration or other language extensions separately. No database/network or
   wallet access is needed.
3. **Add module and development foundations.** Resolve local versioned modules,
   expose useful source diagnostics and provide repeatable tests. Start with
   existing tooling as the bootstrap; native tooling is a separate milestone.
4. **Build the bounded coding-agent pilot.** Permit a narrowly scoped edit,
   compile and test task. Require finite retries, time/spend limits, isolated
   execution and human-reviewed changes. No automatic financial or release
   authority.
5. **Migrate one pure application helper.** Select it from measured actual
   usage, compare outputs/errors with the old implementation, then measure
   runtime and resource costs.
6. **Add capability-controlled host interfaces.** Introduce asynchronous file,
   storage and network operations only with permission, cancellation, quota and
   revocation tests. Coordinates identify resources; they do not grant access.
7. **Expand migration in tested slices.** Keep financial/accounting,
   authentication, cryptography and cross-device media boundaries for separately
   scoped review. Retain vetted infrastructure where replacing it has not been
   justified.

The proposed source syntax is a candidate design, not an adopted language
extension. Each replacement must have a declared API and observable execution
semantics; security-sounding names and self-asserted parity are insufficient.

## Verification performed for this inventory

The following focused suites ran without starting the application or connecting
to a funded database:

```sh
WNSP_PUBLISH_BUILD=1 \
DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:1/fixture \
node_modules/.bin/node node_modules/vitest/vitest.mjs run --project server \
  server/wavelength-python.test.ts \
  server/wavelength-python-malformed.test.ts \
  server/browser-vm-security.test.ts
```

Result: **3 files passed, 2,594 tests passed**.

This validates the selected existing language/VM safeguards. It does not
validate the supplied module, new libraries, live financial operations,
cross-device media or an independent security clearance.

## Estimation implications

The first bounded collection pilot is now implemented; see
`docs/wavelengthscript-native-collections.md` for its actual execution boundary,
P2P integration, tests and audit. General List/Map/Set modules, imports and the
remaining ecosystem items below are not thereby complete.

Previous budget ranges are preliminary allowances, not a priced work breakdown.
They cannot be treated as measured cost per library.

Before narrowing them, inventory actual dependency calls and select one
representative migration. Record implementation/review time, model/tool
expenditure, tests, semantic gaps and runtime results. Use that evidence to
estimate subsequent work. Do not count the existing language as a new
blank-slate deliverable, or count host wrappers as native dependency completion.
