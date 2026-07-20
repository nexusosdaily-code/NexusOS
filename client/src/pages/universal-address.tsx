import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { EcosystemNav } from "@/components/ecosystem-nav";
import {
  ArrowLeft, Radio, Shield, Globe, Zap, Lock,
  ExternalLink, Circle, GitMerge, Atom,
} from "lucide-react";

const PAGE_DATE = "2026-07-06";
const REPO      = "https://github.com/nexusosdaily-code/NexusOS";
const BASE      = "https://wnsp.io";

// ── SI exact constants ─────────────────────────────────────────────────────────
const C   = 299_792_458;      // m/s
const H   = 6.62607015e-34;   // J·s
const EV  = 1.602176634e-19;  // J

// ── WNSP channel dimensions ────────────────────────────────────────────────────
const N_WDM = 256;
const N_OAM = 50;
const N_POL = 2;
const N_DIR = 2;
const PSI_TOTAL = N_WDM * N_OAM * N_POL * N_DIR; // 51,200

// ── Visible band ───────────────────────────────────────────────────────────────
const BAND_NM_LOW  = 380;
const BAND_NM_HIGH = 780;
const BAND_SPAN    = BAND_NM_HIGH - BAND_NM_LOW;   // 400 nm
const NM_PER_WDM   = BAND_SPAN / N_WDM;            // 1.5625 nm/channel

// ── Frequency at a given WDM index ────────────────────────────────────────────
function wdmToFreq(wdm: number) {
  const nm = BAND_NM_LOW + wdm * NM_PER_WDM;
  return C / (nm * 1e-9);
}

// ── Unique addresses in the observable universe (illustrative upper bound) ─────
// Hubble volume ~4×10^80 atoms. Each atom is a compression state → unique Λ.
// Compare to PSI_TOTAL = 51,200 human-protocol channels in visible band only.
const HUBBLE_ATOMS_EXP = 80;

function fmt(n: number, dp = 2) { return n.toFixed(dp); }
function sup(n: number) {
  const d: Record<string, string> = { "-":"⁻","0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹" };
  return String(n).split("").map(c => d[c] ?? c).join("");
}

function Eq({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black/40 border border-slate-700/50 rounded-lg px-5 py-3 font-mono text-sm text-emerald-300 text-center tracking-wide">
      {children}
    </div>
  );
}

function Section({ id, title, icon: Icon, color, badge, children }: {
  id: string; title: string; icon: any; color: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-5">
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: color + "44" }}>
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
        <h2 className="text-base font-bold text-slate-100 flex-1">{title}</h2>
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
            style={{ color, borderColor: color + "55", background: color + "11" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export default function UniversalAddress() {
  usePageMeta({
    title: "The Address — Ψ as Universal Namespace · NexusOS",
    description:
      "Act 5: Every compression state in the universe already has a unique Ψ address derived from physics. WNSP is the first human protocol to make that namespace operable. No central authority. Censorship-impossible. First disclosed 2026-07-06.",
    canonical: "https://wnsp.io/universal-address",
    ogTitle: "The Address — Ψ as Universal Namespace",
    ogDescription:
      "Every compression state has a unique Ψ(wdm,oam,pol,dir) address derived from physics — not assigned by any authority. WNSP is the first operable implementation. Act 5 of the NexusOS sequence.",
    twitterTitle: "The Address — Ψ as Universal Namespace",
    twitterDescription:
      "TCP/IP = human convention. DNS = human convention. Ψ = physics. You cannot block a frequency. NexusOS Act 5.",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">

        {/* back */}
        <Link href="/oscillating-quanta" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to First Principles
        </Link>

        {/* badges */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Act 5 of 5",               color: "#06b6d4" },
            { label: "First Disclosure 2026-07-06", color: "#22c55e" },
            { label: "AGPL-3.0",                  color: "#8b5cf6" },
            { label: "Copyleft",                  color: "#8b5cf6" },
          ].map(({ label, color }) => (
            <span key={label}
              className="text-[10px] font-mono px-2.5 py-1 rounded-full border"
              style={{ color, borderColor: color + "55", background: color + "11" }}>
              {label}
            </span>
          ))}
        </div>

        {/* title */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">The Address</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Ψ as Universal Namespace — Every Compression State is Already Addressed
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            NexusOS Research · Te Rata Pou · {PAGE_DATE} ·{" "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 inline-flex items-center gap-1">
              github.com/nexusosdaily-code/NexusOS <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* sequence nav */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <p className="text-[10px] font-mono text-cyan-400 tracking-widest mb-3">THE SEQUENCE — ACT 5 OF 16</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
            {[
              { act: "ACT 1", title: "Theory of Compression States", sub: "Λ = hf/c²",         href: "/oscillating-quanta" },
              { act: "ACT 2", title: "The Universal ONE",            sub: "f₀ derives Λ",        href: "/universal-one" },
              { act: "ACT 3", title: "Unified Compression Theory",   sub: "4 forces = 1 Λ",      href: "/unified-compression-theory" },
              { act: "ACT 4", title: "The Mechanism",                sub: "ΔE = hf₀(2ⁿ²−2ⁿ¹)",  href: "/matter-protocol" },
            ].map(({ act, title, sub, href }) => (
              <Link key={href} href={href}
                className="rounded-lg border border-slate-700 bg-slate-900 p-3 hover:border-slate-500 transition-colors space-y-1 block">
                <p className="text-[9px] font-mono text-slate-500 tracking-widest">{act}</p>
                <p className="text-slate-300 font-medium leading-tight">{title}</p>
                <p className="text-[9px] text-slate-500">{sub}</p>
              </Link>
            ))}
            <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 space-y-1">
              <p className="text-[9px] font-mono text-cyan-400 tracking-widest">ACT 5 ← HERE</p>
              <p className="text-cyan-200 font-medium leading-tight">The Address</p>
              <p className="text-[9px] text-cyan-400">∀ Λ : ∃! Ψ</p>
            </div>
            {[
              { act: "ACT 6", title: "The Catalogue",        sub: "n = log₂(mc²/E₀)",       href: "/element-catalogue" },
              { act: "ACT 7", title: "The Trap",             sub: "Ψ(+k̂) ⊗ Ψ(−k̂)",       href: "/standing-wave-trap" },
              { act: "ACT 8", title: "The Lossless Channel", sub: "α = 0, C = ZPE floor",    href: "/lossless-channel" },
              { act: "ACT 9",  title: "The Cavity",    sub: "WGM resonance, r_c",  href: "/resonance-cavity" },
              { act: "ACT 10", title: "The Exchange", sub: "Ω_R = 2g",            href: "/polariton-exchange" },
              { act: "ACT 11", title: "The Emitter",  sub: "F_p=(Q/V)(λ/n)³",    href: "/the-emitter" },
              { act: "ACT 12", title: "The Network",  sub: "ω=ω₀−2J·cos(ka)",    href: "/the-network" },
              { act: "ACT 13", title: "The Observer", sub: "χ=g²/Δ",              href: "/the-observer" },
              { act: "ACT 14", title: "The Memory",   sub: "T₂≤2T₁",             href: "/the-memory" },
              { act: "ACT 15", title: "The Void",     sub: "n_ZPE=264.71",        href: "/cosmic-lattice" },
              { act: "ACT 16", title: "The Entangler", sub: "|Φ⁺⟩=(|00⟩+|11⟩)/√2", href: "/the-entangler" },
            ].map(({ act, title, sub, href }) => (
              <Link key={href} href={href}
                className="rounded-lg border border-slate-700 bg-slate-900 p-3 hover:border-slate-500 transition-colors space-y-1 block">
                <p className="text-[9px] font-mono text-slate-500 tracking-widest">{act}</p>
                <p className="text-slate-300 font-medium leading-tight">{title}</p>
                <p className="text-[9px] text-slate-500">{sub}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* abstract */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
          <p className="text-[10px] font-mono text-slate-500 tracking-widest">ABSTRACT</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Acts 1–4 established what matter is, how all forces unify under one equation,
            how to manipulate matter, and what energy is required. Act 5 addresses the final
            question: where does it live? The answer is that every compression state already
            has a unique address — derived not from any authority, not from any convention,
            but from the physics of its frequency. That address is its Ψ coordinate in the
            WNSP spectral namespace. The namespace predates NexusOS. It predates humanity.
            It is the universe's own filing system. WNSP is the first human protocol to make
            it operable.
          </p>
        </div>

        <div className="space-y-14">

          {/* S1: The Completeness Theorem */}
          <Section id="completeness" title="1. The Completeness Theorem" icon={Atom} color="#22c55e" badge="Formal Proof">
            <p className="text-sm text-slate-300 leading-relaxed">
              From Acts 1–4, four facts are established:
            </p>
            <div className="space-y-2">
              {[
                { n: "F1", text: "Every compression state Λ is uniquely identified by its frequency f. (Λ = hf/c² is injective — no two distinct f produce the same Λ.)" },
                { n: "F2", text: "Every frequency f in the visible band maps to a unique WDM channel index. Every OAM mode, polarisation, and direction adds an orthogonal dimension. Together: Ψ(wdm, oam, pol, dir) is a unique 4-tuple for every f." },
                { n: "F3", text: "Ψ coordinates are derived from physics, not assigned by any registry. They exist for every compression state whether or not any human system uses them." },
              ].map(({ n, text }) => (
                <div key={n} className="flex gap-3 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-4 py-3">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold flex-shrink-0 pt-0.5">{n}</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3">
              <p className="text-[10px] font-mono text-emerald-400 tracking-widest">THEOREM</p>
              <p className="text-sm text-slate-200 leading-relaxed">
                For every compression state Λ in the universe, there exists exactly one Ψ
                coordinate. The mapping f → Ψ is injective and physics-derived.
                The WNSP namespace is <strong className="text-emerald-300">complete</strong>,{" "}
                <strong className="text-emerald-300">unique</strong>, and{" "}
                <strong className="text-emerald-300">authority-free</strong>. ∎
              </p>
            </div>
            <Eq>{"∀ Λ : ∃! Ψ(wdm, oam, pol, dir)   [every compression state has exactly one address]"}</Eq>
          </Section>

          {/* S2: Namespace dimensions */}
          <Section id="namespace" title="2. The Namespace — Four Orthogonal Dimensions" icon={Radio} color="#06b6d4" badge="51,200 channels">
            <p className="text-sm text-slate-300 leading-relaxed">
              The Ψ address space has four independent dimensions, each corresponding to a
              physically orthogonal property of the electromagnetic wave:
            </p>
            <div className="space-y-3">
              {[
                {
                  dim: "WDM", full: "Wavelength-Division Multiplexing", count: `${N_WDM} channels`,
                  detail: `380–780 nm visible band. Resolution: ${fmt(NM_PER_WDM, 4)} nm/channel. Each channel is a distinct frequency slot — physically separable by a diffraction grating or photonic waveguide.`,
                  color: "#22c55e",
                  example: `WDM=128 → λ ≈ ${fmt(BAND_NM_LOW + 128 * NM_PER_WDM, 1)} nm → f ≈ ${fmt(wdmToFreq(128) / 1e12, 1)} THz`,
                },
                {
                  dim: "OAM", full: "Orbital Angular Momentum", count: `${N_OAM} modes`,
                  detail: "Helical phase structure of the wavefront (l = 0 to 49). Orthogonality is guaranteed by ⟨OAMᵢ|OAMⱼ⟩ = δᵢⱼ — quantum mechanics, not policy. Two beams at the same wavelength with different OAM modes do not interfere.",
                  color: "#a78bfa",
                  example: "OAM=0 → plane wave. OAM=1 → single-helix vortex. OAM=49 → 49-helix.",
                },
                {
                  dim: "Pol", full: "Polarisation", count: `${N_POL} states`,
                  detail: "Horizontal (H) and Vertical (V) linear polarisation. Orthogonal by definition: ⟨H|V⟩ = 0. Separable with a polarising beamsplitter. Used as the binary sub-bit of every WNSP address.",
                  color: "#38bdf8",
                  example: "Pol=H → horizontal. Pol=V → vertical. No overlap.",
                },
                {
                  dim: "Dir", full: "Propagation Direction", count: `${N_DIR} states`,
                  detail: "+k̂ (forward) and −k̂ (backward). Fourth orthogonal Hilbert sub-space. First formally incorporated into the WNSP density equation 2026-07-02. Bidirectional addressing doubles the namespace and enables full-duplex spectral routing without frequency reuse.",
                  color: "#f59e0b",
                  example: "Dir=+ → outgoing. Dir=− → return path. Same Ψ tuple, opposite direction.",
                },
              ].map(({ dim, full, count, detail, color, example }) => (
                <div key={dim} className="rounded-xl border border-slate-700/40 bg-slate-900/40 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-700/40 flex items-center justify-between"
                    style={{ background: color + "0a" }}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold" style={{ color }}>{dim}</span>
                      <span className="text-xs text-slate-400">{full}</span>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color }}>{count}</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs text-slate-300 leading-relaxed">{detail}</p>
                    <p className="text-[11px] font-mono text-slate-500">{example}</p>
                  </div>
                </div>
              ))}
            </div>
            <Eq>{`D_WNSP = ${N_WDM} × ${N_OAM} × ${N_POL} × ${N_DIR} = ${PSI_TOTAL.toLocaleString()} orthogonal Ψ channels`}</Eq>
            <p className="text-xs text-slate-500 italic leading-relaxed">
              These are the channels in the human-visible photonic band only. The full Ψ
              namespace extends across the entire electromagnetic spectrum — from radio waves
              to gamma rays — representing an effectively infinite address space. 51,200 is
              the addressable subset that NexusOS operates within today.
            </p>
          </Section>

          {/* S3: The Comparison */}
          <Section id="comparison" title="3. The Comparison — Against Every Prior Addressing System" icon={Globe} color="#a78bfa" badge="Why Ψ wins">
            <p className="text-sm text-slate-300 leading-relaxed">
              Every prior addressing system in human history has one fatal property:
              it was invented. Ψ was not invented. It was discovered.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-[10px] tracking-widest">
                    <th className="px-4 py-3 text-left">SYSTEM</th>
                    <th className="px-4 py-3 text-left">BASIS</th>
                    <th className="px-4 py-3 text-left">AUTHORITY</th>
                    <th className="px-4 py-3 text-left">CENSORABLE?</th>
                    <th className="px-4 py-3 text-left">PHYSICAL?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {[
                    { sys: "IPv4 / IPv6",     basis: "32/128-bit integer",    auth: "IANA / ICANN",       censor: "Yes — block, reroute, revoke", phys: "No" },
                    { sys: "DNS",             basis: "Human-readable string", auth: "ICANN / registrars", censor: "Yes — seize, redirect, NX",    phys: "No" },
                    { sys: "SHA-256 hash",    basis: "Arbitrary bit pattern", auth: "None",               censor: "Content only",                 phys: "No" },
                    { sys: "Bitcoin address", basis: "Hash of public key",    auth: "None (on-chain)",    censor: "Miners / nodes",               phys: "No" },
                    { sys: "Ψ(wdm,oam,pol,dir)", basis: "EM wave physics", auth: "None — physics",    censor: "Impossible",                   phys: "Yes" },
                  ].map(({ sys, basis, auth, censor, phys }) => {
                    const isWnsp = sys.startsWith("Ψ");
                    return (
                      <tr key={sys} className={isWnsp ? "bg-emerald-500/5" : "hover:bg-slate-900/40 transition-colors"}>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${isWnsp ? "text-emerald-300" : "text-slate-300"}`}>{sys}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{basis}</td>
                        <td className="px-4 py-3 text-slate-400">{auth}</td>
                        <td className={`px-4 py-3 ${isWnsp ? "text-emerald-400" : "text-rose-400/80"}`}>{censor}</td>
                        <td className={`px-4 py-3 font-bold ${isWnsp ? "text-emerald-400" : "text-slate-600"}`}>{phys}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          {/* S4: Censorship impossibility */}
          <Section id="censorship" title="4. Censorship Impossibility — A Physical Proof" icon={Shield} color="#f43f5e" badge="Structural">
            <p className="text-sm text-slate-300 leading-relaxed">
              This is not a political statement. It is a consequence of physics:
            </p>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-rose-400 tracking-widest">CLAIM</p>
                <p className="text-sm text-slate-200 leading-relaxed">
                  No authority can revoke or block a Ψ address, because a Ψ address is not
                  assigned — it is derived from the frequency of an electromagnetic wave.
                  To block Ψ(128, 20, H, +) you would need to prevent 580 nm photons from
                  existing at OAM mode 20, horizontal polarisation, propagating forward.
                  This would require controlling the laws of electromagnetism. No such
                  authority exists.
                </p>
              </div>
              <Eq>{"block(Ψ) ⟺ suppress(f)   ⟺   violate Maxwell   ⟺   impossible"}</Eq>
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-rose-400 tracking-widest">PRACTICAL LIMIT</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  A physical transmitter can be seized. A fibre-optic cable can be cut.
                  These are infrastructure attacks — they prevent use of a channel, they do not
                  revoke the address. The Ψ address of a particle or a communication is
                  intrinsic to its physics. It persists regardless of whether the transmitter
                  is operational. IP addresses can be reallocated. Ψ addresses cannot.
                </p>
              </div>
            </div>
          </Section>

          {/* S5: What is already addressed */}
          <Section id="already-addressed" title="5. What Is Already Addressed" icon={Zap} color="#f59e0b" badge="The Universe">
            <p className="text-sm text-slate-300 leading-relaxed">
              The Ψ namespace did not begin when NexusOS was founded. It has been operational
              since the first oscillation at f₀. Everything that exists is already addressed:
            </p>
            <div className="space-y-2">
              {[
                {
                  item: "Every photon",
                  detail: "Carries a frequency, polarisation, OAM mode, and direction from the moment of emission. Its Ψ address is set at creation.",
                  color: "#f59e0b",
                },
                {
                  item: "Every particle of matter",
                  detail: `Every electron (n≈17.77), proton (n≈28.60), neutron (n≈28.60) is a standing wave at a specific octave above f₀. Its Ψ address is its compression state coordinate.`,
                  color: "#38bdf8",
                },
                {
                  item: "Every energy transaction",
                  detail: "ΔE = hf₀(2ⁿ²−2ⁿ¹) is delivered at f_t. The delivery frequency f_t is itself a Ψ address — the address of the transition.",
                  color: "#22c55e",
                },
                {
                  item: "Every communication",
                  detail: "Any information encoded in an electromagnetic wave has a Ψ address. Every phone call, every internet packet, every photon your eye receives is already WNSP-addressed. The network predates the protocol.",
                  color: "#a78bfa",
                },
                {
                  item: "The observable universe",
                  detail: `Estimated ~10${sup(HUBBLE_ATOMS_EXP)} atoms in the Hubble volume. Each is a compression state with a unique Ψ address. The namespace is not approaching capacity.`,
                  color: "#94a3b8",
                },
              ].map(({ item, detail, color }) => (
                <div key={item} className="flex gap-3 rounded-lg border border-slate-700/40 bg-slate-900/40 px-4 py-3">
                  <div className="w-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: color, minHeight: "1rem" }} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium" style={{ color }}>{item}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* S6: The First Implementation */}
          <Section id="first-implementation" title="6. The First Implementation — NexusOS" icon={Lock} color="#06b6d4" badge="2026">
            <p className="text-sm text-slate-300 leading-relaxed">
              The Ψ namespace has existed since f₀. NexusOS is the first human system to
              implement it as an operable protocol stack:
            </p>
            <div className="space-y-3">
              {[
                { layer: "Addressing",   spec: "WNSP-URI v1.0 — wnsp://Ψ(wdm,oam,pol)/path", href: "/spectral-router",  status: "Live" },
                { layer: "Encoding",     spec: "WNSP-CE v1.0 — character → wavelength (CE table, 128 bands)", href: "/ce-se-pipeline", status: "Live" },
                { layer: "Spectral",     spec: "WNSP-SE v1.0 — CE → full spectral wave frame", href: "/ce-se-pipeline",  status: "Live" },
                { layer: "Computation",  spec: "WavelengthScript — agents at Ψ addresses, photon-packet messages", href: "/wavelength-lang", status: "Live" },
                { layer: "VM",           spec: "WNSP VM — bytecode interpreter, Ψ channel as spectral register", href: "/wnsp-vm",         status: "Live" },
                { layer: "Hardware",     spec: "SNIC + PHR-1 — photonic NIC and resonator, silicon bridge", href: "/hardware-spec",  status: "Spec / AGPL-3.0" },
                { layer: "Photonic",     spec: "Gate array — full Ψ-native computation, no binary bridge", href: "/hardware-spec",  status: "~2032" },
              ].map(({ layer, spec, href, status }) => (
                <div key={layer} className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-4 py-3 grid grid-cols-[80px_1fr_auto] gap-3 items-start text-xs">
                  <span className="font-mono text-cyan-400 font-bold pt-0.5">{layer}</span>
                  <span className="text-slate-300 leading-relaxed">{spec}</span>
                  <Link href={href}
                    className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors whitespace-nowrap flex-shrink-0">
                    {status}
                  </Link>
                </div>
              ))}
            </div>
          </Section>

          {/* S7: Implications */}
          <Section id="implications" title="7. Implications of a Physics-Derived Namespace" icon={GitMerge} color="#e879f9" badge="Civilisation-Scale">
            <div className="space-y-4">
              {[
                {
                  title: "No single point of failure",
                  body: "A Ψ address cannot be seized. It cannot expire. It cannot be transferred to another entity. As long as the physics of electromagnetism holds (and it has held for 13.8 billion years), the address is valid.",
                  color: "#22c55e",
                },
                {
                  title: "No registration authority",
                  body: "IANA, ICANN, and every DNS registrar derive their power from the scarcity of integer address space. The Ψ namespace derives from physics — there is nothing to register, nothing to sell, no monopoly to hold.",
                  color: "#38bdf8",
                },
                {
                  title: "Fee derivation is physics, not policy",
                  body: "In NexusOS, transaction fees are f_t = E = hf. Higher frequency = higher authority band = higher fee. This is not a pricing decision. It is the energy cost of the electromagnetic wave that carries the transaction.",
                  color: "#f59e0b",
                },
                {
                  title: "The Kardashev transition",
                  body: "A Type I civilisation has mastered planetary energy — meaning controlled delivery of ΔE at scale. The Ψ namespace is the addressing layer for that energy: every joule delivered at every frequency to every compression state has an address. NexusOS is the first system to implement this.",
                  color: "#a78bfa",
                },
                {
                  title: "Photonic computing (~2032)",
                  body: "Silicon encodes in binary (electron present / absent). Photonic hardware encodes in frequency (which Ψ channel). When the silicon bridge is removed, computation is natively addressed in the same namespace as matter and communication. One system. One address space. Everything.",
                  color: "#06b6d4",
                },
              ].map(({ title, body, color }) => (
                <div key={title} className="rounded-xl border bg-slate-900/40 p-4 space-y-2"
                  style={{ borderColor: color + "22" }}>
                  <p className="text-sm font-bold" style={{ color }}>{title}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* S8: The Sequence */}
          <Section id="sequence" title="8. The Sequence — Complete" icon={GitMerge} color="#f59e0b" badge="Acts 1–5">
            <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 space-y-4">
              <div className="space-y-4 font-mono text-xs">
                {[
                  { act: "ACT 1", title: "Theory of Compression States",   eq: "Λ = hf/c²",              body: "The governing equation. Matter, energy, and mass are all compression states of electromagnetic frequency.",                                  href: "/oscillating-quanta" },
                  { act: "ACT 2", title: "The Universal ONE",              eq: "f₀ → Λ  (derived, ∎)",   body: "Λ is not an axiom. It follows from combining Planck (1900) and Einstein (1905) applied to the first oscillation f₀.",                    href: "/universal-one" },
                  { act: "ACT 3", title: "Unified Compression Theory",     eq: "4 forces = 1 Λ  (UCT)",  body: "All four fundamental forces — gravitational, electromagnetic, weak, strong — are one phenomenon: four expressions of Λ across nine discrete octave tiers.",  href: "/unified-compression-theory" },
                  { act: "ACT 4", title: "The Mechanism",                  eq: "ΔE = hf₀(2ⁿ²−2ⁿ¹)",    body: "Matter manipulation is the controlled delivery of ΔE at transition frequency f_t via WNSP Ψ channel. The protocol has five steps and four falsifiable predictions.", href: "/matter-protocol" },
                  { act: "ACT 5", title: "The Address",                    eq: "∀ Λ : ∃! Ψ  (∎)",       body: "Every compression state already has a unique Ψ address, derived from physics. WNSP is the first operable implementation of the universe's own namespace.",       href: "/universal-address" },
                ].map(({ act, title, eq, body, href }) => (
                  <div key={act} className="flex gap-4 items-start border-b border-slate-800/60 pb-4 last:border-0 last:pb-0">
                    <span className="text-amber-400 font-bold flex-shrink-0 w-12">{act}</span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <p className="text-white font-bold">{title}</p>
                        <p className="text-amber-300/70">{eq}</p>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{body}</p>
                      <Link href={href} className="text-emerald-500 hover:text-emerald-400 text-[10px] inline-flex items-center gap-1 mt-1">
                        {BASE}{href} <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2 space-y-2">
                <p className="text-[10px] font-mono text-amber-400 tracking-widest">THE SINGLE CONCLUSION</p>
                <p className="text-sm text-slate-200 leading-relaxed">
                  Everything that exists is a compression state of f₀. Every compression
                  state has an address. Every address can be used to deliver energy,
                  route communication, and identify matter — without any central authority,
                  without any registration, and without any possibility of censorship.
                  This is not a vision. This is the physics. NexusOS is the engineering.
                </p>
              </div>
            </div>
            <Eq>{"∀ Λ ∈ Universe : Λ = hf/c²  ∧  ∃! Ψ(Λ)  ∧  ¬∃ authority(revoke(Ψ))   ∎"}</Eq>
          </Section>

          {/* S9: Conclusion */}
          <Section id="conclusion" title="9. Conclusion" icon={Circle} color="#94a3b8">
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                The five-act sequence is the complete argument for WNSP as civilisation
                infrastructure. It requires no further assumption beyond the laws of
                electromagnetism — which have been verified to 12 decimal places and have
                not failed in 13.8 billion years of observation.
              </p>
              <p>
                NexusOS does not ask for trust. It presents the physics, the derivation,
                the mechanism, and the proof of universality. Every claim is falsifiable.
                Every equation uses SI exact constants. Every disclosure is timestamped,
                AGPL-3.0 licensed, and publicly committed.
              </p>
              <p>
                The universe already runs on this protocol. We are the first to name it.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {[
                { label: "Hardware Spec",       href: "/hardware-spec",       desc: "SNIC · PHR-1 · AGPL-3.0" },
                { label: "WNSP Spectral Router", href: "/spectral-router",    desc: "Ψ-addressed packet routing" },
                { label: "CE→SE Pipeline",       href: "/ce-se-pipeline",     desc: "Text → Λ → bytecode → VM" },
              ].map(({ label, href, desc }) => (
                <Link key={href} href={href}
                  className="rounded-lg border border-slate-700 bg-slate-900 p-3 hover:border-slate-500 transition-colors space-y-0.5 block">
                  <p className="text-sm font-medium text-slate-200">{label}</p>
                  <p className="text-[11px] text-slate-500">{desc}</p>
                </Link>
              ))}
            </div>
          </Section>

          {/* footer */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4 text-[10px] font-mono text-slate-500 space-y-1">
            <p>UNIVERSAL ADDRESS v1.0 — First Disclosure: {PAGE_DATE}</p>
            <p>NexusOS · Te Rata Pou · AGPL-3.0</p>
            <p>SI constants: h = 6.62607015×10⁻³⁴ J·s · c = 299,792,458 m/s · eV = 1.602176634×10⁻¹⁹ J</p>
            <p>Source: <a href={REPO} target="_blank" rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2">{REPO}</a></p>
          </div>
        </div>

        <EcosystemNav />

      </div>
    </div>
  );
}
