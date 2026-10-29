const passedTests = [
  {
    setup: "Samsung Chrome → iPhone Chrome",
    network: "Samsung on mobile data; iPhone on Wi-Fi.",
    evidence: "Private video call reported passed. Screenshot and recording samples showed a connected private call with remote video and local preview.",
  },
  {
    setup: "iPhone Chrome → Samsung Chrome",
    network: "iPhone on Wi-Fi; Samsung on mobile data.",
    evidence: "Reverse-direction retest reported passed for broadcast viewing and private video calling. Screenshot and recording samples showed received video and a connected private call.",
  },
  {
    setup: "iPhone → iPad",
    network: "iPad provided a hotspot to the iPhone.",
    evidence: "Private video call reported passed. Screenshot and recording samples showed a connected private call with remote video and local preview. Browser pairing was not independently established for this test.",
  },
  {
    setup: "iPad → iPhone",
    network: "iPad on Wi-Fi; iPhone on mobile data.",
    evidence: "Private video call reported passed. The screenshot showed the completed connected call with remote video and local preview; recording samples showed broadcasting and private-call setup. Browser pairing was not independently established for this test.",
  },
];

export function LiveDeviceTestDisclosure() {
  return (
    <section className="mt-7 rounded-2xl border border-[#aac7b2] bg-[#e4efe4] p-5 text-[#405b4b] sm:p-6" aria-labelledby="passed-private-tests-title" data-testid="passed-private-device-tests">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#527767]">Physical-device field results · 29 October 2026</p>
      <h2 id="passed-private-tests-title" className="mt-2 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[#2d4038]">Passed private video-call tests</h2>
      <p className="mt-3 text-sm leading-relaxed">
        These are participant-reported passes on real devices, supported by privately supplied screenshots and visually sampled recordings—not simulated-browser results or an independent certification. Arrows describe the reported test direction, not separately measured media flow in each direction.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {passedTests.map(test => (
          <li key={test.setup} className="min-w-0 rounded-xl border border-[#b9cbbb] bg-[#f8f7f1] p-4">
            <span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#327057]">PASS · reported physical test</span>
            <h3 className="mt-2 text-sm font-semibold">{test.setup}</h3>
            <p className="mt-2 text-sm leading-relaxed">{test.network}</p>
            <p className="mt-2 text-xs leading-relaxed text-[#68756b]">{test.evidence}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed">
        This confirms video in the tested setups, not uninterrupted delivery or every browser, carrier or network. Audio, front/rear camera switching and the selected network route were not independently verified for these private-call tests. Choose Enable call sound if playback requires a tap. Broadcast frame/KB counters do not measure private-call media delivery.
      </p>
      <p className="mt-3 text-xs leading-relaxed">
        An earlier iPhone-to-Samsung session failed before a network route was established; the later successful retest does not identify or erase that intermittent failure. The earlier Safari-to-Samsung failure cause remains unresolved. Private footage, participant images, names, addresses and other personal details are not included in this disclosure. A working call is not proof of operator-inaccessible confidentiality or zero tracking; see the privacy notice below.
      </p>
    </section>
  );
}
