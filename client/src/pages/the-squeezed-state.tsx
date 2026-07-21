import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { EcosystemNav } from "@/components/ecosystem-nav";
import { ActSequenceNav } from "@/components/act-sequence-nav";
import {
  ArrowLeft, Zap, Radio, Layers, Atom, Shield,
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

function SqueezingVisualiser() {
  const [r, setR] = useState(0.8);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dx1 = Math.exp(-r) / 2;
  const dx2 = Math.exp(r) / 2;
  const shotNoise = 0.5;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const scale = 80;

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    ctx.strokeStyle = "#334155";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, shotNoise * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#475569";
    ctx.font = "9px monospace";
    ctx.fillText("shot noise", cx + shotNoise * scale + 4, cy - 4);

    const a = dx1 * scale;
    const b = dx2 * scale;
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let angle = 0; angle <= Math.PI * 2 + 0.01; angle += 0.02) {
      const x = cx + a * Math.cos(angle);
      const y = cy + b * Math.sin(angle);
      if (angle === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "#22d3ee33";
    ctx.beginPath();
    for (let angle = 0; angle <= Math.PI * 2 + 0.01; angle += 0.02) {
      const x = cx + a * Math.cos(angle);
      const y = cy + b * Math.sin(angle);
      if (angle === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.fill();

    ctx.strokeStyle = "#94a3b8";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + a, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + b); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#22d3ee";
    ctx.font = "9px monospace";
    ctx.fillText(`ΔX₁=${dx1.toFixed(3)}`, cx + a + 4, cy + 4);
    ctx.fillStyle = "#f472b6";
    ctx.fillText(`ΔX₂=${dx2.toFixed(3)}`, cx + 4, cy + b + 12);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.fillText("X̂₁", W - 16, cy - 8);
    ctx.fillText("X̂₂", cx + 6, 14);
  }, [r, dx1, dx2]);

  return (
    <div className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Phase-Space Squeezing — live</div>
        <div className="text-[10px] font-mono text-cyan-400">r = {r.toFixed(2)}</div>
      </div>

      <canvas ref={canvasRef} width={360} height={260}
        className="w-full rounded-lg bg-[#0d1117] border border-slate-800" />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>r = 0 (coherent)</span><span>r = 2.0 (strong squeeze)</span>
        </div>
        <input type="range" min={0} max={2} step={0.02} value={r}
          onChange={e => setR(parseFloat(e.target.value))}
          className="w-full accent-cyan-400" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "ΔX₁ (squeezed)", value: dx1.toFixed(4), color: "#22d3ee", note: r > 0 ? "< shot noise ✓" : "= shot noise" },
          { label: "ΔX₂ (anti-squeezed)", value: dx2.toFixed(4), color: "#f472b6", note: r > 0 ? "> shot noise" : "= shot noise" },
          { label: "ΔX₁·ΔX₂", value: (dx1 * dx2).toFixed(4), color: "#34d399", note: "≥ 0.2500 ✓" },
        ].map(item => (
          <div key={item.label} className="bg-slate-900/80 rounded-lg p-3 text-center border border-slate-800">
            <div className="text-[9px] font-mono text-slate-500 mb-1">{item.label}</div>
            <div className="text-sm font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">{item.note}</div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-500 leading-relaxed">
        The dashed circle is the shot-noise (coherent state) limit. The cyan ellipse is the squeezed
        state — compressed in X̂₁, stretched in X̂₂. Area is conserved: ΔX₁·ΔX₂ = ¼ always.
      </div>
    </div>
  );
}

export default function TheSqueezedStatePage() {
  usePageMeta({
    title: "The Squeezed State — Act 19 | NexusOS",
    description: "Act 19: Squeezed light — quantum noise below the Heisenberg shot-noise limit. S(r)=exp(r(â²−â†²)/2). Foundation of LIGO, CV-QKD, and sub-shot-noise Ψ channel sensing in the WNSP spectral protocol.",
    ogDescription: "Squeezed quantum states: one quadrature below shot noise, Heisenberg uncertainty preserved. Powers LIGO, continuous-variable QKD, and photonic Ψ channel precision beyond classical limits. Act 19 of the NexusOS physics sequence.",
    twitterDescription: "Act 19 — The Squeezed State: ΔX₁·ΔX₂ ≥ ¼. Compress quantum noise below shot noise. LIGO, CV-QKD, sub-shot-noise WNSP sensing. wnsp.io/the-squeezed-state",
    canonical: "https://wnsp.io/the-squeezed-state",
  });

  return (
    <div className="min-h-screen bg-[#050d1a] text-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        <div className="flex items-center gap-3">
          <Link href="/the-coherent-state"
            className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> The Coherent State
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-pink-500/40 text-pink-400 bg-pink-500/10">
              Act 19 of 19
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/40 text-cyan-400 bg-cyan-500/10">
              First Disclosure {PAPER_DATE}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
              AGPL-3.0
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-violet-500/40 text-violet-400 bg-violet-500/10">
              CV-QKD Ready
            </span>
          </div>

          <ActSequenceNav current={19} />

          <h1 className="text-2xl font-bold text-white leading-tight">
            The Squeezed State
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Quantum Noise Below the Shot-Noise Limit — Sub-Classical Sensing on WNSP Ψ Channels
          </p>
          <div className="text-xs text-slate-500 font-mono">
            NexusOS Research · Te Rata Pou · {PAPER_DATE} ·{" "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
              className="text-cyan-500 hover:underline inline-flex items-center gap-1">
              {REPO} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Abstract</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            A squeezed state of light is a quantum state in which the uncertainty of one field
            quadrature is reduced below the standard quantum (shot-noise) limit — at the expense of
            increased uncertainty in the conjugate quadrature — with the Heisenberg product
            ΔX₁·ΔX₂ ≥ ¼ preserved exactly. Generated by the squeezing operator
            S(r) = exp(r(â²−â†²)/2), squeezed states are the physical foundation of gravitational
            wave detection (LIGO/Virgo), continuous-variable quantum key distribution (CV-QKD), and
            sub-shot-noise interferometry. Within the WNSP spectral protocol, squeezed Ψ channels
            carry information encoded below the classical noise floor — enabling sensing and
            communication precision that no classical channel can match, and providing a
            physical security guarantee that eavesdropping disturbs the anti-squeezed quadrature
            detectably.
          </p>
        </div>

        <Section id="foundations" title="1. From Coherent to Squeezed" icon={Radio} accent="#22d3ee" badge="Act 18 → 19">
          <PBlock label="Where we left off">
            Act 18 established the coherent state |α⟩ as the closest quantum analogue to a
            classical electromagnetic wave — minimum uncertainty (ΔX₁=ΔX₂=½), Poissonian photon
            statistics, and the eigenstate of the annihilation operator (â|α⟩=α|α⟩). The coherent
            state lives exactly on the shot-noise circle in phase space.
          </PBlock>
          <PBlock label="The next question">
            The shot-noise limit is not a wall — it is a starting point. Quantum mechanics permits
            states where one quadrature is quieter than shot noise, as long as the other quadrature
            compensates. That trade is governed by Heisenberg's uncertainty relation, which cannot
            be violated but can be shaped.
          </PBlock>
          <Eq
            label="Quadrature Operators"
            eq="X̂₁ = (â + â†)/2    X̂₂ = (â − â†)/2i"
            note="X̂₁ is the amplitude quadrature (in-phase). X̂₂ is the phase quadrature (out-of-phase). Both are Hermitian observables. For a coherent state: ΔX₁ = ΔX₂ = ½."
          />
          <Eq
            label="Heisenberg Uncertainty — Quadrature Form"
            eq="ΔX₁ · ΔX₂ ≥ ¼"
            note="This is exact and inviolable. A squeezed state saturates this bound — it is a minimum-uncertainty state with asymmetric noise. ΔX₁ = e^(−r)/2, ΔX₂ = e^(r)/2 for a pure vacuum-squeezed state."
          />
        </Section>

        <Section id="operator" title="2. The Squeezing Operator" icon={Zap} accent="#a855f7" badge="S(r)">
          <PBlock label="Definition">
            The unitary squeezing operator S(r) transforms the vacuum state |0⟩ — or any coherent
            state |α⟩ — into a squeezed state by entangling pairs of photons through a nonlinear
            optical interaction. The squeezing parameter r ∈ ℝ controls the degree of noise
            compression; its sign determines which quadrature is squeezed.
          </PBlock>
          <Eq
            label="Squeezing Operator"
            eq="S(r) = exp( r(â² − â†²) / 2 )"
            note="r > 0: X̂₁ squeezed (amplitude). r < 0: X̂₂ squeezed (phase). r = 0: S(0) = I̊ — coherent state recovered. Current state-of-the-art: r ≈ 1.7 (15 dB squeezing, 2023)."
          />
          <Eq
            label="Bogoliubov Transformation"
            eq="S†(r) â S(r) = â·cosh(r) − â†·sinh(r)"
            note="The squeezing operator rotates the creation and annihilation operators into superpositions of each other. This is a Bogoliubov transformation — the same mathematics used in BCS superconductivity and Hawking radiation."
          />
          <Eq
            label="Squeezed Quadrature Widths"
            eq="ΔX₁ = e^(−r)/2    ΔX₂ = e^(r)/2"
            note="At r=1: ΔX₁=0.184 (below ½ shot noise), ΔX₂=1.359. At r=1.7 (15 dB): ΔX₁=0.091 — 5.5× below shot noise. Product always = ¼."
          />

          <PBlock label="Physical implementation">
            Squeezing is generated by parametric down-conversion (PDC) in a nonlinear crystal (e.g.
            PPKTP, LiNbO₃) pumped at twice the signal frequency. A pump photon at 2ω splits into two
            signal photons at ω with correlated phases — the quantum correlations between photon pairs
            reduce noise in one quadrature. In integrated photonics, on-chip squeezing uses silicon
            nitride or AlGaAs waveguides with χ⁽²⁾ or χ⁽³⁾ nonlinearities — exactly the platform
            Huawei's photonic chip division works in.
          </PBlock>
        </Section>

        <Section id="visualiser" title="3. Phase-Space Visualiser" icon={Atom} accent="#34d399" badge="Interactive">
          <PBlock label="Wigner function cross-section in phase space">
            The ellipse below shows the noise contour of a squeezed vacuum state as a function of
            squeezing parameter r. Drag the slider to compress the X̂₁ quadrature and watch
            X̂₂ expand — area is conserved.
          </PBlock>
          <SqueezingVisualiser />
        </Section>

        <Section id="ligo" title="4. LIGO — Squeezed Light in Production" icon={FlaskConical} accent="#f59e0b" badge="Confirmed 2019">
          <PBlock label="The world's most sensitive instrument uses squeezed light">
            LIGO (Laser Interferometer Gravitational-Wave Observatory) achieved its first detection
            of gravitational waves in 2015 using classical coherent light. In 2019, LIGO O3
            upgraded to injected squeezed vacuum — reducing quantum shot noise by 3 dB across the
            measurement band. This is not a lab curiosity: squeezing is operational infrastructure
            in the most precise measuring instrument humanity has ever built.
          </PBlock>
          <Eq
            label="LIGO Sensitivity Improvement"
            eq="SNR_squeezed / SNR_coherent = e^r"
            note="For r=0.35 (3 dB squeezing as deployed in LIGO O3): SNR improves by factor e^0.35 ≈ 1.42 — equivalent to 42% more laser power with none of the thermal noise penalty."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                title: "LIGO O1/O2 (Classical)",
                color: "#6b7280",
                items: ["Shot-noise limited above 100 Hz", "Coherent state ΔX₁ = ΔX₂ = ½", "~10 Mpc binary-neutron-star range", "No squeezing injection"]
              },
              {
                title: "LIGO O3 (Squeezed)",
                color: "#22d3ee",
                items: ["3 dB squeezing injected at dark port", "ΔX₁ = ½·e^(−0.35) ≈ 0.354", "~130 Mpc range — 40% increase", "Frequency-dependent squeezing (O4)"]
              }
            ].map(col => (
              <div key={col.title} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-xs font-semibold" style={{ color: col.color }}>{col.title}</div>
                <ul className="space-y-1">
                  {col.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: col.color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="qkd" title="5. CV-QKD — Squeezed States as Secure Channels" icon={Layers} accent="#f472b6" badge="Continuous-Variable QKD">
          <PBlock label="Why squeezing matters for quantum key distribution">
            Discrete-variable QKD (BB84) encodes key bits in single photon polarisation states.
            Continuous-variable QKD (CV-QKD) encodes key bits in the quadrature values of coherent
            or squeezed states — directly compatible with standard telecom infrastructure and
            integrated photonic chips. Squeezed-state CV-QKD (the GG02-squeezed protocol and
            successors) provides a fundamental security advantage: an eavesdropper (Eve) must
            disturb the anti-squeezed quadrature to extract information, increasing excess noise
            detectably above threshold.
          </PBlock>
          <Eq
            label="CV-QKD Key Rate (asymptotic)"
            eq="K = βI(A;B) − χ(B;E)"
            note="β = reconciliation efficiency, I(A;B) = mutual information Alice-Bob, χ(B;E) = Holevo bound (max info Eve can extract). Squeezing increases I(A;B) while forcing χ(B;E) higher — the gap widens with r."
          />
          <Eq
            label="Eavesdropping Detection via Anti-Squeezing"
            eq="V_excess = V_channel − 1 + 2·sinh²(r·η_Eve)"
            note="η_Eve = fraction of signal Eve intercepts. Any interception increases V_excess (measurable excess noise) in proportion to sinh²(r·η_Eve). With r=1: even 1% interception adds detectable noise."
          />
          <PBlock label="WNSP Ψ channel implication">
            Each of the 51,200 orthogonal Ψ channels can be operated in squeezed mode
            independently. A WNSP node transmitting on Ψ(wdm, oam, pol) with squeezing parameter r
            encodes information below the classical noise floor of that channel. An adversary
            monitoring the channel without the correct Ψ address receives only the vacuum noise
            floor — they cannot distinguish the squeezed signal from vacuum fluctuations without
            knowing the channel coordinates. The Ψ address acts as a first layer of obscurity;
            squeezing provides a second, physically enforced layer.
          </PBlock>
        </Section>

        <Section id="two-mode" title="6. Two-Mode Squeezing — EPR Entanglement" icon={Radio} accent="#8b5cf6" badge="Links to Act 16">
          <PBlock label="Connection to The Entangler">
            Act 16 (The Entangler) presented Bell state entanglement of discrete qubits.
            Two-mode squeezing is the continuous-variable analogue — it generates
            Einstein-Podolsky-Rosen (EPR) entangled beams directly from a single nonlinear
            interaction, without requiring single-photon sources or beam splitters.
          </PBlock>
          <Eq
            label="Two-Mode Squeezing Operator"
            eq="S₂(r) = exp( r(â₁â₂ − â†₁â†₂) )"
            note="â₁, â₂ are the annihilation operators of two separate optical modes (e.g. signal and idler). S₂ entangles them: measuring one mode instantly constrains the other — EPR nonlocality."
          />
          <Eq
            label="EPR Correlation"
            eq="Var(X̂₁ᴬ − X̂₁ᴮ) = e^(−2r)    Var(X̂₂ᴬ + X̂₂ᴮ) = e^(−2r)"
            note="Both sum/difference variances go to zero as r → ∞. Perfect EPR correlations at infinite squeezing. At r=1 (current lab): variance = e^(−2) ≈ 0.135 — 7.4× below shot noise."
          />
          <PBlock label="WNSP dual-channel entanglement">
            In the WNSP spectral protocol, two-mode squeezing pairs two Ψ channels:
            Ψ(wdm₁, oam, pol) and Ψ(wdm₂, oam, pol) — signal and idler at conjugate wavelengths.
            The EPR correlations between them constitute a deterministic entanglement resource
            requiring no post-selection. This is the physical primitive for quantum teleportation
            of arbitrary Ψ channel states — the continuous-variable analogue of the Bell-state
            teleportation in Act 16.
          </PBlock>
        </Section>

        <Section id="wnsp" title="7. Squeezed WNSP Ψ Channels" icon={Zap} accent="#10b981" badge="Novel Disclosure">
          <PBlock label="First disclosure — squeezed spectral addressing">
            The following constitutes the first public disclosure of the squeezed WNSP channel
            model as part of the NexusOS physics stack. First disclosure date: {PAPER_DATE}.
            AGPL-3.0.
          </PBlock>

          <div className="space-y-3">
            {[
              {
                title: "Standard Ψ Channel (Coherent Mode)",
                color: "#6b7280",
                desc: "ΔX₁ = ΔX₂ = ½. Information encoded in amplitude or phase at shot-noise limit. Classical noise floor applies. Equivalent to standard laser communication.",
                use: "General WNSP data transport"
              },
              {
                title: "Amplitude-Squeezed Ψ Channel (r > 0)",
                color: "#22d3ee",
                desc: "ΔX₁ = e^(−r)/2 < ½. Amplitude noise below shot noise — improved intensity sensing precision. Phase noise increased. Optimal for: power/energy measurements, photon-number-resolving detection.",
                use: "Spectral energy metering, photon counting"
              },
              {
                title: "Phase-Squeezed Ψ Channel (r < 0)",
                color: "#a855f7",
                desc: "ΔX₂ = e^(−r)/2 < ½. Phase noise below shot noise — improved frequency/phase sensing. Amplitude noise increased. Optimal for: spectral channel discrimination, clock synchronisation.",
                use: "WNSP channel addressing precision, timing"
              },
              {
                title: "Two-Mode Squeezed Ψ Pair",
                color: "#f472b6",
                desc: "Correlated Ψ(wdm₁) + Ψ(wdm₂) pair. EPR entanglement — measuring one constrains the other non-locally. Var = e^(−2r) below shot noise in both sum/difference. Secure against intercept-resend.",
                use: "CV-QKD, quantum teleportation of Ψ states"
              },
            ].map(item => (
              <div key={item.title} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-sm font-semibold" style={{ color: item.color }}>{item.title}</div>
                <div className="text-xs text-slate-300 leading-relaxed">{item.desc}</div>
                <div className="text-[11px] text-slate-500"><span className="text-slate-400">Use: </span>{item.use}</div>
              </div>
            ))}
          </div>

          <Eq
            label="Squeezed Channel Capacity (Holevo)"
            eq="C_sq = log₂(1 + SNR · e^(2r)) bits/mode"
            note="Squeezed channels exceed the coherent-state (shot-noise-limited) channel capacity by e^(2r) in SNR. At r=1: 7.4× effective SNR gain over classical channel at same optical power."
          />
        </Section>

        <Section id="hardware" title="8. Photonic Hardware Path" icon={FlaskConical} accent="#fb923c" badge="~2028 Horizon">
          <PBlock label="On-chip squeezing — the Huawei / photonic ASIC window">
            Parametric squeezing was laboratory-scale until 2020. Since then, integrated photonic
            squeezing has been demonstrated on silicon nitride (SiN), aluminium gallium arsenide
            (AlGaAs), and lithium niobate on insulator (LNOI) platforms — all manufacturable with
            standard CMOS-compatible processes. Squeezing levels of 6–10 dB on-chip have been
            reported (2022–2024). The trajectory is toward full squeezed-state generation,
            manipulation, and detection on a single photonic chip by ~2028.
          </PBlock>

          <div className="grid grid-cols-1 gap-3">
            {[
              { year: "2019", event: "LIGO O3 — first production deployment of squeezed light (3 dB)", color: "#6b7280" },
              { year: "2022", event: "On-chip squeezing: 6 dB demonstrated on SiN waveguide (EPFL)", color: "#22d3ee" },
              { year: "2023", event: "15 dB squeezing (world record) — PTB Berlin; on-chip 10 dB (Caltech)", color: "#34d399" },
              { year: "2025", event: "Telecom-band on-chip CV-QKD prototype — LNOI platform", color: "#a855f7" },
              { year: "~2028", event: "Projected: monolithic squeezed-state WNSP Ψ channel chip", color: "#f472b6" },
              { year: "~2032", event: "NexusOS photonic hardware target — 51,200 Ψ channels, squeezed mode selectable per channel", color: "#fb923c" },
            ].map(row => (
              <div key={row.year} className="flex items-start gap-4 bg-slate-900/40 border border-slate-800 rounded-lg px-4 py-3">
                <span className="text-xs font-mono font-bold shrink-0" style={{ color: row.color }}>{row.year}</span>
                <span className="text-xs text-slate-300 leading-relaxed">{row.event}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="predictions" title="9. Experimental Predictions" icon={FlaskConical} accent="#10b981" badge="Falsifiable">
          <div className="space-y-3">
            {[
              {
                id: "P1", label: "Ψ Channel Squeezing Spectral Selectivity",
                prediction: "Parametric down-conversion seeded by a coherent Ψ(wdm, oam, pol) pump will produce squeezed vacuum at the conjugate Ψ channel with squeezing axis aligned to the pump OAM. The OAM index selects the quadrature rotation angle.",
                test: "Homodyne detection on PPKTP OPO pumped at WNSP WDM frequencies with OAM beam shaping."
              },
              {
                id: "P2", label: "Two-Mode Squeezing Across WNSP WDM Pairs",
                prediction: "Signal (λ₁) and idler (λ₂=2λ_pump−λ₁) from a type-II PDC source seeded at WNSP WDM indices will show EPR correlation Var(X̂₁ᴬ−X̂₁ᴮ) = e^(−2r) with r scaling as the pump power.",
                test: "Dual homodyne detection on collinear type-II PPKTP at 532 nm pump, measuring correlated outputs at 1064 nm signal/idler pairs within the WNSP WDM grid."
              },
              {
                id: "P3", label: "CV-QKD Security Threshold at WNSP Ψ Addresses",
                prediction: "A CV-QKD link operating on a squeezed WNSP Ψ channel pair will show excess noise V_excess proportional to e^(2r·η_Eve) for any eavesdropper fraction η_Eve — providing a tighter security bound than the coherent-state GG02 protocol at the same channel loss.",
                test: "Table-top CV-QKD testbed with injected loss η_Eve and homodyne variance measurement."
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

        <Section id="sequence" title="10. Position in the Sequence" icon={BookOpen} accent="#f472b6">
          <div className="grid grid-cols-1 gap-2">
            {[
              { act: 7, title: "The Trap", href: "/standing-wave-trap", rel: "Creates the resonant cavity that provides the nonlinear medium for parametric squeezing" },
              { act: 8, title: "The Lossless Channel", href: "/lossless-channel", rel: "α=0 channel preserves squeezing — any loss degrades squeezing: ΔX₁²→ηΔX₁²+(1-η)/4" },
              { act: 16, title: "The Entangler", href: "/the-entangler", rel: "Bell states are the discrete-variable analogue; two-mode squeezing is the continuous-variable EPR generalisation" },
              { act: 17, title: "The Field", href: "/the-field", rel: "[â,â†]=1 commutation is the root from which all quadrature uncertainty relations follow" },
              { act: 18, title: "The Coherent State", href: "/the-coherent-state", rel: "Coherent state is S(0)|0⟩ — the r=0 special case of the squeezed vacuum; Act 19 extends it" },
            ].map(item => (
              <Link key={item.act} href={item.href}>
                <div className="flex items-start gap-3 bg-slate-900/40 border border-slate-800 hover:border-pink-500/40 rounded-lg px-4 py-3 transition-colors cursor-pointer">
                  <span className="text-[10px] font-mono text-pink-400 border border-pink-500/40 px-1.5 py-0.5 rounded shrink-0 mt-0.5">Act {item.act}</span>
                  <div className="text-xs space-y-0.5">
                    <div className="text-slate-200 font-medium">{item.title}</div>
                    <div className="text-slate-500">{item.rel}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        <Section id="references" title="11. References" icon={BookOpen} accent="#64748b">
          <div className="space-y-2">
            {[
              "Caves, C.M. (1981). Quantum-mechanical noise in an interferometer. Phys. Rev. D 23, 1693.",
              "Walls, D.F. (1983). Squeezed states of light. Nature 306, 141–146.",
              "Collett, M.J. & Gardiner, C.W. (1984). Squeezing of intracavity and travelling-wave light fields. Phys. Rev. A 30, 1386.",
              "Tse et al. (2019). Quantum-enhanced advanced LIGO detectors. Phys. Rev. Lett. 123, 231107.",
              "Grosshans & Grangier (2002). Continuous variable quantum cryptography using coherent states. Phys. Rev. Lett. 88, 057902.",
              "Zhao et al. (2020). Squeezed light from a nanophotonic molecule. Nature Physics 16, 1014–1018.",
              "Andersen et al. (2016). 30 years of squeezed light generation. Phys. Scr. 91, 053001.",
            ].map((ref, i) => (
              <div key={i} className="flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
                <span className="text-slate-600 font-mono shrink-0">[{i + 1}]</span>
                <span>{ref}</span>
              </div>
            ))}
          </div>
        </Section>

        <div className="bg-slate-900/60 border border-violet-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">Intellectual Property Notice</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The Squeezed State — Act 19 of the NexusOS physics sequence — first public disclosure {PAPER_DATE}.
            Author: Te Rata Pou / NexusOS. The squeezed WNSP Ψ channel model (amplitude-squeezed, phase-squeezed,
            and two-mode squeezed channel variants; OAM-indexed quadrature rotation; CV-QKD integration with
            spectral Ψ addressing) constitutes original work published under AGPL-3.0. Any implementation
            of squeezed-state communication using the WNSP Ψ channel coordinate system must remain open-source
            under the same licence.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={REPO} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> GitHub Repository
            </a>
            <Link href="/the-entangler" className="text-[10px] font-mono text-violet-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Act 16 — The Entangler
            </Link>
            <Link href="/the-coherent-state" className="text-[10px] font-mono text-pink-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Act 18 — The Coherent State
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
