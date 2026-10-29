# Passed physical live video-and-audio call tests — 29 October 2026

All four physical-device tests passed with live video and audio, confirmed by
the participants. Privately supplied screenshots and recordings support these
real-device results. They are not
independent certification or simulated-browser results. The public website
summary is on `/live-guide`, under **Passed live video-and-audio call tests**.

| Reported test direction | Network setup | Result | Supporting evidence |
| --- | --- | --- | --- |
| Samsung Chrome → iPhone Chrome | Samsung on mobile data; iPhone on Wi-Fi | **PASS — live video and audio, participant-confirmed.** | Screenshot and recording samples showed a connected private call with remote video and local preview. |
| iPhone Chrome → Samsung Chrome | iPhone on Wi-Fi; Samsung on mobile data | **PASS — live video and audio, participant-confirmed.** | Screenshot and recording samples showed received broadcast video and a connected private call with remote video and local preview. |
| iPhone → iPad | iPad provided a hotspot to the iPhone | **PASS — live video and audio, participant-confirmed.** | Screenshot and recording samples showed a connected private call with remote video and local preview. Browser pairing was not independently established. |
| iPad → iPhone | iPad on Wi-Fi; iPhone on mobile data | **PASS — live video and audio, participant-confirmed.** | Screenshot showed the completed connected call with remote video and local preview. Recording samples showed broadcasting and private-call setup. Browser pairing was not independently established. |

## What these passes establish

- The tested configurations achieved live private video and audio, as confirmed
  by the participants—not just invitations, local capture or room membership.
  Screenshots show remote video and local preview.
- Successful Samsung/iPhone tests now exist in both reported directions across
  Wi-Fi/mobile-data endpoints. Arrows describe the reported test direction;
  they are not separate measurements of private-call media in each direction.
- The Apple hotspot test and the separate Wi-Fi/mobile-data Apple test are
  distinct configurations; neither should be substituted for the other.

## Scope of verification

- Audio is confirmed by the participants' physical tests. The agent's separate
  review sampled visuals rather than independently listening to the recordings;
  this is a review-method distinction, not an audio failure or incomplete test.
- Front/rear camera switching and the selected network route were not separately
  established. **Enable call sound** can require an explicit playback tap;
  its presence is not evidence that audio failed.
- Broadcast frame/KB counters describe the separate broadcast connection,
  not private-call inbound/outbound media statistics.
- Visual sampling is supporting evidence, not an end-to-end measurement of
  uninterrupted playback for an entire clip. A black sampled frame alone does
  not establish a recurring fault or overturn the participants' passed result.
- The earlier iPhone Safari → iPad Safari broadcast pass remains valid, but does
  not identify the browser pairing for the newer Apple private-call tests.
- A successful direct WebRTC session does not guarantee every future session,
  device, browser, carrier, background connection or emergency delivery.

## Historical connection attempt — not the current test status

An earlier iPhone Chrome → Samsung Chrome connection attempt failed before a
network route was established; subsequent retests passed with live video and
audio. The earlier Safari-to-Samsung failed attempt is also historical; its
cause was not established. Retaining those observations does not establish
a current recurring fault, withdraw later passes or classify audio as failed.

## Evidence privacy

Only this anonymised summary is authorised for disclosure. Do not publish the
recordings, extracted frames, participant images, names, account identifiers,
wave addresses, private conversation or attachment filenames in this report.
A working private call is not proof of operator-inaccessible confidentiality,
absence of retained metadata, or zero tracking. Existing privacy notices and
the unfinished encryption/client-trust review still apply.

For historical browser tests, implementation checks and earlier limitations,
see [Live video browser verification](live-video-browser-verification.md).
