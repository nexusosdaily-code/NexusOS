# GitHub merge safeguards

Verified on 2026-10-28 against `nexusosdaily-code/NexusOS`.

## Required checks on `main`

Both published job names from `.github/workflows/p2p-wave-vault.yml` are
required by classic branch protection:

- `Types and isolated release build`
- `Disposable PostgreSQL and native browser safeguards`

Both are bound to the GitHub Actions app (ID `15368`), rather than accepting
the same context name from an arbitrary status publisher. Strict status
checks require the PR branch to be up to date with `main`.

Contributor changes require a pull request, with no additional approval
quota or code-owner review requirement introduced. Force pushes and branch
deletion are disabled. Administrator enforcement is deliberately off:
the repository owner retains administrative override and control of these
settings. This is not a claim that administrators cannot bypass safeguards.

## Inspection and verification

Before making changes, read-only API inspection confirmed:

- The connected credential included `workflow` in its actual OAuth scopes,
  and the authenticated account had repository administration permission.
  No alternate credential or authorization workaround was used.
- `main` had no classic branch protection, repository/inherited rulesets,
  or effective branch rules to preserve.
- The workflow was active and had executed on PR #22. Its check suite
  published exactly the two names above under the GitHub Actions app.

The protection settings were read back after saving. PR #22 changed from
`unstable` to `blocked` while remaining open and unmerged.

Evidence:
[workflow run](https://github.com/nexusosdaily-code/NexusOS/actions/runs/40664276663)
and [PR #22](https://github.com/nexusosdaily-code/NexusOS/pull/22).
That run passed the database/browser safeguards but failed the
`Run npm run build` step in the build job. Requiring the checks does not fix
that failure or establish that the build passed.

At inspection time the workflow file was present on the PR branch, not on
`main`. No workflow upload, dispatch, rerun, PR merge, or deployment was
performed as part of configuring protection.

## Maintaining the requirement

### Build failure diagnosis

The build log from the run above failed in
`server/prior-art-campaign.test.ts`, before client/server bundling. GitHub's
`PRIOR_ART.md` stopped at claim 35, but the announcement catalogue already
contained claims 1–39. The existing exact-title/order assertion correctly
rejected the incomplete register (35 entries versus 39); this was not a
TypeScript, dependency installation or database/browser fixture failure.

The focused repair restores the workspace's existing index rows and full
disclosures for claims 36–39 verbatim, without rewriting claims 1–35 or
introducing new scientific assertions. The unrelated third-party observation
appendix is excluded from the GitHub patch. An additional regression test
checks full-claim/index coverage, ordering, uniqueness and matching anchors.
The original catalogue equality test and all release gates remain enabled.
Restoring historical disclosures does not certify their scientific claims or
authorize campaign sends; the promotion hold remains unchanged.

Because the workflow is still on the open safeguards branch, the repair PR
targets that branch first. The owner must review and merge that repair there,
then require a fresh successful run on the updated original PR before merging
to `main`. A successful stacked-PR run alone is not evidence that the original
PR's unchanged head has passed. No automatic merge or deployment is part of
this repair.

Before renaming either job, inspect GitHub's published check runs and update
the required contexts in coordination with the workflow change. A stale
required name can leave PRs waiting indefinitely. Do not remove a requirement
merely to get a failing PR merged.

Use GitHub repository Settings → Branches to inspect or change the protection
for `main`. Preserve owner control unless the founder approves a change.
