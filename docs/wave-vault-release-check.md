# Wave Vault release regression check

Run `npm run check:release-wave-vault` to produce a fresh production client build
and check its public output. This does not start the server or publish anything.
It needs no database, sign-in, real account or private files.

The same guard runs automatically after the client build in `npm run build`.
To inspect output already built with a Vite manifest, run
`npm run check:wave-vault-artifact`. Missing output fails rather than skipping.

The guard follows the manifest from the HTML entry to the current hashed hub
and Wave Vault bundles. It checks the compiled quick action, the destination
inside Data & Storage, the app route registration, and the route file.
Good stale chunks elsewhere in the assets directory do not satisfy it.

Focused database-free tests:

```sh
node_modules/.bin/node node_modules/vitest/vitest.mjs run --project server scripts/check-wave-vault-artifact.test.ts
node_modules/.bin/node node_modules/vitest/vitest.mjs run --project client client/src/pages/hub-wave-vault-access.test.tsx
```

These checks complement the source component tests; they do not sign in or
exercise a rendered release page. They do not verify a published deployment,
browser caches, Safari, private-file operations, or actual account access.
