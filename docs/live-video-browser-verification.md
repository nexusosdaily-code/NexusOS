> **Physical-test update — 29 October 2026:** Subsequent participant-reported
> private video-call tests passed on Samsung/iPhone in both reported directions,
> iPhone/iPad over an iPad hotspot, and iPad Wi-Fi to iPhone mobile data.
> See [Passed physical private video-call tests](live-private-call-field-tests.md)
> for evidence, network setups and limitations. Statements below about physical
> tests not yet being verified describe the earlier implementation-test stage;
> they are not the current overall field-test status. Earlier failures remain
> part of the record. Private-call audio was not independently verified.

# Isolated live-video browser verification

## Reproduce

Run `npm run test:browser-live-video` with the existing dependencies and
`/repl/tools/bin/chromium` available. The dedicated Vitest configuration runs
20 browser checks; ordinary test runs leave this opt-in suite skipped.
There is no need to run the application, sign in, install credentials, connect
to PostgreSQL, or enable payments.

The suite creates a temporary loopback HTTP/WebSocket server on an ephemeral
port, bundles the actual streaming page and `VideoStreaming` component, and
launches **two independent headless Chromium processes**. Extra isolated
contexts represent outsiders. Synthetic HTTP-only cookies, synthetic session
rows and in-memory stream/guest records exist only inside the test process.
There is **no authentication bypass or test route in the application**.
Unknown HTTP/API requests and cross-origin page requests fail the test.
The balance endpoint returns a synthetic zero; no wallet operation is used.

The server fixture executes the actual signaling and streaming HTTP route
blocks extracted from `server/routes.ts`, with the production
`SessionSockets`, `browserSocketToken`, `canViewStream` and
`watchPrivateStream` implementations. Extraction fails explicitly if its
route boundaries disappear. Only storage, HTTP identity and audit persistence
are substituted; creation request validation uses the actual shared schema and
validation middleware, with rate limiting allowed in the fixture. Real
PostgreSQL guest persistence/ACL coverage remains in
the separate commerce integration suite; this is not another database test.
Public discovery here tests the page/HTTP contract over synthetic storage,
not the SQL filtering implementation.

## Observed passing checks

- Public and private channels created through the actual HTTP creation handler
  begin pending and cannot be joined or discovered. The owner URL flow captures
  media first, then successfully calls `/start` before signaling or showing LIVE.
  Discovery/join reflect the updated state and the second browser receives real
  frames. A failed server start stops capture, leaves no peer/socket/timer,
  keeps the channel pending, displays an error, and permits a successful retry.
- An owner opening their stream URL gets broadcast controls; an invited
  viewer does not get the owner settings/start controls. Nonowners cannot
  start/end the stream by HTTP or claim the broadcaster WebSocket role.
- Public streams appear in discovery and deliver real RTC media to an
  authenticated user with no invitation. Private streams do not appear;
  outsiders receive HTTP 403 for metadata/join and a closed signaling socket,
  without an RTC peer.
- Chromium fake camera/microphone devices produce real MediaStream tracks,
  SDP/ICE negotiation and RTP transport between the two browser processes.
  A native `getDisplayMedia` capture of the fixture tab also crosses that
  transport. This is not a mocked RTCPeerConnection or fabricated SDP.
- Playback is established only after the recipient's native inbound RTP stats
  show at least eight decoded video frames and its video element has presented
  at least five more frames.
- Removing an invitation with immediate notification, revoking the recipient's
  session, removing the invitation without notification (five-second ACL
  sweep), and an ACL-read failure all close the recipient peer and the owner's
  corresponding peer. The video attachment is cleared, the viewer heartbeat
  is removed, and the viewer registration is cleaned up.
- After closure and a short queued-callback settling interval, video frame
  presentation remains unchanged over a real 1.2-second observation window.
  Rejoin fails after grant/session revocation. The owner's capture remains
  live for other viewers until the owner explicitly ends it.
- Viewer leave uses `/leave`, not the owner-only `/end`, and closes that
  recipient's media without stopping the owner's capture.
- Owner end, abrupt signaling disconnect, component unmount and screen-capture
  end close both peers and stop further presented frames. Native camera/screen
  tracks end, native recorders become inactive, and duration/heartbeat intervals
  are cleared. Audio/video controls change native track enablement.
- Native camera permission denial displays a useful error without creating
  a socket, peer or duration interval. Screen denial is enforced using a browser
  `Permissions-Policy: display-capture=()` response and also leaves no resources.
- A real camera result deliberately delayed until after component unmount is
  stopped immediately upon resolution, without opening signaling or timers.

For the screen-stop check, the test stops the native captured track and
dispatches the browser-style `ended` event: `track.stop()` alone deliberately
does not dispatch it. This verifies application handling, not a click on the
browser's operating-system screen-sharing toolbar.

For native camera-denial checks, Chromium is launched without the fake-media
UI auto-approval flag. The isolated browser context clears its permissions and
grants an empty list for the fixture origin. Fake UI auto-approval would
otherwise override denial, and a CDP override without the isolated context ID
can incorrectly target the default context. Screen denial uses the
fixture-only display-capture Permissions-Policy rather than replacing
getDisplayMedia.

## Limits

- **Real-device Safari/iOS remains unverified.** Headless Linux Chromium
  and fake devices are not Safari, a real mobile camera/microphone, or a mobile
  screen-sharing permission test.
- **TURN is absent.** Production uses STUN only. Local successful host-candidate
  negotiation does not establish reachability across restrictive NATs, corporate
  firewalls, cellular networks, or background/suspended mobile sessions.
- **Emergency delivery is not guaranteed.** These checks do not establish
  delivery to every wallet, offline/background notifications, universal
  availability, or proof that a person watched a broadcast.
- Revocation verifies the supported client closes established RTC media. It
  cannot erase already received/recorded media or force a modified hostile
  recipient to delete it. A failed cross-process ACL check is detected on the
  periodic sweep, not instantaneously.

## Safari-to-Android investigation — 2026-10-28

**The physical Safari failure is unresolved.** The reported iPad/iPhone Safari
sender captured locally, while Samsung Chrome showed connection failure with
zero decoded frames and zero received KB. The user subsequently confirmed
visible video and audible voice/TV from iPhone Chrome to Samsung Chrome on the
same Wi-Fi. The app names alone do not establish different browser engines.
Neither observation identifies an ICE, SDP, codec or relay root cause.

No physical Apple/Samsung device or remote hardware session was available in
this development environment. No Safari hardware retest was performed.
Public guide/SEO compatibility claims must not be upgraded on the basis of
the following Chromium-only checks.

### Reproduced software defect and correction

Previously, one rejected `addIceCandidate` call aborted the queued-candidate
flush before the receiver created its answer. A rejection after SDP also put
the receiver into a failed playback state even when other candidates worked.
The new native-browser regression failed against the previous implementation.
Individual candidate rejections are now counted and displayed while remaining
candidates and SDP negotiation continue. SDP errors themselves still fail
negotiation; this does not manufacture a working route when none exists.

The regression sends a deliberately invalid remote candidate before each
offer/answer over the actual isolated signaling routes. Both native peers
record one rejection, video is decoded and presented, audio RTP arrives after
enabling sound, and subsequent invitation revocation stops further frames.
Separate component tests cover both queued and post-offer rejection and access
closure while `setRemoteDescription` is pending. These synthetic failures are
**not evidence that the original Safari devices rejected a candidate**.

A second native-browser check restricts the sender's codec preferences to
H.264 using the native transceiver API, without rewriting SDP. The independent
receiver decodes/presents frames, reports H.264, and the sender reports stable
SDP and connected DTLS. This establishes H.264 support in this Chromium fixture
only, not Safari-to-Android compatibility or a fix for the physical incident.
The original normal-autoplay, waiting-receiver and revocation checks also pass.

### Evidence needed from the next physical test

Use different existing approved accounts for sender and receiver. Opening a
stream as its owner currently selects broadcaster controls, not viewer mode.
The signaling peer directory also selects a latest connection per account;
two devices sharing the owner's address are not an independent receiver test.
Invite the receiver account to the private stream. Do not treat this account
role limitation as evidence about Safari's media engine or as the established
cause of the earlier Samsung failure.

Keep the app foregrounded on both devices. Record OS/browser versions, device
models, camera source, and whether the network is the same Wi-Fi. After
starting Safari capture and joining from Samsung, capture the diagnostic text
on **both ends** after approximately 20 seconds. The text contains SDP progress,
ICE connection/gathering states, local/accepted/rejected candidate counts,
selected-pair success, DTLS, negotiated codec names and sent/decoded video
frames/KB; it deliberately excludes addresses, raw SDP and account identifiers.
Do not share auth cookies, tokens or unredacted SDP/network dumps.

- A sender still awaiting an answer versus a receiver failing while applying
  the offer points to different SDP/signaling stages; inspect both ends.
- Stable SDP with ICE stuck checking/failed and no selected pair indicates
  transport reachability is not established. It does **not** prove TURN is the
  cause or authorise buying a relay.
- A selected pair with DTLS failing is distinct from ICE failure.
- Connected DTLS with sent frames but no decoded frames requires examination
  of negotiated media/decoding; decoded frames without presented video requires
  playback investigation. Merely reporting a codec is not decoded-frame proof.
- If this attempt works, confirm visible motion and audible speech on the
  physical receiver before recording a new compatibility result.

No relay was provisioned, no codec was forced in application code, and no
server session/invitation authorisation rule was relaxed.

## Related regression checks

- `npm run check:types`
- `npm run test:client -- client/src/components/video-stream-revocation.test.tsx client/src/components/video-stream-negotiation.test.tsx client/src/lib/live-media-diagnostics.test.ts client/src/components/p2p-market-safety.test.tsx`
- `node_modules/.bin/node node_modules/vitest/vitest.mjs run --project server server/session-sockets.routes.test.ts`
- `node_modules/.bin/node node_modules/vitest/vitest.mjs run --config vitest.p2p-security.config.ts`
