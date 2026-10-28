# Amendment submission review

Viewing the public constitution or opening a draft only reads data.
Submission is a separate authenticated POST to `/api/constitution/amendments`.
The founder account accepts only a server-issued BTC-secret session; older
password/Nostr sessions and founder API keys are not valid access methods.

## Registered human-life draft

Use `draftId: "human-life-and-ai-stewardship"` and
`approvedExactText: true` with the exact registered title and body from
`docs/human-life-and-ai-stewardship.md`. The server rejects modified wording.
Only the founder may adopt this draft. An exact matching title or body is
recognised as this draft even if a caller supplies another marker.

## Separate custom amendments

The existing custom amendment form remains available to SYSTEM/KERNEL accounts
under the existing authority and quota rules. It now requires an explicit
review checkbox, cleared by edits, closing the form or changing accounts.

A custom request must explicitly declare `draftId: "custom"` and
`approvedExactText: true`, and include `approvedTitle` and `approvedBody`
exactly equal to its `title` and `body`. Markerless or unknown requests, including
ones that modify both fields of a registered draft, cannot mine.

The custom declaration is a separate exercise of existing amendment powers:
it is not adoption of the registered human-life draft. It does not claim
that arbitrary wording is semantically equivalent to that draft. Only an exact
title/body match is shown as its adoption. Authorised operators can still write
other amendments after explicitly approving their custom wording.

## Limits and activation

Titles are limited to 200 characters and amendment bodies to 4000 characters.
Adoption appends a permanent block; it never changes the sealed original.
Neither submission mode activates operator replacement, succession or safety
controls. Article II's named authorities and Article VI's amendment powers,
reviewer identities and permissions, and the operational gates in the proposal
must be expressly reconciled, approved, implemented and tested before activation.
