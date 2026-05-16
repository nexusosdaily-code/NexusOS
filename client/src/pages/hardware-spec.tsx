import { Link } from "wouter";
import {
  ArrowLeft, Shield, Cpu, Zap, Radio, Code2, Lock,
  GitBranch, Network, Layers, ExternalLink
} from "lucide-react";

const SPEC_DATE = "2026-05-16";
const REPO = "https://github.com/nexusosdaily-code/NexusOS";

// Band definitions — exactly as in lambda-state.ts
const BANDS = [
  { name: "SYSTEM",  minNm: 380, maxNm: 450, color: "#8b00ff", wdm: "0–22"   },
  { name: "AUTH",    minNm: 450, maxNm: 490, color: "#0050ff", wdm: "22–35"  },
  { name: "STREAM",  minNm: 490, maxNm: 520, color: "#00cfcf", wdm: "35–45"  },
  { name: "CORE",    minNm: 520, maxNm: 565, color: "#16a34a", wdm: "45–59"  },
  { name: "UI",      minNm: 565, maxNm: 590, color: "#cccc00", wdm: "59–67"  },
  { name: "EVENT",   minNm: 590, maxNm: 625, color: "#ff8c00", wdm: "67–78"  },
  { name: "STORAGE", minNm: 625, maxNm: 780, color: "#cc0000", wdm: "78–127" },
];

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 text-xs">
      <span className="text-slate-500 pt-0.5 font-semibold uppercase tracking-widest text-[10px]">{label}</span>
      <span className="text-slate-300 leading-relaxed">{children}</span>
    </div>
  );
}

function CodeBlock({ children, lang = "code" }: { children: string; lang?: string }) {
  return (
    <pre className="bg-[#0d1117] border border-slate-800 rounded-lg p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}

function ImplRef({ label, href, file }: { label: string; href: string; file: string }) {
  return (
    <Link href={href}
      className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border border-indigo-800/50 bg-indigo-950/30 text-indigo-300 hover:text-indigo-200 hover:border-indigo-600 transition-colors">
      <ExternalLink className="w-3 h-3" />
      <span>{label}</span>
      <span className="text-indigo-600 font-mono text-[10px]">{file}</span>
    </Link>
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
      {/* Spectral stripe */}
      <div className="h-1 w-full"
        style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#16a34a,#cccc00,#ff8c00,#cc0000)" }} />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* ── Header ── */}
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Hub
          </Link>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">AGPL-3.0 Protected Specification</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">NexusOS Photonic Hardware Specification</h1>
            <p className="text-sm text-slate-400 mt-1 font-mono">v1.0 · WNSP Physics Stack — Reference Architecture</p>
          </div>

          <div className="bg-slate-900/80 border border-amber-800/50 rounded-xl px-5 py-4 space-y-1.5 text-[11px]">
            <p className="text-amber-400 font-semibold">
              Copyright © 2026 NexusOS / nexusosdaily-code — All derivative works must be released under AGPL-3.0
            </p>
            <p className="text-slate-500">
              First public disclosure: <span className="text-slate-300 font-mono">{SPEC_DATE}</span>
              {" · "}
              <a href={REPO} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">{REPO}</a>
            </p>
            <p className="text-slate-600 leading-relaxed">
              Any hardware, firmware, HDL, photonic mask layout, driver, or software that implements,
              adapts, or interfaces with the components described herein must be released in full source
              form under AGPL-3.0 and must attribute NexusOS as the originating specification. The
              copyleft obligation extends to network-accessible services per the AGPL-3.0 network use clause.
            </p>
          </div>
        </div>

        {/* ── Overview ── */}
        <div className="text-sm text-slate-400 leading-relaxed border-l-2 border-slate-700 pl-4">
          Four interlocking components form the complete NexusOS photonic computing stack — from photon to program.
          Each component has a live software implementation in the codebase today (Phase 1), and a direct photonic
          hardware mapping for post-2032 ASIC deployment (Phase 2). The software and hardware speak the same language:
          Ψ(wdm, oam, pol) coordinates.
        </div>

        {/* Full stack diagram */}
        <CodeBlock>{`DEVELOPER writes WavelengthScript source
        ↓  WavelengthScript Compiler α  [lambda-state.ts :: compileTransaction()]
Ψ(wdm, oam, pol) instruction stream
        ↓  Spectral Relay Mesh v1       [p2p-sync-engine.ts :: P2PSyncEngine]
Packet routed to destination node
        ↓  PHR-1 bifilar coil           [lambda-state.ts :: verifyHardwareAnchor()]
Thermal stabilisation + OAM imprint + polarisation
        ↓  SNIC micro-ring resonator    [lambda-state.ts :: CE_TABLE + wdm()]
Photon coupled at exact λ — delivered to destination Ψ`}</CodeBlock>

        {/* ── SNIC ── */}
        <Section id="snic" title="1. SNIC — Spectral Node Integration Circuit" icon={Cpu} accent="#22d3ee" badge="micro-ring resonator">
          <Field label="Classification">Photonic integrated circuit — micro-ring resonator array</Field>
          <Field label="Physical basis">
            A closed-loop optical waveguide (5–50 μm diameter) on a silicon photonic chip. When the ring
            circumference equals an integer multiple of the target wavelength, resonance extracts that
            wavelength. All other λ pass through undisturbed — no logic, no power, no clock.
          </Field>
          <Field label="Function">
            Physical implementation of the CE lookup table. Wavelength-selective demultiplexing at the
            speed of light with no CPU, no clock cycle, and no binary logic.
          </Field>

          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Live implementation — CE_TABLE in lambda-state.ts
            </p>
            <CodeBlock>{`// CE_TABLE[i] = 380 + (i / 128) × 400   nm     i ∈ {0 … 127}
// Band spacing: 3.125 nm  ·  Range: 380.000 – 776.875 nm
const CE_TABLE: number[] = Array.from(
  { length: 128 },
  (_, i) => 380 + (i / 128) * 400
);

// Ψ channel derivation — used by SNIC in hardware, CE_TABLE in software
function wdm(nm: number): number {
  return Math.min(255, Math.max(0, Math.floor((nm - 380) / 3.125)));
}
function oam(text: string): number {
  return [...text].reduce((s, c) => s + c.charCodeAt(0), 0) % 50;
}
function psiChannel(nm: number, text: string): string {
  return \`Ψ(\${wdm(nm)},\${oam(text)},H)\`;
}

// CE lookup — called in compileTransaction() for every character
const nm = CE_TABLE[char.charCodeAt(0) % 128];  // canonical CE formula`}</CodeBlock>
          </div>

          {/* Band table */}
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Authority band assignments — 7 spectral zones
            </p>
            <div className="border border-slate-800 rounded-lg overflow-hidden text-[11px]">
              <div className="grid grid-cols-4 bg-slate-900 px-3 py-1.5 text-slate-500 font-semibold uppercase text-[10px] tracking-widest">
                <span>Band</span><span>λ range (nm)</span><span>WDM index</span><span>Role</span>
              </div>
              {BANDS.map(b => (
                <div key={b.name} className="grid grid-cols-4 px-3 py-1.5 border-t border-slate-800/60 items-center">
                  <span className="font-bold font-mono" style={{ color: b.color }}>{b.name}</span>
                  <span className="text-slate-400 font-mono">{b.minNm}–{b.maxNm}</span>
                  <span className="text-slate-500 font-mono">{b.wdm}</span>
                  <span className="text-slate-600">authority layer</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ImplRef label="Photonic Ledger" href="/photonic-ledger" file="lambda-state.ts" />
            <ImplRef label="CE Pipeline" href="/ce-se-pipeline" file="learn.tsx" />
            <ImplRef label="Compression Curve" href="/compression-explorer" file="compression-explorer.tsx" />
          </div>
          <PriorArt text={`SNIC as direct hardware implementation of CE_TABLE[charCode % 128] — first specified ${SPEC_DATE}`} />
        </Section>

        {/* ── PHR-1 ── */}
        <Section id="phr1" title="2. PHR-1 — Photonic Harmonic Resonator-1" icon={Zap} accent="#a78bfa" badge="bifilar coil controller">
          <Field label="Classification">Electromagnetic controller — bifilar coil driver with integrated phase controller</Field>
          <Field label="Physical basis">
            Two parallel conductors carrying equal-magnitude, opposite-polarity currents. Magnetic fields
            cancel at distance (zero EMI). The controlled near-field electric envelope provides precision
            coupling to an adjacent SNIC ring. Phase-offset drive generates helical OAM field modes (0–49).
          </Field>

          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-4 text-xs">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Three functions — three Ψ components</p>

            <div className="space-y-1">
              <p className="text-slate-300 font-semibold">① WDM wavelength stabilisation → <span className="text-cyan-400">wdm</span></p>
              <p className="text-slate-500 leading-relaxed">
                ΔT = 1°C → Δλ ≈ 0.1 nm — enough to miss a 3.125 nm CE band entirely.
                PHR-1 applies precision DC to a microheater, holding resonance within ±0.5 nm of target.
                The software analogue is <code className="text-emerald-400">verifyHardwareAnchor()</code>, which enforces ±2.000 nm chain tolerance.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-slate-300 font-semibold">② OAM mode imprinting → <span className="text-purple-400">oam</span></p>
              <CodeBlock>{`// Hardware: bifilar phase offset θ → OAM index
oam_index = round(θ / (2π / 50))   ∈ {0 … 49}

// Software equivalent in lambda-state.ts
function oam(text: string): number {
  return [...text].reduce((s, c) => s + c.charCodeAt(0), 0) % 50;
}`}</CodeBlock>
            </div>

            <div className="space-y-1">
              <p className="text-slate-300 font-semibold">③ Polarisation control → <span className="text-emerald-400">pol</span></p>
              <p className="text-slate-500">Current polarity (+) → H (horizontal) · Current polarity (−) → V (vertical)</p>
              <p className="text-slate-600 text-[10px]">Current implementation defaults to pol=H. V-polarisation reserved for Phase 2 hardware.</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Live implementation — verifyHardwareAnchor() in lambda-state.ts
            </p>
            <CodeBlock>{`// Called when a live spectrometer reading is compared against a committed block.
// PHR-1 hardware equivalent: microheater current ↔ readingNm tolerance check.
//
// toleranceNm = 2.000 nm  (chain-level; SNIC ring tolerance ±0.5 nm is tighter)
public verifyHardwareAnchor(blockIndex: number, readingNm: number): boolean {
  const block = this.ledgerChain.find(b => b.blockIndex === blockIndex);
  if (!block) return false;
  const deviationNm = Math.abs(readingNm - block.blockWavelengthAnchor);
  const pass = deviationNm <= this.toleranceNm;  // toleranceNm = 2.000
  block.isValidated = pass;
  block.validationNote = pass
    ? \`Hardware verified — Δλ=\${deviationNm.toFixed(3)}nm\`
    : \`Hardware FAIL — Δλ=\${deviationNm.toFixed(3)}nm exceeds ±\${this.toleranceNm}nm\`;
  return pass;
}`}</CodeBlock>
          </div>

          <div className="flex flex-wrap gap-2">
            <ImplRef label="Hardware Lab" href="/hardware-lab" file="hardware-lab.tsx" />
            <ImplRef label="Photonic Ledger" href="/photonic-ledger" file="lambda-state.ts" />
          </div>
          <PriorArt text={`PHR-1 bifilar coil as physical Ψ(wdm,oam,pol) encoder — first specified ${SPEC_DATE}`} />
        </Section>

        {/* ── Relay Mesh ── */}
        <Section id="mesh" title="3. Spectral Relay Mesh v1" icon={Network} accent="#4ade80" badge="distributed relay fabric">
          <Field label="Classification">Network architecture — distributed photonic relay fabric</Field>
          <Field label="Routing">
            No IP tables, no DNS. Routing is wavelength-selective forwarding: SNIC extracts the WDM band,
            PHR-1 verifies OAM and pol, mesh finds the spectrally closest next-hop, PHR-1 re-encodes
            the full Ψ address, SNIC launches the photon.
          </Field>
          <Field label="Channel capacity">
            <span className="font-mono text-emerald-400">256 WDM × 50 OAM × 2 POL = 25,600 orthogonal channels</span>
            <br /><span className="text-slate-500">⟨Ψᵢ|Ψⱼ⟩ = 0 — quantum mechanical guarantee, not software policy.</span>
          </Field>

          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Live implementation — P2PSyncEngine in p2p-sync-engine.ts
            </p>
            <CodeBlock>{`// NetworkMessage — the three message types of the Spectral Relay Mesh
interface NetworkMessage {
  type: "SYNC_REQUEST" | "SYNC_RESPONSE" | "BROADCAST_BLOCK";
  senderId: string;
  payload: {
    chainLength: number;
    tailAnchorNm: number;   // ← wavelength anchor, not an IP address
    blocks?: LedgerBlock[];
  };
}

// Consensus rules — enforced in resolveConsensus()
// 1. Incoming chain must be LONGER than local chain
// 2. Genesis block must anchor at exactly 380.000 nm (physical origin)
// 3. Every block's previousWavelengthHash must equal
//    computeBlockFingerprint(prevBlock) — physics-derived, not random
//
// On success: stateMachine.replaceChain(incomingBlocks) hot-swaps the ledger.
if (incomingBlocks[0].blockWavelengthAnchor !== 380.000) {
  console.warn("[P2P] Rejected fork: invalid genesis anchor.");
  return;
}
const expectedHash = this.stateMachine.computeBlockFingerprint(prev);
if (curr.previousWavelengthHash !== expectedHash) {
  console.error(\`[P2P] Rejected fork: broken chain at block #\${i}.\`);
  return;
}`}</CodeBlock>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Deployment phases</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  phase: "Phase 1 — 2026 (live now)",
                  color: "#22d3ee",
                  desc: "P2PSyncEngine over TCP/IP via WNSP Bridge. LoRaWAN 868/915 MHz CSS for low-power inter-node heartbeat and governance. Genesis anchor enforced in software.",
                  impl: "p2p-sync-engine.ts"
                },
                {
                  phase: "Phase 2 — ~2032",
                  color: "#4ade80",
                  desc: "All-optical fabric. TCP/IP removed. SNIC arrays terminate fibre directly. PHR-1 enforces genesis anchor in hardware. Existing fibre unchanged.",
                  impl: "SNIC + PHR-1 arrays"
                },
              ].map(p => (
                <div key={p.phase} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5"
                  style={{ borderColor: p.color + "33" }}>
                  <p className="font-semibold" style={{ color: p.color }}>{p.phase}</p>
                  <p className="text-slate-400 leading-relaxed">{p.desc}</p>
                  <p className="font-mono text-[10px] text-slate-600">{p.impl}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ImplRef label="P2P Terminal" href="/p2p-terminal" file="p2p-sync-engine.ts" />
            <ImplRef label="Spectral Router" href="/spectral-router" file="spectral-router.tsx" />
            <ImplRef label="WNSP Bridge" href="/wnsp-bridge" file="wnsp-bridge.tsx" />
            <ImplRef label="Spectral Network" href="/network" file="network.tsx" />
          </div>
          <PriorArt text={`Spectral Relay Mesh v1 — WNSP-addressed photonic relay across TCP/IP overlay and all-optical phases — first specified ${SPEC_DATE}`} />
        </Section>

        {/* ── Compiler α ── */}
        <Section id="compiler" title="4. WavelengthScript Compiler α" icon={Code2} accent="#fb923c" badge="spectral instruction set">
          <Field label="Classification">Software — spectral instruction set compiler (alpha prototype)</Field>
          <Field label="Key property">
            Output opcodes are Ψ channel coordinates, not binary machine codes. No lower level of
            representation exists. On photonic hardware each opcode is a direct PHR-1 instruction.
          </Field>

          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Live implementation — compileTransaction() in lambda-state.ts
            </p>
            <CodeBlock>{`// compileTransaction() — the Phase 1 compiler core.
// Takes any text payload, maps every character through CE_TABLE,
// derives mean λ, total energy, Ψ channel, and spectral fingerprint.
// Same formula that SNIC+PHR-1 will execute natively in Phase 2.
public compileTransaction(payload: string): PhotonicTransaction {
  const chars = [...payload];
  let totalLambda = 0, totalEnergy = 0;

  for (const char of chars) {
    const nm = CE_TABLE[char.charCodeAt(0) % 128];  // canonical CE lookup
    const freq = C / (nm * 1e-9);                   // f = c / λ
    totalLambda += nm;
    totalEnergy += H * freq;                         // E = hf (Planck)
  }

  const meanNm = totalLambda / chars.length;
  const mass   = totalEnergy / (C * C);              // E = mc² → m = E/c²
  const txId   = \`tx_\${spectralHash(meanNm, totalEnergy, payload)}\`;

  return {
    txId,                           // Deterministic — no randomness
    spectralFingerprint: { mean_lambda_nm, total_energy_joules, aggregate_mass_kg, band },
    psiChannel: psiChannel(meanNm, payload),  // Ψ(wdm,oam,H)
  };
}`}</CodeBlock>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Genesis block — epoch-zero anchor</p>
            <CodeBlock>{`// The genesis block anchors the entire chain at λ = 380.000 nm.
// This is the physical origin of the visible spectrum — the first
// "unobserved oscillation" per the Theory of Compression States.
// P2PSyncEngine rejects any chain whose genesis anchor ≠ 380.000 nm.

const GENESIS_PAYLOAD  = "NEXUSOS_WNSP_GENESIS_CORE";
const genesis_nm       = 380.000;   // UV boundary — SYSTEM band
const genesis_freq     = C / (genesis_nm * 1e-9);
const genesis_energy   = H * genesis_freq;

genesisBlock = {
  blockIndex:            0,
  previousWavelengthHash: "OPTICAL_VACUUM_NULL",
  blockWavelengthAnchor: 380.000,
  isValidated:           true,
  validationNote:        "Genesis anchor — hardcoded physical origin",
};`}</CodeBlock>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Instruction set — opcodes are Ψ coordinates
            </p>
            <CodeBlock>{`Opcode   Operand                Hardware mapping (Phase 2)
──────────────────────────────────────────────────────────────────
ARCH     WDM256·OAM50·POL2      Declares Hilbert space dimensions
PUSH     @λnm  "symbol"         PHR-1 sets λ, SNIC routes to symbol port
EMIT     λ=Xnm  Ψ(w,o,p)       PHR-1 writes full Ψ, SNIC launches photon
LABEL    name  Ψ(w,o,p)        Relay Mesh registers Ψ as function entry point
AGENT    "name"  Ψ(w,o,p)      Relay Mesh assigns persistent Ψ to AI agent node
CALL     Ψ(w,o,p)              SNIC routes to node, PHR-1 encodes return address
HALT     —                      PHR-1 de-energises, SNIC closes output port`}</CodeBlock>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Chain audit — auditChain()
            </p>
            <CodeBlock>{`// auditChain() validates the entire ledger for internal coherence.
// Each block's previousWavelengthHash must equal
// computeBlockFingerprint(prevBlock) — the physics-derived chain link.
// P2PSyncEngine calls this before accepting any SYNC_RESPONSE.
public auditChain(): { valid: boolean; faults: number[] } {
  const faults: number[] = [];
  for (let i = 1; i < this.ledgerChain.length; i++) {
    const expectedHash = blockFingerprint(this.ledgerChain[i - 1]);
    if (this.ledgerChain[i].previousWavelengthHash !== expectedHash)
      faults.push(this.ledgerChain[i].blockIndex);
  }
  return { valid: faults.length === 0, faults };
}`}</CodeBlock>
          </div>

          <div className="flex flex-wrap gap-2">
            <ImplRef label="CE–SE Pipeline" href="/ce-se-pipeline" file="learn.tsx" />
            <ImplRef label="WNSP VM" href="/wnsp-vm" file="wnsp-vm.tsx" />
            <ImplRef label="WavelengthScript" href="/wavelength-lang" file="wavelength-lang.tsx" />
            <ImplRef label="Oscillating Quanta" href="/oscillating-quanta" file="oscillating-quanta.tsx" />
          </div>
          <PriorArt text={`WavelengthScript Compiler α — binary-free compiler producing Ψ(wdm,oam,pol) photonic instruction streams for SNIC+PHR-1 hardware — first specified and implemented ${SPEC_DATE}`} />
        </Section>

        {/* ── Dependency matrix ── */}
        <Section id="conjunction" title="Component Dependency Matrix" icon={GitBranch} accent="#f472b6">
          <CodeBlock>{`Component                Depends on              Provides to
──────────────────────────────────────────────────────────────────────
SNIC                     PHR-1 (tuning)          Relay Mesh (routed channels)
PHR-1                    Compiler α (Ψ target)   SNIC (thermal + OAM + pol)
Spectral Relay Mesh      SNIC + PHR-1            Compiler α (addressable network)
WavelengthScript α       Relay Mesh              PHR-1 (Ψ instruction targets)

Phase 1 software map:
──────────────────────────────────────────────────────────────────────
SNIC           → CE_TABLE + wdm()             lambda-state.ts
PHR-1          → verifyHardwareAnchor()       lambda-state.ts
Relay Mesh     → P2PSyncEngine                p2p-sync-engine.ts
Compiler α     → compileTransaction()         lambda-state.ts
Genesis anchor → blockWavelengthAnchor=380nm  lambda-state.ts`}</CodeBlock>
        </Section>

        {/* ── Live pages ── */}
        <Section id="live" title="Live Implementations in NexusOS" icon={Layers} accent="#67e8f9">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { title: "Photonic Ledger",   href: "/photonic-ledger",      desc: "LambdaStateMachine — live chain, block commit, audit" },
              { title: "P2P Terminal",      href: "/p2p-terminal",         desc: "P2PSyncEngine — node handshake, consensus, broadcast" },
              { title: "CE–SE Pipeline",    href: "/ce-se-pipeline",       desc: "4-stage: paste → WavelengthScript → bytecode → WNSP VM" },
              { title: "WNSP VM",           href: "/wnsp-vm",              desc: "Bytecode interpreter — step/run, Ψ channel registers" },
              { title: "WavelengthScript",  href: "/wavelength-lang",      desc: "Language spec, transpiler, compiler interface" },
              { title: "Hardware Lab",      href: "/hardware-lab",         desc: "Physics calibration verifier, live spectrometer" },
              { title: "Spectral Router",   href: "/spectral-router",      desc: "DNS-free Ψ packet routing between mesh nodes" },
              { title: "Compression Curve", href: "/compression-explorer", desc: "Interactive Λ=hf/c² curve — all 7 authority bands" },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="flex items-start gap-2 bg-slate-900/60 border border-slate-800 hover:border-cyan-800/60 rounded-lg px-3 py-2.5 transition-colors group">
                <ExternalLink className="w-3.5 h-3.5 mt-0.5 text-slate-600 group-hover:text-cyan-400 flex-shrink-0 transition-colors" />
                <div>
                  <p className="text-slate-200 text-xs font-semibold">{item.title}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* ── Footer licence ── */}
        <div className="border border-amber-800/40 rounded-xl bg-amber-950/20 px-5 py-4 space-y-2 text-[11px] text-amber-300/70">
          <p className="text-amber-400 font-bold text-xs flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" /> GNU Affero General Public License v3.0
          </p>
          <p>
            Any implementation of SNIC, PHR-1, Spectral Relay Mesh, or WavelengthScript Compiler α
            must be released under AGPL-3.0, attribute NexusOS as the originating specification, and
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
