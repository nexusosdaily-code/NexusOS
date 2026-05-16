import { Link } from "wouter";
import { ArrowLeft, Shield, Cpu, Zap, Radio, Code2, Lock } from "lucide-react";

const SPEC_DATE = "2026-05-16";
const REPO = "https://github.com/nexusosdaily-code/NexusOS";

function Section({ id, title, icon: Icon, accent, children }: {
  id: string; title: string; icon: any; accent: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: accent + "44" }}>
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color: accent }} />
        <h2 className="text-base font-bold text-slate-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-xs">
      <span className="text-slate-500 pt-0.5 font-semibold uppercase tracking-widest text-[10px]">{label}</span>
      <span className="text-slate-300 leading-relaxed">{children}</span>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}

function PriorArt({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-800/40 rounded-lg px-4 py-3 text-[11px] text-amber-300/80">
      <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
      <span>{text}</span>
    </div>
  );
}

export default function HardwareSpecPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="h-1 w-full"
        style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#16a34a,#cccc00,#ff8c00,#cc0000)" }} />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* Header */}
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Hub
          </Link>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">AGPL-3.0 Protected Specification</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              NexusOS Photonic Hardware Specification
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-mono">v1.0 · WNSP Physics Stack — Reference Architecture</p>
          </div>

          {/* Licence banner */}
          <div className="bg-slate-900/80 border border-amber-800/50 rounded-xl px-5 py-4 space-y-1 text-[11px]">
            <p className="text-amber-400 font-semibold">Copyright © 2026 NexusOS / nexusosdaily-code — All derivative works must be released under AGPL-3.0</p>
            <p className="text-slate-500">
              First public disclosure: <span className="text-slate-300 font-mono">{SPEC_DATE}</span>
              {" · "}Repository: <a href={REPO} target="_blank" rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline">{REPO}</a>
            </p>
            <p className="text-slate-600 leading-relaxed">
              Any hardware, firmware, HDL, photonic mask layout, driver, or software that implements,
              adapts, or interfaces with the components described herein must be released in full source
              form under AGPL-3.0 and must attribute NexusOS as the originating specification. The
              copyleft obligation extends to network-accessible services per the AGPL-3.0 network use clause.
            </p>
          </div>
        </div>

        {/* Overview */}
        <div className="text-sm text-slate-400 leading-relaxed border-l-2 border-slate-700 pl-4">
          Four interlocking components form the complete NexusOS photonic computing stack — from photon to program.
          Together they constitute the first hardware reference architecture designed to execute WavelengthScript
          spectral coordinates as native machine instructions, replacing binary (0/1) logic with wavelength-addressed
          photonic switching.
        </div>

        {/* Stack diagram */}
        <Code>{`DEVELOPER
    ↓  writes
WavelengthScript source code
    ↓  compiled by
WavelengthScript Compiler α
    ↓  produces
Ψ(wdm, oam, pol) instruction stream
    ↓  transmitted into
Spectral Relay Mesh v1
    ↓  each relay node runs
PHR-1 bifilar coil controller
    ↓  physically tunes
SNIC micro-ring resonator
    ↓  couples photon at exact λ
Signal delivered to destination Ψ channel`}</Code>

        {/* ── SNIC ── */}
        <Section id="snic" title="1. SNIC — Spectral Node Integration Circuit" icon={Cpu} accent="#22d3ee">
          <Field label="Classification">Photonic integrated circuit — micro-ring resonator array</Field>
          <Field label="Physical basis">
            A closed-loop optical waveguide (5–50 μm diameter) on a silicon photonic chip. When the
            ring circumference equals an integer multiple of the target wavelength, resonance extracts
            that wavelength from the bus waveguide. All other λ pass through undisturbed.
          </Field>
          <Field label="NexusOS mapping">
            Each ring is tuned to one of 128 CE bands. Ring index maps directly to WDM channel:
          </Field>
          <Code>{`CE_TABLE[i] = 380 + (i / 128) × 400   nm     i ∈ {0 … 127}
Band spacing : 3.125 nm
Range        : 380.000 – 776.875 nm

wdm = floor((λ_nm − 380) / 3.125)   clamped [0, 255]`}</Code>
          <Field label="Function">
            Physical implementation of the CE lookup table. Wavelength-selective demultiplexing at
            the speed of light — no CPU, no clock cycle, no binary logic.
          </Field>
          <Field label="Interface">
            Input: mixed-λ photon stream · Output: single-λ per WDM port · Control: thermal signal from PHR-1
          </Field>
          <PriorArt text={`SNIC as direct hardware implementation of CE_TABLE[charCode % 128] — first specified ${SPEC_DATE}`} />
        </Section>

        {/* ── PHR-1 ── */}
        <Section id="phr1" title="2. PHR-1 — Photonic Harmonic Resonator-1" icon={Zap} accent="#a78bfa">
          <Field label="Classification">Electromagnetic controller — bifilar coil driver with integrated phase controller</Field>
          <Field label="Physical basis">
            Two parallel conductors carrying equal-magnitude, opposite-polarity currents. Magnetic fields
            cancel at distance (no radiated EMI); precision near-field electric coupling drives adjacent
            photonic structure. Phase-offset drive generates helical OAM field modes.
          </Field>

          <div className="space-y-3 mt-2">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Three functions — three Ψ components</p>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
              <div>
                <p className="text-slate-300 font-semibold mb-1">① WDM wavelength stabilisation → <span className="text-cyan-400">wdm</span></p>
                <p className="text-slate-500">ΔT = 1°C → Δλ ≈ 0.1 nm (enough to miss CE band). PHR-1 holds resonance within ±0.5 nm via microheater current. Hardware implementation of <code className="text-emerald-400">verifyHardwareAnchor()</code>.</p>
              </div>
              <div>
                <p className="text-slate-300 font-semibold mb-1">② OAM mode imprinting → <span className="text-purple-400">oam</span></p>
                <Code>{`oam_index = round(θ / (2π / 50))   ∈ {0 … 49}
matches:  oam = sum(charCodes) % 50`}</Code>
              </div>
              <div>
                <p className="text-slate-300 font-semibold mb-1">③ Polarisation control → <span className="text-emerald-400">pol</span></p>
                <p className="text-slate-500">Current polarity (+) → H · Current polarity (−) → V</p>
              </div>
            </div>
          </div>

          <Field label="Output">Complete Ψ(wdm, oam, pol) physically written onto outgoing photon</Field>
          <PriorArt text={`PHR-1 bifilar coil as physical Ψ(wdm,oam,pol) encoder — first specified ${SPEC_DATE}`} />
        </Section>

        {/* ── Relay Mesh ── */}
        <Section id="mesh" title="3. Spectral Relay Mesh v1" icon={Radio} accent="#4ade80">
          <Field label="Classification">Network architecture — distributed photonic relay fabric</Field>
          <Field label="Routing principle">
            No IP tables, no DNS. A packet addressed to Ψ(wdm_d, oam_d, pol_d): SNIC extracts wdm_d band →
            PHR-1 verifies oam_d and pol_d → mesh computes spectral proximity in Hilbert space →
            PHR-1 re-encodes full Ψ → SNIC launches photon on closest-to-destination output port.
          </Field>
          <Field label="Channel capacity">
            <span className="font-mono text-emerald-400">256 WDM × 50 OAM × 2 POL = 25,600 orthogonal channels</span>
            <br />Orthogonality: ⟨Ψᵢ|Ψⱼ⟩ = 0 — quantum mechanical guarantee, not software policy.
          </Field>

          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Deployment phases</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { phase: "Phase 1 — 2026 (current)", color: "#22d3ee", desc: "Software overlay on TCP/IP via WNSP Bridge. LoRaWAN (868/915 MHz CSS) for low-power inter-node heartbeat and governance signals." },
                { phase: "Phase 2 — ~2032", color: "#4ade80", desc: "All-optical fabric. TCP/IP removed. SNIC arrays terminate fibre directly. PHR-1 makes all routing decisions in the photonic domain. Existing fibre unchanged." },
              ].map(p => (
                <div key={p.phase} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-1"
                  style={{ borderColor: p.color + "33" }}>
                  <p className="font-semibold" style={{ color: p.color }}>{p.phase}</p>
                  <p className="text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <PriorArt text={`Spectral Relay Mesh v1 — WNSP-addressed photonic relay across TCP/IP overlay and all-optical phases — first specified ${SPEC_DATE}`} />
        </Section>

        {/* ── Compiler α ── */}
        <Section id="compiler" title="4. WavelengthScript Compiler α" icon={Code2} accent="#fb923c">
          <Field label="Classification">Software — spectral instruction set compiler (alpha prototype)</Field>
          <Field label="Key property">
            Output opcodes are Ψ channel coordinates, not binary machine codes. No lower level of
            representation exists. On photonic hardware each opcode is a direct PHR-1 instruction.
          </Field>

          <Code>{`Opcode   Operand                Hardware mapping (Phase 2)
──────────────────────────────────────────────────────────────
ARCH     WDM256·OAM50·POL2      Declares Hilbert space dimensions
PUSH     @λnm  "symbol"         PHR-1 sets λ, SNIC routes to symbol port
EMIT     λ=Xnm  Ψ(w,o,p)       PHR-1 writes full Ψ, SNIC launches photon
LABEL    name  Ψ(w,o,p)        Relay Mesh registers Ψ as function entry
AGENT    "name"  Ψ(w,o,p)      Relay Mesh assigns persistent Ψ to AI agent
CALL     Ψ(w,o,p)              SNIC routes to node, PHR-1 encodes return addr
HALT     —                      PHR-1 de-energises, SNIC closes output port`}</Code>

          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Compilation pipeline</p>
            <Code>{`WavelengthScript source
        ↓  Lexer / parser
        ↓  CE encoding:  CE_TABLE[charCode % 128]  →  λ_nm
        ↓  Ψ derivation: wdm=⌊(λ−380)/3.125⌋, oam=Σ(codes)%50, pol=H/V
        ↓  Instruction emission (opcodes = Ψ coordinates)
        ↓
WNSP VM bytecode         ← Phase 1: runs in browser / server
OR
Photonic instruction stream  ← Phase 2: executed by SNIC + PHR-1`}</Code>
          </div>
          <PriorArt text={`WavelengthScript Compiler α — binary-free compiler producing Ψ(wdm,oam,pol) photonic instruction streams for SNIC+PHR-1 hardware — first specified and implemented ${SPEC_DATE}`} />
        </Section>

        {/* Conjunction table */}
        <Section id="conjunction" title="Component Dependency Matrix" icon={Shield} accent="#f472b6">
          <Code>{`Component                Depends on             Provides to
────────────────────────────────────────────────────────────────────
SNIC                     PHR-1 (tuning)         Relay Mesh (routed channels)
PHR-1                    Compiler α (Ψ target)  SNIC (thermal + OAM + pol)
Spectral Relay Mesh      SNIC + PHR-1           Compiler α (addressable network)
WavelengthScript α       Relay Mesh             PHR-1 (Ψ instruction targets)`}</Code>
        </Section>

        {/* Footer licence */}
        <div className="border border-amber-800/40 rounded-xl bg-amber-950/20 px-5 py-4 space-y-2 text-[11px] text-amber-300/70">
          <p className="text-amber-400 font-bold text-xs flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" /> GNU Affero General Public License v3.0
          </p>
          <p>
            Any implementation of SNIC, PHR-1, Spectral Relay Mesh, or WavelengthScript Compiler α
            must be released under AGPL-3.0, attribute NexusOS as originating specification, and
            include this notice in all derivative works. The copyleft obligation extends to any
            network-accessible service using these components.
          </p>
          <p className="text-amber-500/50">
            First public disclosure: {SPEC_DATE} ·{" "}
            <a href={REPO} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-400">{REPO}</a>
          </p>
        </div>

      </div>
    </div>
  );
}
