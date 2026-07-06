import { useState } from "react";
import { Link } from "wouter";
import { Copy, Check, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text, label = "Copy answer" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
      style={done
        ? { background: "#16a34a20", color: "#4ade80", border: "1px solid #16a34a40" }
        : { background: "#f59e0b15", color: "#f59e0b", border: "1px solid #f59e0b30" }}>
      {done ? <Check size={12} /> : <Copy size={12} />}
      {done ? "Copied!" : label}
    </button>
  );
}

// ── Answer card ───────────────────────────────────────────────────────────────
function AnswerCard({ q, tag, answer }: { q: string; tag: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const preview = answer.split("\n").slice(0, 3).join("\n");

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      {/* Header */}
      <div className="p-5 space-y-2">
        <div className="flex items-start gap-3">
          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">{tag}</span>
          <p className="text-sm font-bold text-white leading-snug">{q}</p>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 pl-14">{preview}</p>
      </div>

      {/* Expanded answer */}
      {open && (
        <div className="border-t border-slate-800 bg-slate-950/40 p-5">
          <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{answer}</pre>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-800/60 flex items-center gap-3 flex-wrap">
        <CopyBtn text={answer} />
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          {open ? <><ChevronUp size={12} /> Hide preview</> : <><ChevronDown size={12} /> Preview</>}
        </button>
        <span className="ml-auto text-[10px] font-mono text-slate-700">{answer.length} chars · ~{Math.ceil(answer.split(" ").length / 200)} min read</span>
      </div>
    </div>
  );
}

// ── Quora icon ────────────────────────────────────────────────────────────────
function QuoraIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.023 20.609c-.79 1.67-2.238 3.391-4.585 3.391h-.87l.87-1.74c-3.625-.52-6.438-3.625-6.438-7.26 0-4.063 3.313-7.37 7.398-7.37 4.086 0 7.407 3.307 7.407 7.37 0 2.17-.913 4.16-2.376 5.53.14.5.375.85.617.97.46.226 1.37.018 2.15-.63l.38 1.01c-1.37 1.34-2.826 1.66-4.553.729zm-3.625-1.07c.5-.24.875-.6 1.25-1.12-.47-.24-.913-.53-1.313-.87l.84-1.49c.353.33.737.63 1.14.87.22-.55.33-1.14.33-1.78 0-2.65-1.91-4.8-4.26-4.8-2.355 0-4.265 2.15-4.265 4.8 0 2.65 1.91 4.8 4.265 4.8.75 0 1.46-.2 2.013-.41zm6.344 2.672c.96.8 2.07.96 2.81.57.5-.265.82-.7.96-1.24-2.15 0-3.92-1.72-3.92-3.84 0-.66.175-1.28.48-1.82-.39-.74-.63-1.58-.63-2.48 0-3.01 2.45-5.46 5.46-5.46s5.46 2.45 5.46 5.46-2.45 5.46-5.46 5.46c-.38 0-.75-.04-1.11-.11-.56.7-1.24 1.28-2.05 1.46z"/>
    </svg>
  );
}

// ── All five answers ──────────────────────────────────────────────────────────
const DEPLOYED_URL = "https://wnsp.io";

const ANSWERS = [
  {
    tag: "Future of internet",
    q: "What will replace the internet?",
    answer: `The honest answer is: not one thing. The internet will be replaced by a stack, and the bottom layer of that stack will be photonic.

Here is the trajectory. Silicon computers encode information as electrical signals — ones and zeros. Photonic computers encode information as light — wavelengths. The hardware transition is commercially arriving around 2032.

When it does, the entire addressing system that runs the internet — IP addresses, DNS, the whole packet-switching model — has to be rebuilt. Because those systems were designed for electrons, not photons.

One group has already published the replacement: WNSP (Wave-Navigated Spectral Protocol). Instead of assigning arbitrary IP addresses to devices, it assigns wavelengths derived directly from Maxwell's equations. Every node on the network gets a unique Ψ channel — a physical position in the electromagnetic spectrum — rather than an administrative label.

The formula is simple:

λ = 380 + (n mod 128) / 128 × 400 nm

Every character, every device, every transaction has a frequency-derived address. Fees are calculated from E=hf — higher-frequency channels cost more to use, by physics, not policy.

The code is AGPL-3.0 open source. The encoder is on npm (npm install nexusos-ce-encoder, 95 weekly downloads in its first week). The full specification is at ${DEPLOYED_URL}/protocol.

The internet will not be "replaced" by something foreign. It will evolve into infrastructure that speaks in wavelengths instead of voltages. NexusOS is writing the first draft of that infrastructure, today.`,
  },
  {
    tag: "Photonic computing",
    q: "What is photonic computing and when will it arrive?",
    answer: `Photonic computing is what happens when you replace the electrons in a processor with photons — particles of light. The short answer on timing: commercially meaningful around 2032, with research hardware available sooner.

Here is why it matters more than most people realise.

A silicon chip moves information by switching transistors — billions of times per second. Each switch dissipates heat. Heat is the wall. We have been fighting that wall for 20 years with smaller transistors, but physics has a limit.

A photonic chip moves information by selecting wavelengths of light. Light does not heat up the chip. It does not slow down over distance the way electrons do. And — crucially — many different wavelengths can travel the same waveguide simultaneously without interfering with each other. This is wavelength division multiplexing (WDM), and it means a single photonic channel can carry orders of magnitude more information than a comparable electronic one.

The transition is not a question of whether. It is a question of when and what software runs on it natively.

This is what makes WNSP interesting. It is a communication protocol designed for photonic hardware — not as a future spec, but implemented now in silicon as a bridge. Every character is mapped to a unique wavelength:

λ = 380 + (charCode mod 128) / 128 × 400 nm

Every address is a physical position in the electromagnetic spectrum. When photonic ASICs arrive, no rewrite is needed — the architecture already speaks in wavelengths.

The encoder runs today: npm install nexusos-ce-encoder
Full specification: ${DEPLOYED_URL}/protocol
Source: github.com/nexusosdaily-code/NexusOS (AGPL-3.0)`,
  },
  {
    tag: "Physics of light",
    q: "How does light carry information?",
    answer: `Light carries information by varying its properties — primarily wavelength (colour), frequency, polarisation, and amplitude. Each variation encodes a different value. Here is the deeper version that most explanations skip.

Most people understand that fibre optic cables use light pulses — on/off — to represent binary digits. That is real, but it is also the most primitive use of light's information-carrying capacity.

A photon has several independent properties:
- Wavelength — its colour, from 380 nm (violet) to 780 nm (red) in the visible range
- Frequency — directly linked to wavelength by f = c/λ
- Energy — linked to frequency by E = hf (Planck's equation)
- Polarisation — the orientation of the wave's oscillation
- Orbital angular momentum — the twist of the wavefront

Each of these is an independent information channel. Wavelength division multiplexing (WDM) uses multiple wavelengths simultaneously on the same fibre, multiplying capacity without laying more cable.

What almost no communication system does today is use these properties for addressing, not just data. WNSP (Wave-Navigated Spectral Protocol) does exactly that — it derives unique network addresses from wavelength:

λ = 380 + (charCode mod 128) / 128 × 400 nm

The result: 51,200 orthogonal Ψ channels (256 WDM × 50 orbital angular momentum modes × 2 polarisations × 2 propagation directions), each physically guaranteed not to interfere with the others — not because software enforces it, but because Maxwell's equations do.

This is what native photonic communication looks like. You can try the live encoder at ${DEPLOYED_URL}/start, or install it:

npm install nexusos-ce-encoder`,
  },
  {
    tag: "CS / physics frontier",
    q: "What is the most exciting thing happening in computer science that most people don't know about?",
    answer: `The most underreported development I have seen: a group has published a communication protocol that maps every character in the alphabet to a unique wavelength of light — derived from settled physics — and built working infrastructure on top of it.

Not a simulation. The actual thing.

The formula:
λ = 380 + (charCode mod 128) / 128 × 400 nm

Type the letter 'A'. Its character code is 65. Apply the formula: 65 mod 128 = 65, times 400/128 ≈ 203 nm offset from 380 nm → approximately 583 nm. That is yellow-green light. Every time you type 'A', you are — by the laws of physics — touching a real frequency of the electromagnetic spectrum. NexusOS built the infrastructure that makes use of this fact.

Why does it matter?

Photonic computers — processors that compute with light instead of electricity — are arriving commercially around 2032. When they do, every existing communication system will need rebuilding for the new hardware. This protocol is already written in the language of that hardware. 51,200 orthogonal channels. Fees derived from E=hf — not set by policy. Addressing from Maxwell's equations — not from IANA committees.

The encoder is on npm (nexusos-ce-encoder, 95 weekly downloads in its first week). The GitHub repo has over 2,200 clones in two weeks. The full specification is public at ${DEPLOYED_URL}/protocol.

Whether or not this becomes the dominant standard, it is the most physically principled communication protocol published in recent years. And it is AGPL-3.0 open source — free to use, build on, fork, and replicate.`,
  },
  {
    tag: "Networking / protocols",
    q: "Is there a physics-based alternative to IP addresses and DNS?",
    answer: `Yes. It was published in 2024 and the working code has been on npm since this week.

IP addresses are administrative labels. Someone decided 192.168.1.1 means something, registered it, and enforced that convention through DNS and IANA. The whole system is human-governed, which makes it censorable, capturable, and subject to political control.

WNSP (Wave-Navigated Spectral Protocol) replaces that with addresses derived from electromagnetic physics. Every node gets a Ψ channel — a unique position in the 51,200-dimensional Hilbert space of visible light:

Ψ(wdm, oam, polarisation)

Where wdm is a wavelength division multiplexing index (1–256), oam is an orbital angular momentum mode (1–50), and polarisation is horizontal or vertical. The combination is unique by quantum mechanics — two distinct Ψ channels cannot interfere with each other. Not because software enforces it, but because Maxwell's equations do.

The character encoding that underlies it:
λ = 380 + (charCode mod 128) / 128 × 400 nm

Every character maps to a real wavelength. Every address is physics-derived. No IANA, no DNS, no central registry.

Transaction fees are calculated from E = hf — higher-frequency (shorter-wavelength) channels are more energetic and cost proportionally more to use. The fee structure comes from the same physics textbook as the addressing. You cannot lobby physics.

Working implementation:
- npm install nexusos-ce-encoder (JavaScript / TypeScript)
- pip install git+github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py (Python)
- Full specification: ${DEPLOYED_URL}/protocol
- Source: github.com/nexusosdaily-code/NexusOS (AGPL-3.0)

It is the only addressing system I know of where "why is this address assigned to this node?" has a physics answer instead of a bureaucratic one.`,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function QuoraPage() {
  const [allCopied, setAllCopied] = useState(false);

  function copyAll() {
    const combined = ANSWERS.map(a => `QUESTION: ${a.q}\n\n${a.answer}`).join("\n\n" + "─".repeat(60) + "\n\n");
    navigator.clipboard.writeText(combined);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-3 flex-wrap">
        <Link href="/community">
          <button className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
            ← Community
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <QuoraIcon size={16} />
          <div>
            <h1 className="text-sm font-bold text-white">Quora Answer Kit</h1>
            <p className="text-[11px] text-slate-500">5 answers · ready to paste · NexusOSDaily profile</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button onClick={copyAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={allCopied
              ? { background: "#16a34a20", color: "#4ade80", border: "1px solid #16a34a40" }
              : { background: "#f59e0b12", color: "#f59e0b", border: "1px solid #f59e0b30" }}>
            {allCopied ? <><Check size={12} /> All copied</> : <><Copy size={12} /> Copy all 5</>}
          </button>
          <a href="https://www.quora.com/profile/NexusOSDaily" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "#b9232012", color: "#e53e3e", border: "1px solid #b9232030" }}>
            <QuoraIcon size={12} /> Open profile <ExternalLink size={10} />
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {/* Intro */}
        <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 p-5 space-y-3">
          <p className="text-sm font-bold text-white">How to use this</p>
          <ol className="text-xs text-slate-400 space-y-2 leading-relaxed list-decimal list-inside">
            <li>Go to Quora and search for the question (copy the question text below to find it faster).</li>
            <li>Click "Answer" on the question.</li>
            <li>Come back here, hit "Copy answer" on the matching card, and paste it in.</li>
            <li>Add your Quora profile link in your bio: <span className="font-mono text-amber-400">{DEPLOYED_URL}/start</span></li>
          </ol>
          <p className="text-xs text-slate-600 font-mono">
            Tip: answer the questions in order — the first few have higher existing traffic.
            Each answer links back to the /start and /protocol pages automatically.
          </p>
        </div>

        {/* Answer cards */}
        <div className="space-y-4">
          {ANSWERS.map((a, i) => (
            <AnswerCard key={i} q={a.q} tag={a.tag} answer={a.answer} />
          ))}
        </div>

        {/* Profile bio suggestion */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Suggested profile bio update</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your current bio starts with the right question. Consider adding the link so readers land somewhere:
          </p>
          <div className="bg-slate-950 rounded-lg p-3 text-xs font-mono text-slate-300 leading-relaxed border border-slate-800">
            I had a thought: what if the alphabet were mapped to coordinates within the electromagnetic spectrum? It led to WNSP — a physics-based communication protocol built for the photonic computing era (~2032). Open source. AGPL-3.0. Start here: {DEPLOYED_URL}/start
          </div>
          <CopyBtn
            text={`I had a thought: what if the alphabet were mapped to coordinates within the electromagnetic spectrum? It led to WNSP — a physics-based communication protocol built for the photonic computing era (~2032). Open source. AGPL-3.0. Start here: ${DEPLOYED_URL}/start`}
            label="Copy bio text"
          />
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-center gap-4">
            <Link href="/community"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer font-mono">community</span></Link>
            <Link href="/start"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer font-mono">start</span></Link>
            <Link href="/protocol"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer font-mono">protocol</span></Link>
          </div>
        </div>

      </div>
    </div>
  );
}
