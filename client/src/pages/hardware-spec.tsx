import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  ArrowLeft, Shield, Cpu, Zap, Radio, Code2, Lock,
  GitBranch, Network, Layers, ExternalLink, Atom, CheckCircle2, FlaskConical
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
  usePageMeta({
    title: "NexusOS Hardware Specification — SNIC, PHR-1, Spectral Relay Mesh (AGPL-3.0)",
    description: "Formal specification of the Spectral Network Interface Card (SNIC), PHR-1 bifilar resonator, Spectral Relay Mesh v1, and WavelengthScript Compiler α. First public disclosure 2026-05-16. AGPL-3.0 protected.",
    canonical: "https://wnsp.io/hardware-spec",
    ogTitle: "NexusOS Hardware Specification — AGPL-3.0",
    ogDescription: "SNIC, PHR-1, Spectral Relay Mesh v1, WavelengthScript Compiler α. First public disclosure 2026-05-16. AGPL-3.0. Open forever — improvements must be contributed back.",
    twitterTitle: "NexusOS Hardware Specification",
    twitterDescription: "SNIC photonic NIC, PHR-1 resonator, Spectral Relay Mesh. First disclosed 2026-05-16. AGPL-3.0.",
  });
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Spectral stripe */}
      <div className="h-1 w-full"
        style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#16a34a,#cccc00,#ff8c00,#cc0000)" }} />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* ── Header ── */}
        <div className="space-y-4">
          <Link href="/crowdfund" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Crowdfund
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
            <span className="font-mono text-emerald-400">256 WDM × 50 OAM × 2 POL × 2 DIR = 51,200 orthogonal channels</span>
            <br /><span className="text-slate-500">⟨Ψᵢ|Ψⱼ⟩ = 0 — quantum mechanical guarantee, not software policy.</span>
            <br /><span className="text-slate-500 text-xs">DIR: +k̂ forward / −k̂ backward propagating modes. Maxwell time-reversal symmetry guarantees orthogonality. Phase conjugation is the physical reversal mechanism.</span>
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
            <ImplRef label="Spectral Router" href="/spectral-router" file="spectral-router.tsx" />
            <ImplRef label="WNSP Bridge" href="/wnsp-bridge" file="wnsp-bridge.tsx" />
            <ImplRef label="Spectral Network" href="/network" file="network.tsx" />
            <ImplRef label="Developer Docs" href="/docs" file="docs.tsx" />
          </div>
          <PriorArt text={`Spectral Relay Mesh v1 — WNSP-addressed photonic relay across TCP/IP overlay and all-optical phases — first specified ${SPEC_DATE}`} />
          <PriorArt text={`Bidirectional channel dimension N_Dir=2 — forward (+k̂) and backward (−k̂) propagating modes as orthogonal Hilbert sub-space; phase conjugation reversal; 51,200 → 51,200 channel expansion — first specified 2026-07-02`} />
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

        {/* ── SiN Substrate ── */}
        <Section id="sin-substrate" title="5. Silicon Nitride (SiN) Substrate — Photonic Fabrication Basis" icon={Atom} accent="#38bdf8" badge="LPCVD · validated 2026-07-17">
          <Field label="Classification">Photonic integrated circuit substrate — low-pressure CVD silicon nitride waveguide platform</Field>
          <Field label="Why SiN">
            Standard silicon-on-insulator (SOI) absorbs below ~1100 nm, cutting off the entire NexusOS
            visible band (380–780 nm). Silicon nitride provides a transparency window from ~500 nm to
            2500 nm — our CE table's full 380–780 nm range sits within it. Every authority band,
            every WDM channel, every ghost node resonance can propagate without material absorption loss.
          </Field>
          <Field label="Fabrication">
            <span className="font-semibold text-sky-300">LPCVD (Low-Pressure CVD)</span> over PECVD.
            LPCVD eliminates residual N–H bonds that create an absorption peak at ~1520 nm in PECVD films.
            It also enables thick-film deposition (up to ~800 nm vs ~300 nm) giving the waveguide cross-section
            needed for OAM mode confinement across l = 0–49. Propagation loss: ~0.1 dB/cm — roughly
            10× lower than silicon, with ~100× better power handling.
          </Field>

          {/* Transparency + channel table */}
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              SiN transparency window vs WNSP operating band
            </p>
            <div className="border border-slate-800 rounded-lg overflow-hidden text-[11px]">
              <div className="grid grid-cols-3 bg-slate-900 px-3 py-1.5 text-slate-500 font-semibold uppercase text-[10px] tracking-widest">
                <span>Platform</span><span>Lower λ limit</span><span>Upper λ limit</span>
              </div>
              {[
                { platform: "Silicon (SOI)",         lo: "~1100 nm",   hi: "~3500 nm",  note: "Misses entire CE visible band", color: "#ef4444" },
                { platform: "Silicon Nitride (SiN)", lo: "~500 nm",    hi: "~2500 nm",  note: "Covers full CE table 380–780 nm", color: "#4ade80" },
                { platform: "WNSP CE band",          lo: "380.0 nm",   hi: "780.0 nm",  note: "256 WDM × 3.125 nm bands", color: "#38bdf8" },
              ].map(r => (
                <div key={r.platform} className="grid grid-cols-3 px-3 py-1.5 border-t border-slate-800/60 items-center">
                  <span className="font-mono" style={{ color: r.color }}>{r.platform}</span>
                  <span className="text-slate-400 font-mono">{r.lo}</span>
                  <span className="text-slate-400 font-mono">{r.hi}
                    <span className="text-slate-600 ml-2 text-[10px]">{r.note}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* WNSP dimension mapping */}
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              SiN properties mapped to WNSP Hilbert dimensions
            </p>
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
              {[
                {
                  dim: "WDM (256 channels)",
                  color: "#38bdf8",
                  sin: "Micro-ring resonators tuned at 3.125 nm spacing. Ultra-compact inverse-design WDM mux encodes Ψ(wdm,*,*) directly into the PIC mask.",
                },
                {
                  dim: "OAM (l = 0–49)",
                  color: "#a78bfa",
                  sin: "Kerr nonlinearity enables on-chip OAM mode generation. Null-core radius r_null = lλ/2π (Act 9) is physically enforced by the waveguide cross-section geometry at each l index.",
                },
                {
                  dim: "Ghost Nodes (WDM = 0)",
                  color: "#4ade80",
                  sin: "Kerr nonlinearity at the ZPE floor supports integer octave resonance (ρ_matter = 0, α = 0). The material provides the non-linear optical mechanism that keeps Beer-Lambert loss at zero for ghost channels.",
                },
                {
                  dim: "Polarisation (H/V)",
                  color: "#fb923c",
                  sin: "Inverse-design polarisation beam splitters hardware-encode pol = H vs pol = V. No external polariser needed — the PIC geometry is the switch.",
                },
                {
                  dim: "Quantum entanglement",
                  color: "#f472b6",
                  sin: "On-chip nanophotonic resonators generate photon pairs with wide spectral separation — the physical substrate for WNSP quantum channel coherence.",
                },
              ].map(d => (
                <div key={d.dim} className="space-y-0.5">
                  <p className="font-semibold" style={{ color: d.color }}>{d.dim}</p>
                  <p className="text-slate-400 leading-relaxed">{d.sin}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hybrid platform note */}
          <div className="bg-slate-900/40 border border-sky-900/40 rounded-lg px-4 py-3 text-[11px] text-slate-400 leading-relaxed">
            <span className="text-sky-300 font-semibold">Hybrid SiN + thin-film LiNbO₃:</span>{" "}
            Emerging platforms combine the SiN waveguide with a thin lithium niobate layer to generate
            coherent laser frequency combs — hundreds of lines from a single chip. This directly provides
            the addressing density our 256 WDM channels require without separate laser banks, and is the
            intended fabrication path for SNIC v2 (~2030).
          </div>

          {/* PHR-1 interface */}
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              PHR-1 ↔ SiN PIC interface
            </p>
            <CodeBlock>{`PHR-1 bifilar coil
  ↓  near-field EM envelope  (low-frequency domain)
RF-to-photonic transduction boundary
  ↓  evanescent coupling into SiN waveguide  (photonic domain)
SNIC micro-ring resonator
  — selects λ from input broadband / comb source
  — OAM null-core geometry enforced by waveguide cross-section
  — Ghost node channels: Kerr ZPE floor, α = 0
  — Output: Ψ(wdm, oam, pol) photon launched into Relay Mesh`}</CodeBlock>
          </div>

          <PriorArt text={`Silicon nitride LPCVD substrate as SNIC/PHR-1 fabrication basis — independently validated by Google AI 2026-07-17. Channel count: 51,200 orthogonal Ψ channels (256×50×2×2). Note: external sources may cite 51,600 — the correct WNSP spec value is 51,200.`} />
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

        {/* ── First Physical Prototype ── */}
        <Section id="proto001" title="First Physical Prototype — PROTO-001" icon={FlaskConical} accent="#a3e635" badge="2026-07-27">

          {/* Milestone banner */}
          <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl px-5 py-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-300 font-bold text-xs">
                First physical NexusOS hardware build — manufactured and tested 2026-07-27
              </p>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed pl-6">
              Three PHR-1 bifilar toroid prototypes manufactured by Coiltek (Salisbury South SA, Australia),
              100% electrically tested against the WNSP hardware specification. This is the first
              external manufacturing engagement in NexusOS history — the point where the physics stack
              crossed from software into the physical world.
            </p>
          </div>

          {/* Part record */}
          <div className="space-y-2.5">
            <Field label="Part number">NEX-0589-PROTO-001</Field>
            <Field label="Component">PHR-1 Bifilar Toroid — T200-2 iron powder core, 72 bifilar turns (144 individual turns), clockwise direction</Field>
            <Field label="Wire">0.5 mm PUR1 · Conductor A = Red · Conductor B = Copper · 3.7 m per conductor · 100 mm leads</Field>
            <Field label="Drawing">REV A · Drawn Tim Short (TS) · 2026-07-16 · Coiltek R&D Dept</Field>
            <Field label="Test report">ETR NEX-0589 PROTO-001 · Issue 1.0 · P.O Ref S17406</Field>
            <Field label="Manufacturer">Coiltek Pty Ltd · 5 Mengel Court, Salisbury South SA 5106 · ctmenquiry@coiltek.com.au</Field>
            <Field label="Test condition">1 kHz / 1.0 V · GW Instek LCR-6100 · 15.6 °C · 61% RH</Field>
            <Field label="Quantity">3 units · 100% tested · All pass</Field>
          </div>

          {/* Test results table */}
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Electrical test results — all units within specification
            </p>
            <div className="border border-slate-800 rounded-lg overflow-hidden text-[11px]">
              <div className="grid grid-cols-5 bg-slate-900 px-3 py-2 text-slate-500 font-semibold uppercase text-[10px] tracking-widest">
                <span>Unit</span>
                <span>L_A (μH)</span>
                <span>L_B (μH)</span>
                <span>DCR_A (mΩ)</span>
                <span>DCR_B (mΩ)</span>
              </div>
              {[
                { sn: "SN001.001", la: "61.99", lb: "62.05", da: "291.8", db: "297.4" },
                { sn: "SN001.002", la: "62.17", lb: "62.05", da: "291.9", db: "296.9" },
                { sn: "SN001.003", la: "62.44", lb: "62.36", da: "292.4", db: "300.2" },
              ].map(r => (
                <div key={r.sn} className="grid grid-cols-5 px-3 py-1.5 border-t border-slate-800/60 font-mono text-slate-300">
                  <span className="text-slate-400">{r.sn}</span>
                  <span className="text-lime-400">{r.la}</span>
                  <span className="text-lime-400">{r.lb}</span>
                  <span className="text-cyan-400">{r.da}</span>
                  <span className="text-cyan-400">{r.db}</span>
                </div>
              ))}
              <div className="grid grid-cols-5 px-3 py-1.5 border-t border-slate-700 bg-slate-900/60 font-mono text-[10px]">
                <span className="text-slate-500 uppercase font-bold tracking-widest">Avg</span>
                <span className="text-lime-600">62.200</span>
                <span className="text-lime-600">62.153</span>
                <span className="text-cyan-700">292.033</span>
                <span className="text-cyan-700">298.167</span>
              </div>
              <div className="grid grid-cols-5 px-3 py-1.5 border-t border-slate-800/40 font-mono text-[10px]">
                <span className="text-slate-600 uppercase tracking-widest">Spec</span>
                <span className="text-slate-500">62 ±10%</span>
                <span className="text-slate-500">62 ±10%</span>
                <span className="text-slate-500">295 ±2%</span>
                <span className="text-slate-500">295 ±2%</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-600">
              Inductance σ = 0.185 μH (Conductor A) · 0.146 μH (Conductor B) — tight uniformity across all three units confirms winding specification is sound.
            </p>
          </div>

          {/* Physics connection */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Connection to PHR-1 specification
            </p>
            <div className="space-y-2 text-slate-400 leading-relaxed">
              <p>
                The bifilar winding creates two magnetically identical, phase-inverted conductors —
                a physical implementation of <span className="text-purple-400 font-mono">Ψ(+k̂) ⊗ Ψ(−k̂)</span>,
                the standing wave pair described in Act 7. Equal-magnitude opposing currents cancel
                far-field EMI while preserving the controlled near-field envelope used to couple into
                the SNIC micro-ring.
              </p>
              <p>
                At 62 μH on the T200-2 iron powder core, this component operates at HF/RF frequencies.
                It demonstrates the electromagnetic coupling principle at radio wavelengths — the
                direct stepping stone toward photonic waveguide implementation on silicon nitride substrate (~2032).
              </p>
            </div>
            <CodeBlock>{`// PHR-1 winding derivation — T200-2 core, AL ≈ 120 nH/100T²
// L = N² × AL = 72² × (120 nH / 10000) = 5184 × 12 nH = 62,208 nH ≈ 62 μH
//
// Bifilar coupling principle:
//   Conductor A: I_A = +I  →  B_A = +B  (H-polarisation)
//   Conductor B: I_B = −I  →  B_B = −B  (V-polarisation)
//   Far-field: B_net = 0   (zero EMI)
//   Near-field: controlled envelope → evanescent coupling to SNIC ring
//
// This is Ψ(+k̂) ⊗ Ψ(−k̂) in physical hardware.`}</CodeBlock>
          </div>

          <PriorArt text="NEX-0589-PROTO-001 · First physical PHR-1 prototype · Manufactured and tested 2026-07-27 · Coiltek, Salisbury South SA · ETR Issue 1.0 · P.O Ref S17406 · Three units, 100% pass" />
        </Section>

        {/* ── Live pages ── */}
        <Section id="live" title="Live Implementations in NexusOS" icon={Layers} accent="#67e8f9">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { title: "Photonic Ledger",   href: "/photonic-ledger",      desc: "LambdaStateMachine — live chain, block commit, audit" },
              { title: "Spectral Network",  href: "/network",              desc: "Node distribution by authority band, spectral proximity" },
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
