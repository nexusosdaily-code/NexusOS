# P2P live access and sats commerce

## Release status

This is an implemented development feature, **not clearance for real-money use**.
New P2P purchases and tips deliberately return HTTP 423 without debiting funds.
The page displays the audit hold and disables those controls. The server-side
hold remains authoritative even if a modified client ignores the interface.

The wider shared-wallet audit and legacy hardening are documented in
[shared-sats-writer-audit.md](shared-sats-writer-audit.md). Legacy mutation
boundaries, invoice-event claims, durable withdrawal reservations and guarded
arithmetic now protect holds. Unprovable aggregate/Rune credits and unrestricted
corrections are explicitly paused rather than assigned invented backing.
The record-capacity migration has only been tested in disposable PostgreSQL;
confirm the target schema and review the disclosed operational restrictions
before clearing `P2P_PAYMENTS_RELEASED`. Do not test against funded accounts.

## Available development flows

- `/p2p` has public discovery, account-specific listings/orders, live discovery
  and the existing P2P file exchange. Account-sensitive queries are keyed by
  user ID. Sign-in is required for account activity and live media.
- Listings cover files, services, goods and advertising. Sellers set an integer
  sats price, with public visibility or specific registered wave-address
  recipients. Listing cancellation is seller-only and cannot cancel a funded
  order. A listing represents one sale; create another listing for another sale.
- Public streams appear in discovery. Private streams require an invitation
  from their owner to a registered wave address. Only the owner can add, view
  or revoke the guest list. Neither a copied private URL nor an invitation
  makes a viewer the broadcaster.
- Revocation closes the affected signaling socket immediately in the same
  process; private guest authorization is also rechecked every five seconds
  across processes. Database-check failures fail closed. The client closes
  established RTC peers and clears video when signaling closes. Existing server
  viewer-departure notifications also tell the broadcaster to close that peer.
- Owners opening their own stream URL receive broadcast controls, not viewer
  controls. Camera/screen capture still needs browser permission.
- Creating, joining and maintaining a stream no longer automatically charge
  NXT. Tips are separate, explicitly confirmed sats transfers. New tips remain
  paused by the audit gate.
- Existing P2P file acceptance, recipient acknowledgement, download, broadcast
  mute and format-neutral transfer remain separate from payment acceptance.
  See `p2p-file-exchange.md` for their resource bounds and test evidence.

## Spectral Broadcast recipient testing

Visitors can read the public **Live streaming guide** at `/live-guide` without
signing in. It is linked from the public homepage, signed-in quick actions,
Spectral Broadcast, P2P and Wave Vault. The guide describes the device-confirmed
Chrome and iPhone Safari → iPad Safari results separately from the unresolved
Safari-to-Samsung and network cases.

Use the existing **Live broadcasts** entry in Wave Vault, or the live-room
controls in P2P, to open `/streaming`. Creation is shared through
`/streaming?create=private`: choose a title and camera/screen source, select
one or more recipients with **Browse directory** or exact wave-address entry,
and explicitly create the room. Private invitations are applied before the
capture controls open. A failed invitation leaves a pending private room and
offers retry rather than silently starting it or creating a duplicate room.
Audience selection is bounded to 50 invitees; browser/network resources can
support fewer simultaneous video peers.

Invited accounts can open **Spectral Broadcast → Browse** to see their pending
or live rooms. Pending rooms say they are waiting; **Join live** is an explicit
viewer action once the broadcaster starts. Incoming discovery refreshes every
10 seconds while the page is open and on foreground/reconnect. Background mobile
pages may be suspended. The broadcaster can manage invitations through P2P.
Private room lists and audience responses use `no-store` and are excluded from
routine response-body logging. Public broadcasting is a separate deliberate
choice, not an effect of adding recipients.

For a physical-device check:
1. Sign in as the sender on one device and the recipient on another.
2. From Wave Vault, open **Live broadcasts** and create a private room with
   the recipient selected. This does not change any stored-file permissions.
3. Start the camera, grant browser permissions, and keep the sender foreground.
4. On the receiver, open Spectral Broadcast and wait for the invitation.
   Select **Join live**; video starts muted to respect mobile autoplay rules.
   Confirm moving video, then tap **Enable sound** to check audio if microphone
   access was granted. **Play video** is available if playback needs a gesture.
   A room listing alone is not evidence of media delivery. The viewer's LIVE
   badge is only shown after playback begins, not merely on a signaling message.
   The receiver displays its connection state, decoded video frames and received
   video KB. If the screen stays blank, capture that diagnostic text; it does not
   contain network addresses, SDP or private recipient identities. After 20 seconds
   without playback the page explains the failure rather than remaining blank.
5. End the broadcast and confirm playback stops. Repeat with devices reversed.
   Separately test invitation removal and an uninvited account being denied.

In camera-only mode, the broadcaster's **Switch camera** button replaces the
outgoing video without reopening the room or recapturing the microphone. Test
front → rear → front while the receiver watches. Muted audio and disabled
video settings must remain unchanged. A brief video pause is possible. Stop
recording first; switching is unavailable while recording and in Screen/Both
mode. A failed acquisition normally leaves the original video running; on
exclusive-camera hardware the old video may need to stop before the new camera
opens, with an attempt to restore it if switching fails. If restoration fails,
the user is told to end and restart. Late acquisitions after end/unmount are
stopped. Generated-track browser tests are not physical camera-switching proof.

This is WebRTC live media, not a Wave Vault video-file transmission, automatic
recording, guaranteed emergency notification, or background push delivery.
The current media peer configuration uses STUN servers without a TURN relay;
some mobile/carrier/firewall combinations may not establish a direct media
connection. Screen capture support also varies, especially on iOS; camera
mode is the first physical-device test. A successful stored-file test does not
establish live-video compatibility on the same devices.

The 2026-10-28 physical iPad-to-Samsung test showed a local camera preview on
the iPad and a blank receiver. It is a failed live-media test, not evidence of
successful delivery. Server membership logs confirmed joins/disconnects but did
not establish the media-path cause. The subsequent compatibility fixes address
early ICE buffering, serialized SDP handling, streamless tracks, muted autoplay
and viewers waiting before broadcaster signaling starts.

Later on 2026-10-28 the user confirmed successful iPhone Chrome broadcasting
to Samsung Chrome after switching the sender from Safari, with both devices
on the same Wi-Fi. The receiver screenshot shows visible video, connected
transport, 800 decoded frames and 7,095 KB received. This verifies that tested
live-video direction; it does not establish the reason Safari failed.
The user subsequently confirmed hearing both the broadcaster's voice and the
TV through the stream, confirming live audio as well as video for this test.
The user then confirmed live broadcasting from iPhone Safari to iPad Safari
on 2026-10-28. Audio and physical camera switching were not separately reported
for this Safari test; do not infer them. The earlier Safari-to-Samsung failure,
reversed live directions and different-network connectivity still need
verification. No relay fallback has been added.

## Chosen settlement model

The founder selected **hold sats until the buyer accepts**.
This is an application-ledger hold, not an independent on-chain escrow contract,
not a Lightning HTLC, and not a trustless or guaranteed delivery service.

When the gate is enabled after review:

1. A purchase derives the price, seller and visibility from the stored listing.
   The server reserves the listing, deducts available buyer sats and records
   the hold and audit event in one SQL transaction.
2. The seller marks delivery. This is a seller statement, not proof that a file
   was received, watched, accepted or durably saved.
3. The buyer separately confirms acceptance of that exact order. Only then
   does a transaction release the held sats to the seller.
4. The seller can explicitly refund a nonterminal order. Refunds return sats
   to the buyer and cancel that listing; they do not silently relist it.
5. Either participant can record a reasoned dispute. Funds stay held until
   the buyer accepts or the seller refunds. There is **no automatic payout,
   expiry, administrator seizure or implemented third-party arbitration**.
   Disagreements can therefore leave funds held indefinitely.

The monetary operations use integer sats and guarded SQL arithmetic, lock rows,
record ledger/events atomically, and use stable purchase/tip request IDs.
Competing buyers cannot purchase the same single-sale listing. A refund and
release cannot both succeed. Failed audit writes roll back monetary writes.
Open orders are limited to 50 per participant and shown before completed
history so an older hold is not hidden by the account view's 100-row limit.
Listing, order, tip and invitation mutations also have per-user rate limits.

NXT is not spent by these P2P flows. This change does not remove unrelated
staking, token allocations or swaps. The unsafe legacy NXT marketplace checkout
is explicitly disabled with HTTP 410; historical records are preserved.
Existing on-chain asset/PSBT trading is separate. A general P2P listing does
not automatically transfer a Rune, Ordinal, NFT, ownership deed or physical item.

## Audit findings and limits

Addressed in this change:

- Private-stream viewing and signaling now enforce the guest ACL.
- Revocation stops established media rather than only updating a connection label.
- The old per-minute NXT charge is removed, along with opening/joining charges.
- The unsafe legacy NXT checkout is disabled rather than presented as delivery.
- Legacy username-based sats send/tip now use guarded debit, SQL credit and both
  ledger entries inside one transaction. Staking now guards the actual debit.
- New payment operations fail closed while the wider wallet review is incomplete.

Legacy shared-wallet audit outcome:

- Every legacy sats writer is inventoried, guarded by an explicit transaction
  or paused when ownership/event attribution cannot be established.
- A provider timeout is not proof of failure. Unknown payments remain reserved;
  blind retry/refund and historical on-chain resubmission are disabled.
- The non-destructive Rune record-capacity migration is prepared and tested,
  not applied to application data. The default P2P gate is deliberately retained.
- See the linked audit for the complete route inventory, stopped capabilities,
  compatibility requirements and isolated concurrency/rollback evidence.

Automated scanners found zero dependency vulnerabilities. Static scanning
reported a medium session-fixation candidate at the founder sign-in cookie:
manual tracing shows the cookie value comes from a fresh 32-byte cryptographic
nonce plus server HMAC after credential verification, not from the submitted
request. Request IP/user-agent are session metadata, not the session token.
This is a reviewed false-positive candidate, not a suppressed scanner result.
Privacy scanning reported the physics demo's `Energy budget: ... J` print as
financial-budget output; it is a joules measurement, not a wallet balance.
Neither interpretation is evidence that all application vulnerabilities are
resolved.

The changes do not provide TURN relay infrastructure, guaranteed emergency
delivery, browser-independent reachability, background/offline notifications,
or proof that every wallet watched a broadcast. A public webpage and an
online P2P participant are different delivery paths. No claim of end-to-end
mobile Safari live-video verification is made.

## Reproducible checks

The isolated two-browser camera/screen RTC checks, revocation evidence and
remaining Safari/TURN/delivery limits are documented in
[`live-video-browser-verification.md`](live-video-browser-verification.md).

- `npm run test:browser-live-video`
- `npm run check:types`
- `node_modules/.bin/node node_modules/vitest/vitest.mjs run --config vitest.p2p-security.config.ts`
- `npm run test:client -- client/src/components/p2p-market-safety.test.tsx client/src/components/video-stream-revocation.test.tsx`
- `npm run build` (includes the normal database-free regression suites)

The PostgreSQL checks create and destroy their own Unix-socket-only temporary
database. They never read `DATABASE_URL`, use live wallet balances or submit
external payments. Synthetic enabled-policy tests verify the monetary state
machine; a separate test verifies the default gate refuses new purchases.
The UI tests verify the visible hold, disabled new-funding controls, continued
refund access and closing an established peer when signaling access ends.
