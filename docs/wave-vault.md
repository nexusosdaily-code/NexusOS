# Private wave-channel filing

Wave Vault (`/wave-vault`) is a private filing feature for accounts with a registered `wnsp://Ψ(…)/…` wave-channel URI. It is **not** P2P delivery, legal-trust evidence collection, a blockchain object store, or a payment service. It does not lift the separate P2P money gate.

## How it works

- PostgreSQL indexes each original file by the account's registered wave URI plus a unique file identifier. Names, nested virtual folder paths, sizes, SHA-256 checksums, upload states, and grants are metadata. The actual complete byte sequence lives in Replit App Storage under an opaque server-generated object key, not in Git, the browser's public directory, or the SQL metadata row. The storage key contains no submitted filename.
- Knowing a coordinate or URI **does not** authorize access. The server resolves the signed-in account on every request; owners may explicitly grant read access to an exact registered wave address. A grant is bound to that account ID at grant time, not automatically reassigned if an address later changes hands. Recipients cannot change, delete, or forward the owner's grant. The server never returns an App Storage path, signed public URL, or direct object URL.
- The owner may rename/move within virtual folders, revoke grants, and delete a file. Revocation blocks new reads immediately in the database. Same-process active transfers are stopped on local revocation and session changes; other running instances recheck sessions and grants every five seconds and fail closed when the check fails. Already downloaded copies cannot be erased. A cross-instance read can deliver more bytes before its next recheck.
- Downloads stream from the stored generation as `application/octet-stream` attachments with `no-store`, `nosniff` and a restrictive CSP, even for HTML/SVG; the complete byte count and SHA-256 are verified and the final chunk is withheld until integrity passes. This verifies storage integrity, not a sender's identity or the truth of the file's contents. App Storage provides server-side encryption at rest, **not end-to-end encryption**; the application and provider can access file bytes.
- Any file content type is accepted. Limits are 256 MiB per file, 1 GiB and 200 nondeleted files per account, 200 incoming shares per recipient, and 50 recipients per file. Uploads have a ten-minute transfer window and two concurrent transfers per account (16 per server). These are resource bounds, not content restrictions.
- Creation reserves quota before upload. A pending reservation without an upload expires after one hour. The upload records a checksum only after exact bytes are stored; a failed upload is not marked ready. If storage cleanup fails, the file stays inaccessible as `deleting` and its quota remains held until an owner retry succeeds. The server never silently discards a verified file to free space.

## Storage and release checks

The private App Storage directory (`PRIVATE_OBJECT_DIR`) must be configured by the workspace's managed storage setup, with **bucket public-access prevention enforced**. Replit documents its managed buckets as private with public-access prevention, but its application identity can be denied bucket-administration metadata. A 403 on that administrative query is not treated as permission to disable privacy checks: for a configured, canonical `replit-objstore-<uuid>` bucket only, the adapter writes 32 non-sensitive random probe bytes without overwriting anything, verifies an authenticated generation-bound read and SHA-256, requires an unauthenticated HEAD request to be denied (401/403), and removes that exact probe generation before declaring storage ready. This checks actual object access under Replit's platform privacy guarantee; it is not an independent inspection of bucket IAM. An accessible probe, failed request, corrupt read or failed cleanup keeps user uploads/downloads disabled. A pending cleanup is retried before another probe is created.

Storage verification fails closed: the UI shows an unavailable warning and the API refuses uploads and downloads rather than using a local filesystem, an unverified public bucket, or plaintext metadata as a substitute. If that directory has not been provisioned, the feature is not ready for file uploads yet. Do not copy the separate private-trust evidence key, wallet keys, or object prefixes into this filing system; existing trust evidence uploads remain disabled.

Schema is defined with the other Drizzle tables; the new tables were applied to the development database. Follow the project's managed publish migration process for production, not application-startup schema changes or manual production edits.

Development checks: `npm run check:types`, `npm run build`, `node_modules/.bin/node node_modules/vitest/vitest.mjs run --config vitest.wave-vault-security.config.ts`, and the existing full test suite. The dedicated suite uses an isolated temporary PostgreSQL cluster and in-memory App Storage stand-in; it never accesses actual funded wallets, production data or storage. Browser fixtures bundle the real file-manager UI with synthetic fixture-only identities; application authentication is unchanged. They verify raw file download, permissions and account switching. These are not successful signed-in production or Safari-device tests. The generic legacy object-document path explicitly refuses Wave Vault objects so it cannot bypass the file-level SQL grants.

### Cross-engine incoming-share regression

`server/wave-vault.postgres.integration.test.ts` runs the independent sender/receiver
lifecycle separately in Chromium, Firefox and WebKit. Each receiver opens an empty
Shared index **before** the independent sender uploads and grants access. The
normal foreground polling must reveal the file without a receiver reload,
account switch, manual refresh or simulated resume event. The test verifies exact
downloaded bytes (including non-text bytes), then changes the receiver's synthetic
identity to an outsider to check both cached UI isolation and fresh API denial.
It restores the recipient identity before revocation, dispatches a persisted
`pageshow` event and checks the refreshed empty index, removed row and fresh
download denial. The sender still retains access.

Run only the isolated integration fixture (no normal application startup required):

```sh
WNSP_PUBLISH_BUILD=1 DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:1/forbidden \
  node_modules/.bin/node node_modules/vitest/vitest.mjs run \
  --config vitest.wave-vault-security.config.ts --reporter=verbose
```

Install matching optional browser binaries outside tracked source with
`node node_modules/playwright-core/cli.js install firefox webkit` and provide their
Linux host libraries. Chromium uses `/repl/tools/bin/chromium` when present,
otherwise Playwright's matching Chromium. Each missing executable or explicitly
missing host library prints `UNAVAILABLE <engine>` and is reported as **skipped,
not passed**. Other launch errors and all lifecycle assertion failures fail the
suite; an available engine is never substituted for a missing one.

In the 2026-10-28 workspace check, Chromium completed the lifecycle; Firefox
could not launch because `libgtk-3.so.0` was missing and WebKit could not launch
because `libatk-1.0.so.0` was missing. Neither engine's lifecycle was verified in
that environment. TypeScript checks passed.

The persisted `pageshow` event tests the application's restoration handler; it
does **not** establish actual BFCache eligibility, OS freeze/resume or Safari
download behavior. Even a passing **Linux WebKit** run is not Safari.app or a
**physical iPhone** test. Real iPhone evidence remains a separate requirement
described below.

## Selecting recipients without copying addresses

### Receiving a newly shared file

Incoming grants are visible under **Shared with me**, not **My files**. The
tabs show file counts, and My files offers an **Open Shared with me** prompt
when incoming files exist. Opening the shared view clears any previous search
filter and refreshes the index.

The receiver index refreshes every ten seconds while the page is in the
foreground, and refreshes on browser focus, reconnect and restored-page
events. This overrides the app's indefinitely fresh cache defaults and bypasses
the HTTP cache. iOS may suspend background pages: this is not background push
delivery, and network failures may delay updates. Explicit Refresh remains
available. Revocation is enforced on the server even before a stale list
updates.

An isolated two-session Chromium check starts the receiver on an empty shared
list before the sender uploads and grants access. It verifies discovery without
reload/account switching, exact downloaded bytes, and removal plus fresh-download
denial after revocation/page restoration. Hook tests exercise focus, reconnect,
restoration, polling and signed-out denial. This reproduces and fixes a stale-list
failure, but does not independently confirm the owner's physical iPhone issue
is resolved.

In a file's **Access** dialog, choose **Browse directory**, search by username
or wave address, and select the intended person. Selection fills the exact
address field only; **Grant access** is still required. The same picker appears
in P2P's **Send a file** tab. P2P's **Receive** tab continues to use the signed-in
account's own address; selecting a recipient does not change your identity or
automatically send a file.

The authenticated directory lists only active accounts with wallets and public,
self-owned registered wave URIs. Private registrations, calculated spectral
coordinates, and someone else's registration are not offered. Results are
limited to 30; refine the search when more matches exist. Direct exact-address
entry remains available for recipients who do not publish a directory entry.
Neither directory membership nor selection grants file access.

The owner reports Samsung file use working, and difficulty finding/sharing
files on iPhone. The new directory pathway addresses address entry; it is not
yet evidence of a successful real-iPhone sharing test. Retest by selecting the
recipient, explicitly granting access, opening **Shared with me** on their
account, downloading a non-sensitive fixture and then revoking new access.

Real-device report on 2026-10-28: the owner confirmed the test works on iPad.
Their screenshot shows the signed-in Wave Vault file-access dialog, directory
control and an existing recipient grant for a video file. Record this as
owner-reported iPad sharing success with visible grant evidence, not an
independently observed recipient download, byte-integrity or revocation test.
The iPadOS/browser versions were not supplied. This does not establish that
the separate iPhone issue is resolved.

## iPhone Safari verification status — 2026-10-28

**Updated real-device result:** the user subsequently confirmed completed
sharing and receipt in both directions: iPhone → Samsung and Samsung → iPhone.
The supplied screenshots show an incoming MP4 entry under **Shared with me**
on iPhone and a sender-side access grant. The missing-receiver-file problem
is therefore resolved for the user-tested flows. Browser/OS versions, downloaded
byte integrity and device-side revocation were not separately established.
This is Wave Vault private stored-file sharing, not proof of direct WebRTC
transport. The earlier verification limitations below describe the agent's
test access, not a failure of this subsequently confirmed device test.

Access improvement requested during verification: the signed-in hub now offers
a labelled **Wave Vault** quick action and a **Data & Storage → Wave Vault**
navigation entry, both targeting `/wave-vault`. Focused component tests verify
both click paths. TypeScript passes and the signed-out app loads at a phone-sized
viewport; that screenshot does not verify the authenticated hub or iPhone Safari.
These navigation changes are not evidence that the private sharing checks below
have passed.

Build-readiness recheck on 2026-10-28: `npm run build` completed, including
4,457 passing server/client tests (19 skipped), client/server bundles, bundle
size checks and critical preloads. Its first attempt stopped on a five-second
timeout in the unrelated traffic-logger probe test; the complete retry passed
without changing code or disabling checks. The focused hub navigation tests
passed (2 tests), and the isolated Wave Vault PostgreSQL/Chromium suite passed
(17 tests). The generated production hub bundle contains both `Wave Vault` and
`/wave-vault`, and the Wave Vault page bundle exists. This establishes build
readiness for device testing, not published storage configuration, real-account
access, or Safari compatibility.

Live asset comparison on 2026-10-28, after the navigation was still absent in a
phone screenshot: an unauthenticated, no-cache request to
`https://wnsp.io/hub` returned HTTP 200 and referenced
`/assets/hub-BkjG5Xye.js`. Fetching that asset returned HTTP 200; it contained
neither `Wave Vault` nor `/wave-vault`. The local production hub bundle,
`hub-BBkNnKl7.js`, contained both. The live site therefore was still serving a
hub build without these navigation changes; a stale open phone tab alone does
not explain the missing entry. No production changes or authenticated requests
were made in this comparison.

**Blocked; compatibility has not been established.** The verification workspace
reports Linux. No controllable physical iPhone Safari session, authenticated
real-device service connection, or approved owner/recipient/outsider account
sessions were available to this verification attempt. An integration search for
BrowserStack, Sauce Labs and real-device browsers returned only an unconnected
generic cloud-browser service, not an available iPhone Safari session.

Device model, iOS version, Safari version and real-device session evidence:
**unavailable**. No signed-in device tests were run, no fixtures were uploaded,
and no user files, grants or funds were changed. No cleanup was necessary.
Existing isolated Chromium/PostgreSQL tests and prior App Storage checks are
separate evidence, not results from this attempt. Neither a Safari user-agent
string nor a Linux WebKit run would resolve this blocker.

Resume only with a controllable real iPhone Safari session and explicitly
approved test accounts authenticated through the existing sign-in flow. Do not
copy private keys, cookies or session credentials into this document or chat.
Record the tested app revision, device model, iOS/Safari versions, timestamp,
and a non-secret evidence reference for each result.

| Required device check | Status | Evidence required when access is available |
| --- | --- | --- |
| Upload small non-sensitive document and media fixtures | Not run — access blocked | Original filename, size, SHA-256, successful ready state and device UI evidence |
| Download original bytes, including Unicode filenames | Not run — access blocked | Saved filename, exact byte count and SHA-256 equality for each download; verify actual saved bytes, not only API metadata |
| Share to an approved recipient's registered wave address | Not run — access blocked | Owner grants access; recipient sees and downloads the fixture with matching bytes |
| Deny an approved outsider and a signed-out visitor | Not run — access blocked | Denied direct content requests and absence from the outsider's index; no leaked bytes |
| Revoke recipient access | Not run — access blocked | Fresh recipient read denied after revocation; distinguish previously downloaded copies |
| Switch accounts using existing authentication | Not run — access blocked | No previous-account file lists, dialogs or new downloads remain accessible, including back navigation/reload |
| Delete fixtures and confirm cleanup | Not run — access blocked | Owner deletion succeeds, fresh reads fail, grants are removed and test-only metadata/object cleanup is confirmed |

Use a unique test-only fixture prefix and record only objects created by this
run. Never modify pre-existing user files. If any upload or deletion is
interrupted, record the outstanding test-only item and confirm cleanup before
reporting success.
