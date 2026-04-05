import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Cpu, Layers, GitBranch, BarChart3 } from "lucide-react";

// ── Paradigm data ─────────────────────────────────────────────────
const PARADIGMS = [
  {
    id: "photonic-matrix",
    name: "Photonic Matrix Multiply",
    tagline: "Linear algebra at the speed of light",
    color: "#06b6d4",
    layer: "L1",
    status: "SHIPPING",
    statusColor: "#4ade80",
    nonlinear: false,
    roomTemp: true,
    energyPerOp: "~0 (passive)",
    parallelism: "256 WDM × 50 OAM = 12,800 simultaneous",
    companies: ["Lightmatter", "Luminous Computing", "Optalysys"],
    physics: [
      "A Mach-Zehnder mesh of beam splitters performs matrix-vector multiplication optically.",
      "Each MZI encodes one matrix element as a phase angle.",
      "The entire matrix multiply happens as light propagates through — zero switching energy.",
      "Nonlinearity only appears once: at the photodetector readout layer.",
      "Reshapes the question from 'can photons do NAND?' to 'what computation is naturally linear?'",
    ],
    nexus_mapping: "Directly implements WNSP-SE wave frame computation. Each spectral address IS a matrix column. 256 WDM channels = 256 simultaneous multiply-accumulate operations across the visible spectrum.",
    nexus_layer_detail: "Runs on L1 (Lambda Gate waveguide fabric) without requiring the nonlinear gate primitives. AND/OR/NAND are replaced by inner products.",
    limitations: [
      "Cannot do arbitrary logic — only linear operations natively",
      "Training (weight setting) still requires a classical controller",
      "Precision limited by optical component tolerances (~4–6 bits today)",
    ],
  },
  {
    id: "hybrid-control",
    name: "Hybrid Control Architecture",
    tagline: "Electrons control, photons compute",
    color: "#f59e0b",
    layer: "L1+L3",
    status: "NEAR-TERM",
    statusColor: "#fbbf24",
    nonlinear: true,
    roomTemp: true,
    energyPerOp: "kT·ln2 × transistor_count (reduced 5M×)",
    parallelism: "Photonic data paths unlimited; electron control: ~10k gates",
    companies: ["Intel (co-packaged photonics)", "TSMC (SoIC)", "Ayar Labs"],
    physics: [
      "Replace the sea of 50 billion transistors with ~10,000 control transistors.",
      "Each control transistor operates a bank of photonic switches — never reaches the tunneling wall.",
      "All data movement and computation is photonic: zero capacitance, zero EM coupling noise.",
      "The nonlinear element (transistor) is used sparingly — as a programmable switch, not a logic unit.",
      "Transistor density stays at 10–22 nm nodes indefinitely. Only the photonic layer scales.",
    ],
    nexus_mapping: "Maps directly to the L3 kernel running on L1 photonic fabric. The 5 core kernel agents (os_kernel, bus_router, scheduler_daemon, watchdog_daemon, auth_gateway) are the electron-controlled coordinators. All bus traffic and channel routing is photonic.",
    nexus_layer_detail: "L3 OS Kernel runs on classical silicon (10k transistors). L1–L2 photonic hardware carries all inter-agent communication at c. Zero risk of hitting the tunneling wall in this architecture.",
    limitations: [
      "Still requires some silicon — not fully photonic",
      "Interface between electron control and photonic data path introduces latency",
      "Power still consumed by the electron control layer",
    ],
  },
  {
    id: "czc-field",
    name: "CZC Coherent Field Computing",
    tagline: "The field itself is the nonlinear medium",
    color: "#7c3aed",
    layer: "L0+L1",
    status: "RESEARCH",
    statusColor: "#a78bfa",
    nonlinear: true,
    roomTemp: true,
    energyPerOp: "Near-zero (field-mediated, reversible)",
    parallelism: "Full Hilbert space — 25,600 channels simultaneously",
    companies: ["Nexus (AGPL-3.0)"],
    physics: [
      "At CZC⁴⁴ coherence (99.56%), the photonic field develops macroscopic phase correlations.",
      "Two photons in a sufficiently coherent field interact through the field vacuum fluctuations.",
      "This is photon-photon scattering via virtual electron loops (quantum electrodynamics).",
      "The PHR-1 resonator provides the coherence background — it IS the nonlinear medium.",
      "Gate operations are reversible: no heat dissipation. Landauer limit does not apply.",
      "Equivalent to a natural Kerr medium but created from coherence, not material χ³.",
    ],
    nexus_mapping: "The PHR-1 (L0) feeds coherence into L1 (Lambda Gate substrate). The CZC field replaces the need for an InP or LiNbO₃ nonlinear crystal. Full 8-operator Lambda Gate v4 becomes operational without external nonlinear material.",
    nexus_layer_detail: "L0 is not just a power source — it is the computational medium. The ZERO-G state (ALP < 0.0001) is the condition under which fully-photonic NAND becomes physical.",
    limitations: [
      "Requires PHR-1 hardware to exist — bench prototype stage",
      "CZC field coherence must be maintained across the gate array",
      "Theory grounded in QED but experimental demonstration pending",
    ],
  },
  {
    id: "reservoir",
    name: "Reservoir Computing",
    tagline: "Let the physics do the computation",
    color: "#10b981",
    layer: "L1",
    status: "DEMONSTRATED",
    statusColor: "#34d399",
    nonlinear: false,
    roomTemp: true,
    energyPerOp: "Energy of field injection only",
    parallelism: "Dimension of reservoir state space (scales with cavity size)",
    companies: ["NTT (optical reservoir)", "Université Libre Bruxelles", "Nexus (OAM reservoir)"],
    physics: [
      "Any physical system with many degrees of freedom and fading memory can compute.",
      "Encode input as an initial photonic state. Inject it into a photonic cavity or delay loop.",
      "The cavity's natural dynamics (interference, diffraction, OAM mixing) act as the processor.",
      "Read the output state with a simple linear decoder — no complex readout needed.",
      "The 'programming' is done by training only the output weights — the reservoir is fixed.",
      "Optical fiber delay-line reservoirs have already demonstrated 10+ Gbps speech recognition.",
    ],
    nexus_mapping: "The 50-mode OAM space in the Nexus channel layer is a natural 50-dimensional reservoir. An input WNSP frame injected into the OAM modulator array evolves through the 50 orthogonal modes — the output frame is the computation.",
    nexus_layer_detail: "No additional hardware beyond what L1–L2 already specifies. The Hilbert space router's OAM subsystem doubles as a reservoir computer for temporal pattern recognition tasks.",
    limitations: [
      "Best suited for temporal tasks (classification, prediction) — not arbitrary logic",
      "Training the output layer still requires classical computation",
      "Fixed reservoir: the computation is determined by the physical cavity, not programmable",
    ],
  },
  {
    id: "oam-analog",
    name: "OAM-Space Analog Computing",
    tagline: "50 orthogonal dimensions as a native computer",
    color: "#f43f5e",
    layer: "L2",
    status: "SPECIFIED",
    statusColor: "#60a5fa",
    nonlinear: false,
    roomTemp: true,
    energyPerOp: "Photon propagation energy only",
    parallelism: "50 OAM modes × 256 WDM = 12,800 simultaneous analog operations",
    companies: ["Nexus (AGPL-3.0)", "OAM Communications (partial)"],
    physics: [
      "OAM modes |l⟩ form a countably infinite orthogonal basis: ⟨l|l'⟩ = δ(l,l').",
      "The 50-mode subspace Nexus uses is a 50-dimensional complex Hilbert space.",
      "Any linear operator on this space can be implemented by a structured waveguide network.",
      "Encode a problem as an OAM superposition state. The waveguide network applies the operator.",
      "The output OAM measurement is the answer — computation takes one photon transit time.",
      "Multiplied by 256 WDM channels: 12,800 simultaneous 50-dimensional operations.",
    ],
    nexus_mapping: "The Ψ(wdm, oam, pol) channel allocator in L2 already maps computations to OAM coordinates. Extending it to use OAM mode evolution as computation is a firmware change, not a hardware change.",
    nexus_layer_detail: "L2 Channel Layer is repurposed from addressing to computing. The Hilbert space router becomes a programmable linear operator — a photonic processing unit requiring no additional silicon.",
    limitations: [
      "50 dimensions limits problem size",
      "Analog precision (~6–8 bits for OAM measurements)",
      "Programmability requires reconfiguring the waveguide network (slow at hardware level)",
    ],
  },
];

// ── Comparison matrix ─────────────────────────────────────────────
const MATRIX_COLS = [
  "Nonlinear element needed?",
  "Room temperature?",
  "Gate logic (NAND)?",
  "Naturally parallel?",
  "Energy per operation",
  "Nexus hardware layer",
  "Status",
];

// ── Nexus integration layer diagram ──────────────────────────────
const INTEGRATION_LAYERS = [
  {
    id: "L0",
    name: "L0 — Resonator",
    color: "#7c3aed",
    paradigms: ["czc-field"],
    description: "CZC Coherent Field Computing provides the field coherence that enables photon-photon coupling through QED vacuum fluctuations. The PHR-1 is both power source and nonlinear medium.",
  },
  {
    id: "L1",
    name: "L1 — Photonic Logic",
    color: "#0891b2",
    paradigms: ["photonic-matrix", "hybrid-control", "czc-field", "reservoir"],
    description: "Four paradigms converge here. Photonic matrix multiply uses the MZI fabric. Hybrid control adds electron-controlled phase switches. CZC gates use the coherent field. Reservoir computing uses the OAM cavity dynamics.",
  },
  {
    id: "L2",
    name: "L2 — Channel Layer",
    color: "#059669",
    paradigms: ["oam-analog", "reservoir"],
    description: "The 25,600-channel Hilbert space doubles as a computing substrate. OAM analog computing repurposes the Ψ allocator as a programmable linear operator. The reservoir's output is read from OAM channel measurements.",
  },
  {
    id: "L3",
    name: "L3 — Nexus OS Kernel",
    color: "#d97706",
    paradigms: ["hybrid-control"],
    description: "In the hybrid architecture, the kernel's 5 core agents are the electron-controlled coordinators. All inter-agent bus traffic runs on the photonic fabric below. The kernel manages which computing paradigm is active for a given task.",
  },
];

// ── ParadigmCard ──────────────────────────────────────────────────
function ParadigmCard({ p, expanded, onToggle }: {
  p: typeof PARADIGMS[0];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border overflow-hidden"
      style={{ borderColor: `${p.color}50` }}>
      {/* Header */}
      <button
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/5 transition-colors"
        onClick={onToggle}
        data-testid={`paradigm-toggle-${p.id}`}
      >
        <div
          className="w-2 mt-1.5 flex-shrink-0 rounded-full"
          style={{ background: p.color, height: expanded ? "auto" : "10px", minHeight: 10 }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-slate-100">{p.name}</span>
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: `${p.statusColor}20`, color: p.statusColor }}
            >
              {p.status}
            </span>
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
            >
              {p.layer}
            </span>
          </div>
          <p className="text-sm text-slate-400">{p.tagline}</p>
        </div>
        <ChevronRight
          className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1 transition-transform"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}
        />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-800">
          {/* Physics */}
          <div className="mt-4">
            <p className="text-xs font-mono text-slate-500 mb-2">HOW THE PHYSICS WORKS</p>
            <div className="space-y-1.5">
              {p.physics.map((line, i) => (
                <div key={i} className="flex gap-2 text-sm text-slate-300">
                  <span style={{ color: p.color }} className="flex-shrink-0 mt-0.5 text-xs">▸</span>
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            {[
              { label: "Nonlinear needed",  value: p.nonlinear ? "Yes" : "No",  ok: !p.nonlinear },
              { label: "Room temperature",  value: p.roomTemp ? "Yes" : "No",   ok: p.roomTemp },
              { label: "Energy / op",       value: p.energyPerOp,               ok: null },
              { label: "Parallelism",       value: p.parallelism,               ok: null },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-900 rounded p-2 border border-slate-800">
                <p className="text-slate-500">{stat.label}</p>
                <p className={
                  stat.ok === null ? "text-slate-200" :
                  stat.ok ? "text-green-400" : "text-yellow-400"
                }>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Nexus mapping */}
          <div className="rounded-lg p-3 border"
            style={{ borderColor: `${p.color}30`, background: `${p.color}0a` }}>
            <p className="text-xs font-mono mb-1" style={{ color: p.color }}>NEXUS INTEGRATION</p>
            <p className="text-sm text-slate-300">{p.nexus_mapping}</p>
            <p className="text-xs text-slate-500 mt-1">{p.nexus_layer_detail}</p>
          </div>

          {/* Limitations */}
          <div>
            <p className="text-xs font-mono text-slate-500 mb-1">CURRENT LIMITATIONS</p>
            <div className="space-y-1">
              {p.limitations.map((l, i) => (
                <div key={i} className="flex gap-2 text-xs text-slate-400">
                  <span className="text-slate-600 flex-shrink-0">○</span>
                  {l}
                </div>
              ))}
            </div>
          </div>

          {/* Companies */}
          <div className="flex flex-wrap gap-1">
            {p.companies.map((c, i) => (
              <span key={i} className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Comparison Table ──────────────────────────────────────────────
function ComparisonTable() {
  const rows = PARADIGMS.map(p => ({
    name: p.name,
    color: p.color,
    values: [
      { val: p.nonlinear ? "Required" : "None",        good: !p.nonlinear },
      { val: p.roomTemp  ? "Yes"      : "No",           good: p.roomTemp },
      { val: p.nonlinear ? "Native"   : "Via hybrid",   good: null },
      { val: "Yes",                                      good: true },
      { val: p.energyPerOp,                              good: null },
      { val: p.layer,                                    good: null },
      { val: p.status, color: p.statusColor,             good: null },
    ],
  }));

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-900 border-b border-slate-700">
            <th className="p-3 text-left text-slate-400 font-mono w-40">Paradigm</th>
            {MATRIX_COLS.map((col, i) => (
              <th key={i} className="p-3 text-left text-slate-400 font-mono whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-slate-800 hover:bg-slate-800/30"
              data-testid={`compare-row-${ri}`}>
              <td className="p-3">
                <span className="font-medium" style={{ color: row.color }}>
                  {row.name}
                </span>
              </td>
              {row.values.map((cell, ci) => (
                <td key={ci} className="p-3 font-mono">
                  <span style={cell.color ? { color: cell.color } :
                    cell.good === true ? { color: "#4ade80" } :
                    cell.good === false ? { color: "#fbbf24" } :
                    { color: "#94a3b8" }}>
                    {cell.val}
                  </span>
                </td>
              ))}
            </tr>
          ))}

          {/* Silicon CMOS reference row */}
          <tr className="border-b border-slate-800 bg-red-950/20">
            <td className="p-3">
              <span className="font-medium text-red-400">Silicon CMOS (ref)</span>
            </td>
            {[
              { val: "Transistor gate",      good: false },
              { val: "Yes",                  good: true },
              { val: "Native — ends at 2nm", good: false },
              { val: "Limited (EM coupling)", good: false },
              { val: "kT·ln2 × 50B gates",  good: false },
              { val: "Classical",            good: null },
              { val: "ENDING", color: "#ef4444", good: null },
            ].map((cell, ci) => (
              <td key={ci} className="p-3 font-mono">
                <span style={cell.color ? { color: cell.color } :
                  cell.good === true ? { color: "#4ade80" } :
                  cell.good === false ? { color: "#ef4444" } :
                  { color: "#94a3b8" }}>
                  {cell.val}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Integration Map ───────────────────────────────────────────────
function IntegrationMap() {
  const paradigmById = Object.fromEntries(PARADIGMS.map(p => [p.id, p]));

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Each computing paradigm plugs into a specific layer of the Nexus hardware
        stack. Multiple paradigms can run simultaneously on different layers —
        they don't conflict because the layers are physically separated.
      </p>

      {[...INTEGRATION_LAYERS].reverse().map(layer => (
        <div key={layer.id}
          className="rounded-lg border p-4"
          style={{ borderColor: `${layer.color}40`, background: `${layer.color}0c` }}
          data-testid={`integration-layer-${layer.id}`}
        >
          <div className="flex items-start gap-3">
            <div
              className="font-mono text-sm font-bold w-24 flex-shrink-0 mt-0.5"
              style={{ color: layer.color }}
            >
              {layer.name}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                {layer.paradigms.map(pid => {
                  const p = paradigmById[pid];
                  return (
                    <span key={pid}
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ background: `${p.color}20`, color: p.color }}
                    >
                      {p.name}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">{layer.description}</p>
            </div>
          </div>
        </div>
      ))}

      {/* The combination */}
      <Card className="bg-slate-900 border-amber-800/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-amber-300">
            First Nexus Implementation — The Combination
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300 space-y-2">
          <p>
            The first hardware Nexus machine is not a choice between these paradigms.
            It is all of them, layered:
          </p>
          <div className="space-y-1 font-mono text-xs">
            {[
              { layer: "L0", text: "PHR-1 generates the CZC coherence field — enables photon-photon coupling",      color: "#7c3aed" },
              { layer: "L1", text: "Photonic matrix multiply handles dense computation (inference, signal processing)", color: "#0891b2" },
              { layer: "L1", text: "CZC field enables Lambda Gate NAND for arbitrary logic without silicon",          color: "#7c3aed" },
              { layer: "L1", text: "OAM cavity provides reservoir computing for temporal pattern recognition",        color: "#10b981" },
              { layer: "L2", text: "OAM analog computing solves 50-dimensional linear problems in one transit",      color: "#f43f5e" },
              { layer: "L3", text: "Hybrid control kernel (10k transistors) orchestrates which paradigm handles which task", color: "#d97706" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className="px-1.5 rounded flex-shrink-0"
                  style={{ background: `${item.color}20`, color: item.color }}
                >
                  {item.layer}
                </span>
                <span className="text-slate-300">{item.text}</span>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-2">
            The OS kernel (L3) decides at runtime which layer handles each computation type.
            This is why the OS had to be built first — the hardware dispatch logic must
            exist before the hardware arrives.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Roadmap ───────────────────────────────────────────────────────
function ImplementationRoadmap() {
  const phases = [
    {
      phase: "Phase 1",
      title: "Software-Only (Now)",
      year: "2025–2026",
      color: "#4ade80",
      status: "LIVE",
      items: [
        "All 5 paradigms specified and modelled in the Nexus kernel",
        "WNSP protocol encodes instructions into spectral addresses",
        "Kernel dispatcher routes tasks by type — ready for hardware to plug in",
        "25,600-channel Hilbert space proven orthogonal in simulation",
      ],
      hw: "Classical CPU — full software simulation",
    },
    {
      phase: "Phase 2",
      title: "Hybrid Silicon-Photonic",
      year: "2026–2028",
      color: "#06b6d4",
      status: "NEXT",
      items: [
        "Photonic matrix multiply co-processor plugs into L1",
        "PHR-1 bench prototype produces CZC field (lab controlled)",
        "10-mode OAM modulator demonstrates reservoir computing",
        "Kernel dispatches linear algebra tasks to photonic co-processor",
        "Silicon control layer (L3) manages photonic fabric (L1–L2)",
      ],
      hw: "Silicon CPU + photonic co-processor (Lightmatter / custom PHR-1)",
    },
    {
      phase: "Phase 3",
      title: "Full Lambda Gate Substrate",
      year: "2028–2031",
      color: "#7c3aed",
      status: "PLANNED",
      items: [
        "InP Lambda Gate ASIC tape-out — 8 primitive operators in photonic chip",
        "Full 50-mode OAM array on-chip",
        "CZC field integrated — PHR-1 on-chip resonator",
        "NAND gate demonstrated without silicon in the logic path",
        "Nexus kernel boots on pure photonic substrate for first time",
      ],
      hw: "InP photonic ASIC + PHR-1 on-chip field generator",
    },
    {
      phase: "Phase 4",
      title: "Tunneling Wall Crossover",
      year: "2031+",
      color: "#f59e0b",
      status: "INEVITABLE",
      items: [
        "Silicon CMOS hits 0.5 nm — tunneling dominant — gate control lost",
        "Nexus is the only production OS on photonic substrate",
        "All 5 computing paradigms active simultaneously on one machine",
        "Planetary spectral relay mesh begins deployment",
        "K1 energy infrastructure supplies power from resonance harvesting",
      ],
      hw: "Pure photonic substrate — Nexus Hardware OS in full production",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        The four phases from software simulation to planetary photonic substrate.
        Each phase activates more paradigms on real hardware.
      </p>
      {phases.map((ph, i) => (
        <div key={i}
          className="rounded-lg border p-4"
          style={{ borderColor: `${ph.color}40`, background: `${ph.color}0a` }}
          data-testid={`roadmap-phase-${i}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs px-2 py-0.5 rounded"
              style={{ background: `${ph.color}20`, color: ph.color }}>
              {ph.phase}
            </span>
            <h3 className="font-semibold text-slate-100">{ph.title}</h3>
            <span className="text-slate-400 text-xs font-mono">{ph.year}</span>
            <Badge className="ml-auto text-xs"
              style={{
                background: ph.status === "LIVE" ? "#16a34a40" : "#1e293b",
                color: ph.status === "LIVE" ? "#4ade80" : ph.color,
              }}>
              {ph.status}
            </Badge>
          </div>
          <ul className="space-y-1 mb-3">
            {ph.items.map((item, j) => (
              <li key={j} className="flex gap-2 text-xs text-slate-300">
                <span style={{ color: ph.color }} className="flex-shrink-0">▸</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-400 inline-block">
            Hardware: {ph.hw}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function ComputingAlternativesPage() {
  const [expandedId, setExpandedId] = useState<string | null>("photonic-matrix");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4,#10b981)" }}
          >
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Computing Alternatives
            </h1>
            <p className="text-slate-400 text-sm">
              Five paradigms that bypass the nonlinear photonic NAND problem — each mapped to the Nexus stack
            </p>
          </div>
        </div>

        {/* The central tension */}
        <div className="rounded-lg p-3 bg-slate-900 border border-slate-700 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-red-400">Silicon CMOS → tunneling wall at ~2 nm</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-yellow-400">Photonic NAND needs nonlinear medium</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-green-400">5 paradigms bypass this entirely</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-violet-400">Nexus hardware OS runs all 5</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="paradigms">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="paradigms"    data-testid="tab-paradigms">
            <Cpu className="w-3 h-3 mr-1" /> Paradigms
          </TabsTrigger>
          <TabsTrigger value="comparison"   data-testid="tab-comparison">
            <BarChart3 className="w-3 h-3 mr-1" /> Comparison
          </TabsTrigger>
          <TabsTrigger value="integration"  data-testid="tab-integration">
            <Layers className="w-3 h-3 mr-1" /> Nexus Integration
          </TabsTrigger>
          <TabsTrigger value="roadmap"      data-testid="tab-roadmap">
            <GitBranch className="w-3 h-3 mr-1" /> Roadmap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paradigms">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            Each paradigm reframes what a computer is — click to expand
          </h2>
          <div className="space-y-2">
            {PARADIGMS.map(p => (
              <ParadigmCard
                key={p.id}
                p={p}
                expanded={expandedId === p.id}
                onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <h2 className="text-sm font-semibold text-yellow-300 mb-3">
            All 5 paradigms vs silicon CMOS — side by side
          </h2>
          <ComparisonTable />
        </TabsContent>

        <TabsContent value="integration">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            Where each paradigm plugs into the Nexus hardware stack
          </h2>
          <IntegrationMap />
        </TabsContent>

        <TabsContent value="roadmap">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">
            Four phases from software simulation to full photonic substrate
          </h2>
          <ImplementationRoadmap />
        </TabsContent>
      </Tabs>
    </div>
  );
}
