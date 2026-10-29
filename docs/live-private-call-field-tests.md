# Passed physical private video-call tests — 29 October 2026

These results are participant-reported passes on real devices, supported by
privately supplied screenshots and visually sampled recordings. They are not
independent certification or simulated-browser results. The public website
summary is on `/live-guide`, under **Passed private video-call tests**.

| Reported test direction | Network setup | Result and evidence |
| --- | --- | --- |
| Samsung Chrome → iPhone Chrome | Samsung on mobile data; iPhone on Wi-Fi | **PASS — reported physical test.** Screenshot and recording samples showed a connected private call with remote video and local preview. |
| iPhone Chrome → Samsung Chrome | iPhone on Wi-Fi; Samsung on mobile data | **PASS — reported physical retest.** Screenshot and recording samples showed received broadcast video and a connected private call with remote video and local preview. |
| iPhone → iPad | iPad provided a hotspot to the iPhone | **PASS — reported physical test.** Screenshot and recording samples showed a connected private call with remote video and local preview. Browser pairing was not independently established. |
| iPad → iPhone | iPad on Wi-Fi; iPhone on mobile data | **PASS — reported physical test.** Screenshot showed the completed connected call with remote video and local preview. Recording samples showed broadcasting and private-call setup. Browser pairing was not independently established. |

## What these passes establish

- The tested configurations achieved private video calling, not just invitations,
  local capture or room membership. Screenshots show remote video and local preview.
- Successful Samsung/iPhone tests now exist in both reported directions across
  Wi-Fi/mobile-data endpoints. Arrows describe the reported test direction;
  they are not separate measurements of private-call media in each direction.
- The Apple hotspot test and the separate Wi-Fi/mobile-data Apple test are
  distinct configurations; neither should be substituted for the other.

## Limits and previous failures

- Audio, front/rear camera switching and the selected network route were not
  independently verified for these private-call tests. The UI still offered
  **Enable call sound** in the evidence; playback can require an explicit tap.
- Broadcast frame/KB counters describe the separate broadcast connection,
  not private-call inbound/outbound media statistics.
- Visual sampling does not establish uninterrupted delivery for an entire clip.
  One late sample in the reverse Samsung/iPhone retest had black remote panes.
- An earlier iPhone Chrome → Samsung Chrome attempt failed with no selected ICE
  pair and DTLS not connected. Preserve that failure alongside the later pass;
  its cause was not established by these tests.
- The earlier Safari-to-Samsung failure cause remains unresolved. The earlier
  iPhone Safari → iPad Safari broadcast pass remains valid, but does not identify
  the browser pairing for the newer Apple private-call tests.
- A successful direct WebRTC session does not guarantee every future session,
  device, browser, carrier, background connection or emergency delivery.

## Evidence privacy

Only this anonymised summary is authorised for disclosure. Do not publish the
recordings, extracted frames, participant images, names, account identifiers,
wave addresses, private conversation or attachment filenames in this report.
A working private call is not proof of operator-inaccessible confidentiality,
absence of retained metadata, or zero tracking. Existing privacy notices and
the unfinished encryption/client-trust review still apply.

For historical browser tests, implementation checks and earlier limitations,
see [Live video browser verification](live-video-browser-verification.md).
