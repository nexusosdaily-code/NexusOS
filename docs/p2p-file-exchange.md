# Addressed P2P file exchange

## What was wrong

The transmission workspace's previous binary “P2P” action posted a file to
`/api/spectral-workspace/video`. It had no recipient address, recipient
acceptance, or browser-to-browser delivery acknowledgement. Uploading to the
server and recording the uploader's receipt did not establish peer delivery.
The existing public VM-feed event emitter was not a file-transfer transport.

The compose action now opens a real **P2P Send / Receive** workspace rather
than marking that server upload as a completed peer transfer. The original
server media-upload API remains available to its other callers.

## Using it

1. Sign in and open `/workspace/transmission`.
2. Both sender and recipient keep this workspace open. The P2P component stays
   connected when switching its outer tabs.
3. Choose a file in Compose and select “Choose P2P Recipient / Broadcast”, or
   use the P2P file picker directly.
4. Enter the exact registered wave address for a direct offer, or deliberately
   choose broadcast to offer it to online listening accounts.
5. The recipient opens **Receive**, then accepts or declines the offer.
6. A completed incoming file has a download link. “Receiver confirmed
   completion” is shown to the sender only after receiver acknowledgement,
   not after upload, offer creation, or bytes buffered for sending.
7. Remove a completed download from memory when finished, or leave/reload the
   workspace. Incoming files are not silently saved or automatically opened.

All file formats are allowed, including MP4, audio, documents, archives and
unknown extensions. A MIME type or extension is not a safety guarantee.

## Broadcasts and mute

File broadcasts are a distinct, deliberate P2P operation, not the existing
governance/commission announcement system. This change does not weaken those
systems' mandate, consent, election, legal or privacy checks.

Broadcasts are not restricted to emergencies. They offer a file once to one
listening tab per online account other than the sender. Registered aliases
resolve to an account rather than multiplying deliveries. Offline accounts
and closed browsers cannot receive the offer. This is not a persistent inbox.

**Broadcast reception** can be disabled independently for each account; the
preference is stored on the server and survives reloads. Saving a mute cancels
pending and active broadcast transfers for that recipient. Directly addressed
offers remain available and still require acceptance. There is no emergency
override of mute or acceptance. Already-delivered data cannot be recalled.

The `/streaming` link opens our separate existing LIVE camera-streaming
feature. Offering an MP4 file is not the same as broadcasting a live camera,
and this feature does not claim to alert every address to an active live room.
It is not a guaranteed disaster-warning service.

## Actual transport and safeguards

- `/ws/p2p-files` carries authenticated offers, SDP/ICE negotiation and status
  only. File bytes use reliable, ordered WebRTC data channels, encrypted by
  WebRTC's DTLS transport.
- Signaling uses the existing HttpOnly session cookie and same-origin browser
  checks, plus the shared session lifecycle guard. Session expiry, logout and
  revocation close signaling, cancel pending transfers and cause our client
  to close active peer connections.
- Registered-owner wave-address resolution is reused without moving funds.
  Ambiguous/unregistered destinations fail rather than guessing an owner.
- Only the two assigned sockets can negotiate a transfer; only its receiver
  can accept, decline or acknowledge receipt. Client-provided sender fields
  cannot replace authenticated identity.
- Receivers explicitly accept before negotiation. Packet sizes and the exact
  declared byte count are checked; incremental SHA-256 verification must pass
  before a download link is created.
- An acknowledgement is the recipient software's claim of completed receipt,
  not independent proof of human viewing or a durable ledger record.
- Malformed, binary, oversized and excessive signaling frames fail safely.
  Database/resolver exception details are not returned to participants.
- Preferences are authenticated, account-scoped, no-store API calls protected
  by the existing cookie mutation-origin checks.

## Practical limits

There is no file-type allowlist or purpose-specific restriction, but there
are necessary operational limits:

- 256 MiB per file and a combined 256 MiB of active/completed incoming files
  retained by the workspace. Remove finished downloads to free that budget.
- Up to four negotiated transfers per browser at once.
- At most 32 pending incoming offers per account and 128 pending outgoing
  transfers per sender; a capacity-limited broadcast explicitly reports that
  it was partial.
- Ten new offers per minute per signaling connection; bounded signaling work.
- Unaccepted offers expire after two minutes; accepted transfers after thirty
  minutes. A stalled peer connection has a sixty-second inactivity deadline.
- Progress/history are local to the open workspace. Files are not persisted
  by the server for offline retrieval, resume, or store-and-forward delivery.
- Current ICE configuration provides STUN, not a managed TURN relay.
  Restrictive mobile/carrier/firewall networks may fail to connect. Such
  failures are reported rather than disguised as successful delivery.

## Verification

The completed change passed TypeScript and the full application build with
4,432 passing tests and three opt-in tests skipped. The opt-in P2P browser case
was then run explicitly and passed. Bundle-size, preload and server artifact
checks passed. The application restarted without startup errors; the unsigned
phone-sized route correctly required sign-in. Real signed-in account journeys
were not used; the component's signed-in interactions were verified only in
the isolated synthetic-identity browser fixture described below.

Isolated real local WebSocket tests cover recipient routing, spoofed sender
fields, third-party access, acceptance, mute, cancellation, offline/unknown
addresses, empty-address rejection, file-size bounds, arbitrary formats and
session revocation. Preference-handler tests verify account scope,
save/read/unmute and explicit failure reporting. Byte-assembly tests check
exact binary contents, empty files, truncation, corruption and oversize chunks.

The opt-in Chromium test bundles the actual component, hook and transfer
engine into an isolated fixture, with synthetic identities instead of real
accounts. It transfers an 8 MiB MP4-named binary sample between independent
browser contexts, downloads it and compares its exact SHA-256. It also tests
broadcast delivery, muted exclusion, decline and mute retention after reload;
the receiver uses a 390-pixel phone viewport. This is not a video-codec test,
Safari/physical-phone evidence, or proof of connectivity across real carrier
networks. No real credentials or funds are used.

Run that test with:

```sh
WNSP_P2P_BROWSER_TEST=1 WNSP_PUBLISH_BUILD=1 \
DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:1/fixture \
node_modules/.bin/node node_modules/vitest/vitest.mjs run \
  --project server server/p2p-files.browser.test.ts
```
