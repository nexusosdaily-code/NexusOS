import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { ArrowLeft, ArrowRight, AudioLines, CircleHelp, Radio, Signal, ShieldAlert, Smartphone, Video } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Prepare two accounts",
    body: "Sign in on the broadcaster and receiver using separate accounts. Each account needs a registered wave address. For the confirmed setup below, the sender used an iPhone running Chrome and the receiver used Samsung Chrome on the same Wi-Fi.",
  },
  {
    number: "02",
    title: "Create a private room and invite first",
    body: "On the sender, open Wave Vault → Live broadcasts or P2P → Start a stream. In Spectral Broadcast, choose the Go Live tab, enter a title, choose Camera (not Screen or Both for the first mobile test), and keep the room private. Use Browse directory or enter the recipient’s exact registered wave address. Create the room and finish its invitations before opening capture.",
  },
  {
    number: "03",
    title: "Start capture in the foreground",
    body: "Select Go Live, allow the browser to use the camera and microphone, and keep the sender page in the foreground. A local preview only confirms capture on the sender; it does not prove that a receiver is getting media.",
  },
  {
    number: "04",
    title: "Join from the receiver",
    body: "On the other account, open Spectral Broadcast → Browse Live. Look under Addressed to you; an invitation can take about 10 seconds to appear. Select Join live when the room is live. Video starts muted by default: choose Enable sound to hear audio, and choose Play video if the browser needs a playback gesture.",
  },
  {
    number: "05",
    title: "Verify delivery, then end",
    body: "Confirm the receiver says connected and that decoded video frames and received KB are increasing. Room membership or a connected label by itself is not proof of media delivery. End the broadcast when finished. To remove access, manage and revoke live invitations through P2P manage invites.",
  },
];

export default function LiveGuidePage() {
  usePageMeta({
    title: "Live streaming guide | NexusOS",
    description: "A practical, device-tested guide to private Spectral Broadcast video and audio, with compatibility limits and troubleshooting.",
    canonical: "/live-guide",
  });

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#eeede5] text-[#25332f]" data-testid="live-guide">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-7 sm:pt-8">
        <header className="flex items-center justify-between border-b border-[#d7d5ca] pb-4">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#52685d] transition hover:bg-[#e4e5da] hover:text-[#155b50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#287c70]" aria-label="Back to NexusOS home">
            <ArrowLeft className="h-4 w-4" /> NexusOS
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#b8c9b9] bg-[#e6eee3] px-3 py-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#426d5d]">
            <Radio className="h-3.5 w-3.5" /> Spectral Broadcast
          </span>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[28px] border border-[#ced6c8] bg-[#dae3d4] p-5 sm:mt-8 sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-[#92aa98]/45 sm:h-96 sm:w-96" />
          <div aria-hidden="true" className="pointer-events-none absolute right-10 top-14 h-32 w-32 rounded-full border border-[#92aa98]/35" />
          <div className="relative max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#527767]">Field guide · updated 28 October 2026</p>
            <h1 className="mt-4 font-[var(--font-display)] text-4xl font-semibold leading-[1.02] tracking-[-.045em] text-[#244038] sm:text-6xl">A real live test,<br />step by step.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#566b5d] sm:text-base">
              This is a practical starting point for sending live camera video and sound to another signed-in account. The confirmed device results are specific, not a promise of universal browser or network support.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/streaming" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155b50] px-4 text-sm font-semibold text-[#f4f3e8] transition hover:bg-[#0e493f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#287c70] focus-visible:ring-offset-2">
                Open Spectral Broadcast <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b9cbbb] bg-[#f4f4ea]/70 px-4 text-xs font-medium text-[#52685d]">
                <Smartphone className="h-4 w-4" /> iPhone Chrome to Samsung Chrome
              </span>
              <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b9cbbb] bg-[#f4f4ea]/70 px-4 text-xs font-medium text-[#52685d]">
                <Smartphone className="h-4 w-4" /> iPhone Safari to iPad Safari
              </span>
            </div>
          </div>
        </section>

        <section className="mt-7 grid gap-3 sm:grid-cols-[1.2fr_.8fr]" aria-label="Confirmed device result">
          <article className="rounded-2xl border border-[#aac7b2] bg-[#e4efe4] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[#327057]"><Signal className="h-4 w-4" /><h2 className="text-xs font-bold uppercase tracking-[.14em]">Confirmed on 28 October 2026</h2></div>
            <p className="mt-3 text-sm leading-relaxed text-[#405b4b]">
              The user confirmed an iPhone broadcaster using Chrome and a Samsung receiver using Chrome, both on the same Wi-Fi. The receiver got actual live video and heard both the broadcaster’s voice and TV sound. This confirms that specific direction and setup only.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#405b4b]">
              The user also confirmed live broadcasting from iPhone Safari to iPad Safari. Audio and front/rear camera switching were not separately reported for this test.
            </p>
          </article>
          <aside className="rounded-2xl border border-[#e0c9a7] bg-[#f5eedf] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[#88673b]"><CircleHelp className="h-4 w-4" /><h2 className="text-xs font-bold uppercase tracking-[.14em]">Not a compatibility promise</h2></div>
            <p className="mt-3 text-xs leading-relaxed text-[#766345]">Safari-to-Safari worked in the reported iPhone-to-iPad test. The earlier Safari broadcaster to Samsung Chrome failure remains unresolved; it is not evidence that all Safari combinations fail.</p>
          </aside>
        </section>

        <section className="mt-9" aria-labelledby="steps-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#718078]">The sequence</p><h2 id="steps-title" className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[#2b3934] sm:text-3xl">Set up, invite, receive.</h2></div>
            <Video className="mb-1 hidden h-6 w-6 text-[#6f927c] sm:block" />
          </div>
          <ol className="space-y-3">
            {steps.map(step => (
              <li key={step.number} className="grid gap-3 rounded-2xl border border-[#d6d4c9] bg-[#f8f7f1] p-4 sm:grid-cols-[52px_minmax(0,1fr)] sm:gap-5 sm:p-5">
                <span className="font-mono text-sm font-semibold text-[#59816d]">{step.number}</span>
                <div><h3 className="font-[var(--font-display)] text-lg font-semibold text-[#2d4038]">{step.title}</h3><p className="mt-1.5 text-sm leading-relaxed text-[#68756b]">{step.body}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-9 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-[#d6d4c9] bg-[#f8f7f1] p-5 sm:p-6">
            <h2 className="font-[var(--font-display)] text-xl font-semibold text-[#2d4038]">Choose audience deliberately</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#68756b]">
              <p><strong className="text-[#42584c]">Private</strong> rooms require live invitations to registered wave addresses. Add the intended viewers before capture starts; an invitation is not the same thing as joining.</p>
              <p><strong className="text-[#42584c]">Public</strong> is a separate visibility choice. Use it only when you intend the room to be publicly discoverable.</p>
              <p>Wave Vault file permissions and live-room invitations are separate. Granting file access does not invite someone to a live room, and broadcasts are not automatically recorded.</p>
            </div>
          </article>
          <article className="rounded-2xl border border-[#d6d4c9] bg-[#f8f7f1] p-5 sm:p-6">
            <div className="flex items-center gap-2"><AudioLines className="h-4 w-4 text-[#59816d]" /><h2 className="font-[var(--font-display)] text-xl font-semibold text-[#2d4038]">What can still fail</h2></div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#68756b]">
              <li>This setup uses direct WebRTC media and has no TURN relay. A direct connection can fail, including on the same Wi-Fi.</li>
              <li>There is no guaranteed emergency delivery or background delivery. Keep the broadcaster in the foreground.</li>
              <li>The limit of 50 invitations is not a guarantee of 50 simultaneous video viewers. Actual capacity depends on device and network resources.</li>
              <li>Mobile screen capture has not been verified; start with Camera.</li>
            </ul>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-[#c9d4c7] bg-[#e7ece3] p-5 sm:p-6" aria-labelledby="camera-switch-title">
          <div className="flex items-start gap-3">
            <Video className="mt-0.5 h-5 w-5 shrink-0 text-[#59816d]" aria-hidden="true" />
            <div>
              <h2 id="camera-switch-title" className="font-[var(--font-display)] text-lg font-semibold text-[#394d40]">Switching cameras while live</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#68756b]">
                For camera-only broadcasts, use the broadcaster toolbar’s <strong className="text-[#42584c]">Switch camera</strong> control to change cameras. The picture may pause briefly while the camera changes; the microphone and room stay active. Switching is unavailable while recording, or when the broadcast mode is Screen or Both.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#766345]">
                Physical camera switching has not been verified on devices. Successful Safari-to-Safari broadcasting alone does not verify camera switching.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#c9d4c7] bg-[#e7ece3] p-5 sm:p-6" aria-label="Known and unresolved results">
          <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#8a7048]" /><div>
            <h2 className="font-[var(--font-display)] text-lg font-semibold text-[#394d40]">Known result versus open questions</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#68756b]">Confirmed: iPhone Chrome to Samsung Chrome on the same Wi-Fi, with live video and audible voice and TV sound; and user-reported live broadcasting from iPhone Safari to iPad Safari. Unresolved: the earlier Safari-to-Samsung failure cause, reverse directions, and connections across different networks. Audio and camera switching were not separately confirmed for the Safari-to-Safari test. No cause is assumed for the unresolved cases.</p>
          </div></div>
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-[#d7d5ca] pt-5 text-xs text-[#788078] sm:flex-row sm:items-center sm:justify-between">
          <p>Room membership alone does not establish that media reached a viewer.</p>
          <Link href="/streaming" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-3 font-semibold text-[#286354] transition hover:bg-[#e3e6dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#287c70] sm:self-auto">Go to Live broadcasts <ArrowRight className="h-3.5 w-3.5" /></Link>
        </footer>
      </div>
    </main>
  );
}
