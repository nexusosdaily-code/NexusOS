# Pull-request safeguards

`.github/workflows/p2p-wave-vault.yml` runs on pull requests and manual dispatch,
with read-only repository permissions, no persisted checkout credential and no
application/provider secrets. Superseded runs are cancelled. The build job is
limited to 30 minutes; the fixture job to 20 minutes.

## Coverage and isolation

- Before `npm ci`, `scripts/prepare-public-ci-lock.mjs` translates only the known
  Replit proxy URL prefixes to `https://registry.npmjs.org/` in the runner's copy
  of the lockfile. Every package version, integrity hash and dependency edge is
  preserved; unknown registries fail explicitly. Nothing is written back to the
  repository. This avoids runner-inaccessible `.local`/`.internal` downloads.
  `npm ci` then installs those exact locked packages using Node 22.23.4.
- `npm run check:types` checks TypeScript once.
- `npm run build` already runs database-free server/client tests with two
  workers, then builds both bundles and checks the bundle budget, Wave Vault
  production navigation, critical preloads and startup artifact. CI does not
  duplicate this with `test:all`, `test:client` or a second release build.
- The dedicated P2P and Wave Vault configs run serially, outside the build.
  PostgreSQL 16 supplies `initdb` and `pg_ctl` on PATH. Each fixture creates and
  removes its own Unix-socket-only temporary cluster as the unprivileged runner;
  no database service URL is supplied.
- Playwright's locked version installs Chromium, Firefox, WebKit and Linux
  libraries. `WNSP_TEST_CHROMIUM_PATH` selects its Chromium for the test fixtures;
  local runs keep their existing `/repl/tools/bin/chromium` default.
- The opt-in live-video suite runs separately using its temporary loopback
  server, synthetic media and independent browsers. It never starts the app.

All jobs set `WNSP_PUBLISH_BUILD=1` and an unreachable loopback `DATABASE_URL`.
The build also enforces these at its test subprocess boundary. App Storage is
replaced by the existing memory fixture; wallets, providers and identities are
synthetic/mocked. Do not add repository/environment secrets, publishing,
`db:push`, real accounts, funded wallets or payment-release commands.

The fixture job prints verbose test statuses, saves JSON reports for seven days
and writes separate passed/failed/skipped totals to the Actions summary even
after failures. Missing reports fail the summary rather than imply success.
Unavailable optional engines remain explicit skips, not passing coverage;
browser installation failures fail the job. See
[live-video limits](live-video-browser-verification.md): Linux fixture success
does not establish physical Safari/iOS/Android compatibility or TURN reachability.

## GitHub activation

The connected GitHub credential was checked read-only through `GET /user`.
Initially it lacked the `workflow` OAuth scope, so no upload was attempted.
After the maintainer reconnected GitHub, the same read-only check confirmed
`workflow` alongside repository access. Re-check workflow-file permissions
before future syncs; ordinary source write permission is not sufficient.
Changes go to a review branch and pull request, never directly to `main`.
The maintainer controls merging and required-check settings.

Local verification includes a clean `npm ci --registry=https://registry.npmjs.org`
in a separate ignored directory using the translated lockfile (802 packages
installed), plus regression checks that conversion preserves every other
package field. This is not a substitute for a hosted GitHub Actions run.

## Security regression coverage

The required **Types and isolated release build** job runs the synthetic
physics-output privacy regression with isolated Python and a fatal 30-second
timeout. It inspects source with the standard-library AST parser; it does not
import or execute the physics demonstration.

The same job's existing build runs the database-free server Vitest project,
including minimatch resource limits, disclosure-export integrity, founder
session isolation and glob-discovery regressions. A security CI regression
checks actual Vitest file discovery for all four suites, verifies that the
build still invokes that project, and protects the Python step from being
removed or made optional. The full JavaScript suite is not run twice.

These checks use synthetic fixtures, not real wallet credentials or live
participant data. They do not replace physical-device calling tests or
complete the separate private-data security review.
