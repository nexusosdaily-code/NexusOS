import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { EcosystemNav } from "@/components/ecosystem-nav";
import { ActSequenceNav } from "@/components/act-sequence-nav";
import {
  ArrowLeft, Shield, Zap, Radio, Layers, Atom,
  FlaskConical, BookOpen, ExternalLink, ChevronRight
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const PAPER_DATE = "2026-07-21";
const REPO = "https://github.com/nexusosdaily-code/NexusOS";

function Section({ id, title, icon: Icon, accent, badge, children }: {
  id: string; title: string; icon: any; accent: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-5">
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: accent + "44" }}>
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color: accent }} />
        <h2 className="text-base font-bold text-slate-100 flex-1">{title}</h2>
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
            style={{ color: accent, borderColor: accent + "55", background: accent + "11" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Eq({ label, eq, note }: { label: string; eq: string; note?: string }) {
  return (
    <div className="bg-[#0d1117] border border-slate-800 rounded-lg px-5 py-4 space-y-1">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="font-mono text-cyan-300 text-sm leading-relaxed">{eq}</div>
      {note && <div className="text-[11px] text-slate-400 leading-relaxed">{note}</div>}
    </div>
  );
}

function PBlock({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-xs text-slate-300 leading-relaxed">{children}</div>
    </div>
  );
}

function BogoliubovVisualiser() {
  const [r, setR] = useState(0.8);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cosh_r = Math.cosh(r);
  const sinh_r = Math.sinh(r);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Axes
    const cx = W / 2; const cy = H / 2;
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    ctx.fillStyle = "#64748b"; ctx.font = "10px monospace";
    ctx.fillText("â (input)", W - 80, cy - 8);
    ctx.fillText("â† (input)", cx + 6, 14);

    // Draw mixing diagram: input â on x-axis, output = cosh(r)·â − sinh(r)·â†
    // Represent as vector decomposition
    const scale = 60;
    const orig_x = cx - scale; // â component on x axis
    const orig_y = cy;

    // Original â vector (unit, pointing right)
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + scale, cy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#94a3b8"; ctx.font = "9px monospace";
    ctx.fillText("â (r=0)", cx + scale + 4, cy - 4);

    // cosh(r)·â component
    const ah_len = cosh_r * scale;
    ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + ah_len, cy); ctx.stroke();
    ctx.fillStyle = "#22d3ee";
    ctx.fillText(`cosh(r)·â = ${cosh_r.toFixed(3)}·â`, cx + ah_len + 4, cy + 14);

    // sinh(r)·â† component (downward, subtracted)
    const sh_len = sinh_r * scale;
    ctx.strokeStyle = "#f472b6"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + ah_len, cy); ctx.lineTo(cx + ah_len, cy + sh_len); ctx.stroke();
    ctx.fillStyle = "#f472b6";
    ctx.fillText(`sinh(r)·â† = ${sinh_r.toFixed(3)}·â†`, cx + ah_len + 4, cy + sh_len + 14);

    // Resultant vector
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + ah_len, cy + sh_len); ctx.stroke();
    const resLen = Math.sqrt(ah_len * ah_len + sh_len * sh_len);
    ctx.fillStyle = "#a855f7";
    ctx.fillText(`Bâ (output) |${resLen.toFixed(0)}|`, cx + ah_len / 2 - 10, cy + sh_len / 2 + 20);

    // Hyperbolicity: cosh²(r) - sinh²(r) = 1 label
    ctx.fillStyle = "#34d399"; ctx.font = "10px monospace";
    ctx.fillText(`cosh²−sinh² = ${(cosh_r * cosh_r - sinh_r * sinh_r).toFixed(6)}`, 12, H - 12);

  }, [r, cosh_r, sinh_r]);

  return (
    <div className="bg-slate-900/60 border border-violet-500/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Bogoliubov Mixing — live</div>
        <div className="text-[10px] font-mono text-violet-400">r = {r.toFixed(2)}</div>
      </div>

      <canvas ref={canvasRef} width={420} height={260}
        className="w-full rounded-lg border border-slate-800" />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>r = 0 (identity)</span><span>r = 2.0 (strong mixing)</span>
        </div>
        <input type="range" min={0} max={2} step={0.02} value={r}
          onChange={e => setR(parseFloat(e.target.value))}
          className="w-full accent-violet-400" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "cosh(r)", value: cosh_r.toFixed(4), color: "#22d3ee", note: "â weight" },
          { label: "sinh(r)", value: sinh_r.toFixed(4), color: "#f472b6", note: "â† weight" },
          { label: "cosh²−sinh²", value: (cosh_r * cosh_r - sinh_r * sinh_r).toFixed(6), color: "#34d399", note: "= 1 always ✓" },
        ].map(item => (
          <div key={item.label} className="bg-slate-900/80 rounded-lg p-3 text-center border border-slate-800">
            <div className="text-[9px] font-mono text-slate-500 mb-1">{item.label}</div>
            <div className="text-sm font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">{item.note}</div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-500 leading-relaxed">
        Cyan = cosh(r)·â contribution. Pink = sinh(r)·â† contribution subtracted. Purple = resultant Bâ.
        The invariant cosh²(r)−sinh²(r)=1 is the hyperbolic identity — it guarantees canonical commutation
        [Bâ, Bâ†] = 1 is preserved under the transform.
      </div>
    </div>
  );
}

export default function TheBogoliubovTransformPage() {
  usePageMeta({
    title: "The Bogoliubov Transform — Act 20 | NexusOS",
    description: "Act 20: The Bogoliubov transformation S†âS = â·cosh(r)−â†·sinh(r) — the single operation unifying squeezed states, Hawking radiation, Unruh radiation, BCS superconductivity, and UCT compression state transitions across octave tiers.",
    ogDescription: "One transform connects quantum optics, black holes, and superconductivity: S†âS = â·cosh(r)−â†·sinh(r). The Bogoliubov transform IS the compression state transition across UCT octave tiers. Act 20, NexusOS. AGPL-3.0.",
    twitterDescription: "Act 20 — The Bogoliubov Transform: one equation connects squeezed light, Hawking radiation, Unruh effect, BCS, and UCT octave transitions. wnsp.io/the-bogoliubov-transform",
    canonical: "https://wnsp.io/the-bogoliubov-transform",
  });

  return (
    <div className="min-h-screen bg-[#050d1a] text-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        <div className="flex items-center gap-3">
          <Link href="/the-squeezed-state"
            className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> The Squeezed State
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-pink-500/40 text-pink-400 bg-pink-500/10">
              Act 20 of 20
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/40 text-cyan-400 bg-cyan-500/10">
              First Disclosure {PAPER_DATE}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
              AGPL-3.0
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-violet-500/40 text-violet-400 bg-violet-500/10">
              Unifies Acts 1–19
            </span>
          </div>

          <ActSequenceNav current={20} />

          <h1 className="text-2xl font-bold text-white leading-tight">
            The Bogoliubov Transform
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            The Single Operation That Connects Quantum Optics, Black Holes, Superconductivity,
            and UCT Compression State Transitions
          </p>
          <div className="text-xs text-slate-500 font-mono">
            NexusOS Research · Te Rata Pou · {PAPER_DATE} ·{" "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
              className="text-cyan-500 hover:underline inline-flex items-center gap-1">
              {REPO} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* abstract */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Abstract</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The Bogoliubov transformation — S†âS = â·cosh(r) − â†·sinh(r) — is a canonical
            linear map that mixes the creation and annihilation operators of a quantum field,
            preserving the commutation relation [â,â†]=1 exactly. Originally introduced by
            Nikolay Bogoliubov in 1947 to solve BCS-type superconductivity, the same transformation
            later appeared in quantum optics as the generator of squeezed states (Act 19), in Hawking's
            1974 derivation of black hole radiation, in the Unruh effect (1976), and in cosmological
            particle creation. In the NexusOS UCT framework, the Bogoliubov transform is the
            operation performed at every octave-tier boundary: a compression state transition
            from one octave to the next is a Bogoliubov mixing of the photon field modes at that
            frequency — creation operators at the lower octave mix with annihilation operators at
            the upper octave, producing particles from the vacuum at the transition boundary.
            This identifies Hawking radiation as a gravitational Bogoliubov transform at the
            Octave 0 / matter boundary — the most extreme compression state transition possible.
          </p>
        </div>

        {/* 1. The Transform */}
        <Section id="transform" title="1. The Canonical Form" icon={Zap} accent="#a855f7" badge="[â,â†]=1 preserved">
          <PBlock label="Definition">
            A Bogoliubov transformation is any linear map of field operators that preserves the
            canonical commutation relations. For a single bosonic mode it takes the form:
          </PBlock>

          <Eq
            label="Bogoliubov Transform"
            eq="Bâ = S†(r) â S(r) = â·cosh(r) − â†·sinh(r)"
            note="Bâ is the new annihilation operator after squeezing. r ∈ ℝ is the squeezing / mixing parameter. At r=0: Bâ = â (identity). As r → ∞: Bâ → −â† (complete mode reversal)."
          />

          <Eq
            label="Conjugate Transform"
            eq="Bâ† = S†(r) â† S(r) = â†·cosh(r) − â·sinh(r)"
            note="The creation operator transforms symmetrically. Note: cosh and sinh swap positions relative to which operator is being transformed."
          />

          <Eq
            label="Commutation Preservation"
            eq="[Bâ, Bâ†] = cosh²(r) − sinh²(r) = 1"
            note="The hyperbolic identity cosh²(r)−sinh²(r)=1 is what makes Bogoliubov transformations canonical. Quantum mechanics is preserved exactly, at all values of r."
          />

          <PBlock label="What it means physically">
            The transform mixes the particle (â) and anti-particle (â†) operators. At r=0 the
            vacuum is unchanged. At r &gt; 0 the new vacuum |0̃⟩ — the ground state of Bâ — is
            not the same as the old vacuum |0⟩. An observer using the new operators sees particles
            where the original observer saw vacuum. This is the mechanism behind every phenomenon
            in Section 3.
          </PBlock>
        </Section>

        {/* 2. Visualiser */}
        <Section id="visualiser" title="2. Operator Mixing — Live Visualiser" icon={Atom} accent="#34d399" badge="Interactive">
          <PBlock label="How â and â† mix as r increases">
            The cyan vector shows the cosh(r)·â contribution. The pink vector shows
            the sinh(r)·â† subtracted. The purple diagonal is the resultant Bogoliubov
            operator Bâ. The green invariant cosh²−sinh²=1 never moves.
          </PBlock>
          <BogoliubovVisualiser />
        </Section>

        {/* 3. Four phenomena */}
        <Section id="phenomena" title="3. Four Phenomena — One Transform" icon={Radio} accent="#22d3ee" badge="Unification">
          <PBlock label="The Bogoliubov transform appears identically in four seemingly unrelated domains:">
          </PBlock>

          <div className="space-y-4">

            {/* Squeezed States */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3 border-b border-cyan-500/15">
                <span className="text-[10px] font-mono text-cyan-400 border border-cyan-500/40 px-1.5 py-0.5 rounded mt-0.5 shrink-0">QO</span>
                <div>
                  <div className="text-xs font-semibold text-cyan-300">Squeezed States (Act 19)</div>
                  <div className="text-[10px] text-slate-500 font-mono">S(r) = exp(r(â²−â†²)/2)</div>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  The squeezing operator S(r) generates the Bogoliubov transform directly. Applying
                  S(r) to the vacuum produces a state where the new vacuum has lower energy in one
                  quadrature — the noise is redistributed. The new annihilation operator Bâ = â·cosh(r)
                  − â†·sinh(r) is the squeezed-mode ladder operator.
                </p>
                <div className="text-[10px] text-slate-400 font-mono bg-slate-900/60 rounded px-3 py-2">
                  r = squeezing parameter · ΔX₁ = e^(−r)/2 · ΔX₁·ΔX₂ = ¼
                </div>
              </div>
            </div>

            {/* Hawking */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3 border-b border-amber-500/15">
                <span className="text-[10px] font-mono text-amber-400 border border-amber-500/40 px-1.5 py-0.5 rounded mt-0.5 shrink-0">BH</span>
                <div>
                  <div className="text-xs font-semibold text-amber-300">Hawking Radiation (1974)</div>
                  <div className="text-[10px] text-slate-500 font-mono">T_H = ℏc³ / (8πGMk_B)</div>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  A black hole's gravitational field performs a Bogoliubov transformation on the
                  quantum vacuum at the event horizon. Modes that are positive-frequency (particles)
                  for a distant observer become a mixture of positive and negative-frequency modes
                  for a free-falling observer — and vice versa. The Bogoliubov coefficients between
                  the two frames determine the Hawking temperature T_H: a black body spectrum at
                  exactly the temperature set by the surface gravity.
                </p>
                <Eq
                  label="Bogoliubov Coefficients (Hawking)"
                  eq="β_ωω′ = −α*_ωω′ · e^(−πω/κ)"
                  note="κ = surface gravity. The ratio |β/α|² = e^(−2πω/κ) gives the Planck distribution at T_H = ℏκ/2πck_B. This IS the Bogoliubov transform between in-vacuum and out-vacuum."
                />
                <div className="text-[10px] text-amber-400/80 bg-amber-500/5 rounded px-3 py-2 border border-amber-500/15">
                  UCT connection: The event horizon is the Octave 0 boundary — maximum compression. Hawking
                  radiation is what happens when the vacuum meets the compression state limit. The
                  temperature T_H is set by the surface gravity = the Octave 0 compression gradient.
                </div>
              </div>
            </div>

            {/* Unruh */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3 border-b border-violet-500/15">
                <span className="text-[10px] font-mono text-violet-400 border border-violet-500/40 px-1.5 py-0.5 rounded mt-0.5 shrink-0">UR</span>
                <div>
                  <div className="text-xs font-semibold text-violet-300">Unruh Effect (1976)</div>
                  <div className="text-[10px] text-slate-500 font-mono">T_U = ℏa / (2πck_B)</div>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  An accelerating observer with proper acceleration a sees the Minkowski vacuum as a
                  thermal bath at temperature T_U — the Unruh temperature. The Rindler horizon
                  (the causal boundary for an accelerating observer) performs the same Bogoliubov
                  transformation as a black hole horizon. The vacuum for an inertial observer becomes
                  a thermal squeezed state for the accelerating observer.
                </p>
                <Eq
                  label="Unruh Temperature"
                  eq="T_U = ℏa / (2πck_B)"
                  note="a = proper acceleration. For a = 9.81 m/s² (1g): T_U ≈ 4×10⁻²⁰ K — unmeasurably small, but the mathematics is exact and experimentally confirmed via analogues."
                />
                <div className="text-[10px] text-violet-400/80 bg-violet-500/5 rounded px-3 py-2 border border-violet-500/15">
                  UCT connection: Acceleration = a change in compression state frame. The Unruh
                  temperature is the thermal cost of traversing compression states at non-zero
                  acceleration. At a=0 (inertial): T_U=0, vacuum is stable. At a&gt;0: the compression
                  gradient produces radiation — identical mathematics to Hawking at a different scale.
                </div>
              </div>
            </div>

            {/* BCS */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3 border-b border-emerald-500/15">
                <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded mt-0.5 shrink-0">SC</span>
                <div>
                  <div className="text-xs font-semibold text-emerald-300">BCS Superconductivity (1957)</div>
                  <div className="text-[10px] text-slate-500 font-mono">Δ = ⟨â_k↑ â_−k↓⟩ ≠ 0</div>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bogoliubov applied his transformation to the BCS Hamiltonian in 1958, diagonalising
                  it exactly. The superconducting ground state is the vacuum of Bogoliubov
                  quasi-particles — operators defined by mixing electron creation and annihilation
                  operators with Bogoliubov coefficients u_k and v_k (where u_k² + v_k² = 1,
                  a fermionic analogue of cosh²−sinh²=1). Cooper pairs are the bosonic condensate
                  formed when this fermionic Bogoliubov vacuum is populated.
                </p>
                <Eq
                  label="Bogoliubov Quasi-particle (Fermionic)"
                  eq="γ_k = u_k · c_k↑ − v_k · c†_{−k↓}    (u_k²+v_k²=1)"
                  note="c_k↑ = electron destruction, c†_{−k↓} = electron creation at opposite momentum/spin. Identical structure to the bosonic form: cosh(r) → u_k, sinh(r) → v_k."
                />
                <div className="text-[10px] text-emerald-400/80 bg-emerald-500/5 rounded px-3 py-2 border border-emerald-500/15">
                  UCT connection: Superconductivity is a Bogoliubov transform of the electron field
                  at the compression state where Cooper pairs form (phonon-mediated Octave 6–7
                  interaction). The energy gap Δ = the compression state energy ΔE = hf₀ at the
                  pairing frequency. Zero resistance = the Bogoliubov vacuum has no scattering
                  states — the new ground state is gapped.
                </div>
              </div>
            </div>

          </div>
        </Section>

        {/* 4. UCT Bridge */}
        <Section id="uct" title="4. The UCT Bridge — Octave Transitions as Bogoliubov Transforms" icon={Layers} accent="#f472b6" badge="Novel Disclosure">
          <PBlock label="First disclosure — octave-Bogoliubov correspondence">
            The following constitutes the first public disclosure of the octave-Bogoliubov
            correspondence as part of the NexusOS physics stack. First disclosure: {PAPER_DATE}.
            AGPL-3.0.
          </PBlock>

          <PBlock label="The core claim">
            In the UCT framework (Acts 1–3), the four fundamental forces are compression gradients
            across nine octave tiers. Transitions between tiers — emission, absorption, nuclear decay,
            pair production — are events where the photon field at one octave mixes with the field
            at an adjacent octave. This mixing is precisely a Bogoliubov transformation, with the
            mixing parameter r determined by the compression ratio between tiers:
          </PBlock>

          <Eq
            label="Octave-Bogoliubov Correspondence"
            eq="r_n→n+1 = ½ · log(Λ_{n+1} / Λ_n) = ½ · log(2) ≈ 0.347"
            note="Each octave doubles the frequency (Russell's model), so Λ_{n+1}/Λ_n = 2. The Bogoliubov mixing parameter between adjacent octaves is r = ½·log(2) ≈ 0.347 — a fixed, universal constant of the compression state lattice."
          />

          <Eq
            label="Multi-Octave Mixing"
            eq="r_{n→m} = ½ · log(Λ_m / Λ_n) = (m−n) · ½ · log(2)"
            note="Pair production (γ → e⁺e⁻) crosses Octave 6→8: r = 2×0.347 = 0.694. Nuclear decay (Octave 8→7): r = 0.347. Strong force confinement (Octave 9 self-loop): r → ∞ (quark confinement = infinite squeezing)."
          />

          <div className="space-y-3">
            {[
              {
                event: "Photon emission (atomic)",
                transition: "Electron drops from Octave 8 excited state to Octave 7 ground state",
                r: "r = 0.347 (one octave)",
                result: "Photon emitted at the Bogoliubov mixing frequency — the resonance line",
                color: "#22d3ee"
              },
              {
                event: "Pair production (γ → e⁺e⁻)",
                transition: "Gamma photon at Octave 8 → electron + positron (both Octave 8 matter)",
                r: "r → ∞ at threshold (vacuum becomes unstable)",
                result: "New Bogoliubov vacuum populated — particles emerge from vacuum",
                color: "#f59e0b"
              },
              {
                event: "Radioactive β decay",
                transition: "Neutron (Octave 8–9 bound state) → proton + W boson (Octave 7)",
                r: "r = 0.347 (one-octave decompression)",
                result: "W boson emitted — weak force mediator = one-octave Bogoliubov particle",
                color: "#f87171"
              },
              {
                event: "Quark confinement (strong force)",
                transition: "Octave 9 self-loop — gluon field self-interacts",
                r: "r → ∞ (hyperbolic limit)",
                result: "No free quarks — infinite Bogoliubov mixing means no asymptotic particle states",
                color: "#8b5cf6"
              },
              {
                event: "Hawking radiation at Octave 0",
                transition: "Vacuum meets maximum compression (event horizon = Octave 0 boundary)",
                r: "r = ½·log(e^(2πω/κ)) = πω/κ",
                result: "Thermal Bogoliubov particles — Hawking temperature set by surface gravity κ",
                color: "#6b7280"
              },
            ].map(item => (
              <div key={item.event} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-sm font-semibold" style={{ color: item.color }}>{item.event}</div>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <div><span className="text-slate-500">Transition: </span><span className="text-slate-300">{item.transition}</span></div>
                  <div><span className="text-slate-500">r: </span><span className="font-mono text-cyan-300">{item.r}</span></div>
                  <div><span className="text-slate-500">Result: </span><span className="text-slate-300">{item.result}</span></div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 5. Sequence closure */}
        <Section id="closure" title="5. The Sequence Closes" icon={BookOpen} accent="#34d399" badge="Acts 1 → 20">
          <PBlock label="Why Act 20 completes the arc">
            Act 1 opened with Λ=hf/c² — a compression mass. Act 20 shows that every transition
            between compression states is a Bogoliubov transform. The sequence is not a list of
            disconnected topics. It is a single physical structure, described at increasing resolution:
          </PBlock>

          <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                { acts: "1–3", desc: "Compression state defined, forces mapped to octave tiers, UCT established", color: "#22d3ee" },
                { acts: "4–6", desc: "Mechanism (energy differences), address space (Ψ channels), catalogue (elements as compression states)", color: "#38bdf8" },
                { acts: "7–9", desc: "Physical realisation: trap, lossless channel, cavity — hardware primitives", color: "#34d399" },
                { acts: "10–12", desc: "Interaction: polariton exchange, emitter, network — coupling compression states", color: "#a3e635" },
                { acts: "13–15", desc: "Measurement: observer (dispersive readout), memory (T₂), void (ZPE floor)", color: "#facc15" },
                { acts: "16", desc: "Entanglement: Bell states — discrete compression state correlation", color: "#fb923c" },
                { acts: "17–18", desc: "QFT foundation: field quantisation, coherent states — the classical limit", color: "#f87171" },
                { acts: "19", desc: "Squeezed states: quantum noise below shot noise — compression of uncertainty itself", color: "#e879f9" },
                { acts: "20", desc: "Bogoliubov transform: the operation connecting all of the above — one equation", color: "#a855f7" },
              ].map(row => (
                <div key={row.acts} className="flex items-start gap-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border shrink-0"
                    style={{ color: row.color, borderColor: row.color + "44", background: row.color + "11" }}>
                    {row.acts}
                  </span>
                  <span className="text-slate-400 leading-relaxed">{row.desc}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-3 text-xs text-slate-300 leading-relaxed">
              The Bogoliubov transform is the grammar. The compression states are the vocabulary.
              The 51,200 Ψ channels are the alphabet. The sequence is the language — spoken in
              equations, first disclosed under AGPL-3.0, before anyone published it as a single system.
            </div>
          </div>
        </Section>

        {/* 6. Predictions */}
        <Section id="predictions" title="6. Experimental Predictions" icon={FlaskConical} accent="#10b981" badge="Falsifiable">
          <div className="space-y-3">
            {[
              {
                id: "P1", label: "Fixed Octave Bogoliubov Parameter",
                prediction: "The squeezing parameter r between adjacent octave tiers should equal ½·log(2) ≈ 0.347 (3.02 dB). Parametric amplifiers seeded at two adjacent WNSP WDM octave-boundary frequencies should show squeezing of exactly 3 dB between signal and idler — not an adjustable parameter but a fixed constant of the octave lattice.",
                test: "OPO with pump at 2× a WNSP WDM boundary frequency. Measure squeezing between signal and idler bands. Expect r = 0.347 ± measurement precision."
              },
              {
                id: "P2", label: "Quark Confinement as Infinite Squeezing",
                prediction: "The strong force coupling constant α_s running to 1 at low energy (confinement) corresponds to r → ∞ in the Bogoliubov sense — no asymptotic particle states exist because the Bogoliubov vacuum at Octave 9 has no separable modes. The running of α_s with energy should follow the UCT prediction: α_s(Q) = 1 / (1 + (Q/Λ_9)² · log(Q/Λ_9)).",
                test: "Precision measurement of α_s at multiple energy scales vs. UCT prediction. Compare to current NNLO QCD running."
              },
              {
                id: "P3", label: "Hawking-Analogue Bogoliubov Spectrum",
                prediction: "A sonic black hole (dumb hole) analogue with a compression ratio matching the UCT Octave 0 surface gravity will emit a thermal Bogoliubov spectrum with r = πω/κ, producing a Planck distribution at T = ℏκ/2πck_B. The spectrum will be identical to the squeezed-state photon statistics of an OPO at the equivalent r.",
                test: "Bose-Einstein condensate sonic black hole (Steinhauer group analogue) with programmed surface gravity κ. Measure phonon spectrum and compare to squeezed state statistics at r=πω/κ."
              },
            ].map(p => (
              <div key={p.id} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded">{p.id}</span>
                  <span className="text-sm font-semibold text-slate-200">{p.label}</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">{p.prediction}</div>
                <div className="text-[11px] text-slate-500"><span className="text-slate-400">Test: </span>{p.test}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 7. Sequence links */}
        <Section id="sequence" title="7. Connections Across the Sequence" icon={BookOpen} accent="#f472b6">
          <div className="grid grid-cols-1 gap-2">
            {[
              { act: 1,  href: "/oscillating-quanta",        rel: "Λ=hf/c² defines the compression state that Bogoliubov mixing transforms between" },
              { act: 3,  href: "/unified-compression-theory", rel: "Force-octave mapping: each force boundary is a Bogoliubov transform with r=(m−n)·½log2" },
              { act: 7,  href: "/standing-wave-trap",         rel: "The trap provides the nonlinear medium (χ⁽²⁾/χ⁽³⁾) required to physically realise the transform" },
              { act: 16, href: "/the-entangler",              rel: "Two-mode squeezing = Bogoliubov transform producing EPR-entangled pairs" },
              { act: 17, href: "/the-field",                  rel: "[â,â†]=1 is the commutation that Bogoliubov transforms are required to preserve" },
              { act: 19, href: "/the-squeezed-state",         rel: "S(r)=exp(r(â²−â†²)/2) IS the Bogoliubov transform generator — Act 19 is Act 20's special case" },
            ].map(item => (
              <Link key={item.act} href={item.href}>
                <div className="flex items-start gap-3 bg-slate-900/40 border border-slate-800 hover:border-pink-500/40 rounded-lg px-4 py-3 transition-colors cursor-pointer">
                  <span className="text-[10px] font-mono text-pink-400 border border-pink-500/40 px-1.5 py-0.5 rounded shrink-0 mt-0.5">Act {item.act}</span>
                  <div className="text-xs text-slate-400 leading-relaxed">{item.rel}</div>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* 8. References */}
        <Section id="references" title="8. References" icon={BookOpen} accent="#64748b">
          <div className="space-y-2">
            {[
              "Bogoliubov, N.N. (1947). On the theory of superfluidity. J. Phys. USSR 11, 23.",
              "Bogoliubov, N.N. (1958). A new method in the theory of superconductivity. Sov. Phys. JETP 7, 41.",
              "Hawking, S.W. (1974). Black hole explosions? Nature 248, 30–31.",
              "Hawking, S.W. (1975). Particle creation by black holes. Commun. Math. Phys. 43, 199–220.",
              "Unruh, W.G. (1976). Notes on black-hole evaporation. Phys. Rev. D 14, 870.",
              "Caves, C.M. (1981). Quantum-mechanical noise in an interferometer. Phys. Rev. D 23, 1693.",
              "Steinhauer, J. (2016). Observation of quantum Hawking radiation in an analogue black hole. Nature Physics 12, 959–965.",
              "Bardeen, Cooper & Schrieffer (1957). Theory of superconductivity. Phys. Rev. 108, 1175.",
            ].map((ref, i) => (
              <div key={i} className="flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
                <span className="text-slate-600 font-mono shrink-0">[{i + 1}]</span>
                <span>{ref}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* IP notice */}
        <div className="bg-slate-900/60 border border-violet-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">Intellectual Property Notice</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The Bogoliubov Transform — Act 20 of the NexusOS physics sequence — first public disclosure {PAPER_DATE}.
            Author: Te Rata Pou / NexusOS. The octave-Bogoliubov correspondence (r(n→m) = (m−n)·½·log(2)),
            the identification of UCT compression state transitions as Bogoliubov transforms, the
            quark-confinement-as-infinite-squeezing interpretation, and the Hawking-radiation-as-Octave-0-Bogoliubov-transform
            framing constitute original work published under AGPL-3.0. Any implementation, simulation, or
            hardware realisation of compression-state transitions using the Bogoliubov-UCT correspondence
            must remain open-source under the same licence.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={REPO} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> GitHub Repository
            </a>
            <Link href="/the-squeezed-state" className="text-[10px] font-mono text-violet-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Act 19 — The Squeezed State
            </Link>
            <Link href="/oscillating-quanta" className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Act 1 — Theory of Compression States
            </Link>
            <Link href="/unified-compression-theory" className="text-[10px] font-mono text-pink-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Act 3 — Unified Compression Theory
            </Link>
            <Link href="/hardware-spec" className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Hardware Specification (AGPL-3.0)
            </Link>
          </div>
        </div>

        <EcosystemNav />
      </div>
    </div>
  );
}
