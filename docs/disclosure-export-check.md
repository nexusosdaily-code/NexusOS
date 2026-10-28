# Pre-PR disclosure export gate

Run this **before** opening a release PR, after assembling its final Git tree.
Do not substitute a green workspace test for verification of the exported tree.

## Local Git objects

```
npm run check:disclosure-export -- --tree <proposed-tree-or-commit>
```

The explicit argument is mandatory. It resolves once to an immutable tree and
reads both `PRIOR_ART.md` and `server/prior-art-campaign.ts` from Git objects,
not the working directory. A mismatch exits 1. Run focused regressions with:

```
node_modules/.bin/node node_modules/vitest/vitest.mjs run --project server scripts/check-disclosure-export.test.ts server/prior-art-campaign.test.ts
```

## GitHub integration exporters

Use the connected GitHub integration's authenticated JSON request adapter with
`beforeDisclosurePR(treeSha, request, continuation)` from
`scripts/check-disclosure-export.mjs`. Adapter paths are relative to
`/repos/nexusosdaily-code/NexusOS/`; reject all non-2xx responses.

The gate reads the exact final tree by SHA, rejects truncated tree listings,
requires regular file blobs, reads each blob by SHA and checks its Git hash and
byte length. It parses the catalogue as data with TypeScript, never imports
application code, sends campaigns, starts the server or connects to a database.
It checks ordered, unique, contiguous full claims, index numbers and anchors,
catalogue coverage and index titles, plus disclosure metadata and nonempty bodies.
Original full-claim titles sometimes differ from index summaries; those historical
titles are intentionally not rewritten or required to equal summaries.

Only in the successful continuation:

1. Create a commit whose tree equals `evidence.tree`, parented to the selected
   remote base commit, and a new review branch (never update main).
2. Read back the commit and new branch; require their tree/head to equal the
   validated tree/created commit immediately before creating the PR.
3. Open the PR and record its head, checked tree and blob hashes in the handoff.
   If the branch changes, revalidate. A pre-PR check is not a permanent guarantee
   for later branch updates; keep all existing required CI checks.

Fail closed on API errors or missing sources. Never weaken branch protection or
administrator override, merge, deploy or send announcements as part of this gate.
This is structural export consistency, not proof of scientific validity, nor a
byte-for-byte guarantee against arbitrary edits within otherwise complete prose.
