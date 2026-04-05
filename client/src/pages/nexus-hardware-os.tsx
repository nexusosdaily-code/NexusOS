import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, Zap, Layers, Radio, ChevronRight, Clock } from "lucide-react";

// ── Physical constants ────────────────────────────────────────────
const Z0        = 376.73;  // Ω free-space impedance
const GOLDEN    = 137.508; // ° golden angle
const FIRST_OSC = 555e12;  // Hz

// ── Hardware layer definitions ────────────────────────────────────
const HW_LAYERS = [
  {
    id: "L0",
    name: "Resonator Layer",
    subtitle: "Physical field generation",
    color: "#7c3aed",
    border: "border-violet-800",
    bg: "bg-violet-900/20",
    status: "PROTOTYPE",
    components: [
      {
        name: "PHR-1 — 144-Turn Bifilar-Toroid Syncbox",
        spec: "Golden Angle 137.5° · Impedance 377Ω · ALP < 0.0001",
        role: "Generates coherent photonic field — the physical power source for the Λ substrate",
        status: "spec-complete",
      },
      {
        name: "CZC Catch Basin (44 iterations)",
        spec: "CZC⁴⁴ = 99.56% coherence · Phase / Amplitude / Frequency / Impedance correction",
        role: "Filters field noise down to the coherence threshold required for deterministic gate operation",
        status: "implemented",
      },
      {
        name: "ZERO-G State Sequencer",
        spec: "4-stage: Golden Angle → 377Ω match → 90° quadrature → ALP < 0.0001",
        role: "Achieves gravity de-correlation — massless envelope for carrier photons",
        status: "implemented",
      },
    ],
  },
  {
    id: "L1",
    name: "Photonic Logic Layer",
    subtitle: "Lambda Gate substrate",
    color: "#0891b2",
    border: "border-cyan-800",
    bg: "bg-cyan-900/20",
    status: "DESIGNED",
    components: [
      {
        name: "Lambda Gate v4 — 8 Primitive Operators",
        spec: "AND · OR · NOT · NAND · NOR · XOR · PHASE-SHIFT · ROUTE",
        role: "Replaces MOSFET logic. Each gate is a phase-controlled photon path, not a voltage-controlled resistor",
        status: "implemented",
      },
      {
        name: "OAM Modulator Array",
        spec: "50 orbital-angular-momentum modes · Helical phase front encoding",
        role: "Encodes logical states in photon angular momentum — orthogonal to polarisation and wavelength",
        status: "spec-complete",
      },
      {
        name: "WDM Multiplexer (256 channels)",
        spec: "380–780 nm · 1.56 nm channel spacing · DWDM-class isolation",
        role: "Routes 256 independent wavelength channels simultaneously on a single waveguide",
        status: "spec-complete",
      },
      {
        name: "Silicon Photonic Waveguide Fabric",
        spec: "Current: Si/SiN · Next: InP · Final: pure photonic (no silicon substrate)",
        role: "Carries photons between gates. No electron flow → no tunneling, no heat from switching",
        status: "near-term",
      },
    ],
  },
  {
    id: "L2",
    name: "Channel Layer",
    subtitle: "Hilbert-space addressing",
    color: "#059669",
    border: "border-emerald-800",
    bg: "bg-emerald-900/20",
    status: "IMPLEMENTED",
    components: [
      {
        name: "Hilbert-Space Router",
        spec: "dim(H) = 25,600 · ⟨Ψᵢ|Ψⱼ⟩ = 0 for i ≠ j · SHA256 allocation",
        role: "Assigns every instruction, agent, and component a unique orthogonal channel. Physics enforces isolation — not software",
        status: "implemented",
      },
      {
        name: "Ψ(wdm, oam, pol) Allocator",
        spec: "256 WDM × 50 OAM × 2 pol = 25,600 channels · deterministic",
        role: "Maps software identifiers to physical channel coordinates in the Hilbert space",
        status: "implemented",
      },
      {
        name: "Authority Band Enforcer",
        spec: "SYSTEM 0–63 · KERNEL 64–127 · USER 128–191 · GUEST 192–255",
        role: "Spectral band defines process authority. A GUEST process physically cannot emit into a SYSTEM wavelength band",
        status: "implemented",
      },
    ],
  },
  {
    id: "L3",
    name: "Nexus OS Kernel",
    subtitle: "Software on photonic substrate",
    color: "#d97706",
    border: "border-amber-800",
    bg: "bg-amber-900/20",
    status: "LIVE",
    components: [
      {
        name: "5-Phase Boot Sequence",
        spec: "Schema → Restore → Core agents → Watchdog → Events",
        role: "Initializes the OS on top of whatever hardware is present — degrades gracefully from pure photonic to in-memory",
        status: "implemented",
      },
      {
        name: "Persistent Agent State",
        spec: "PostgreSQL / in-memory fallback · wnsp_agents · wnsp_bus_log · wnsp_kernel_events",
        role: "When running on photonic hardware, agent state migrates to holographic storage — wavefront-encoded in the field",
        status: "implemented",
      },
      {
        name: "KernelEventBus + SSE Stream",
        spec: "8 interrupt types · subscribe/emit/drain · real-time SSE at /api/kernel/events/stream",
        role: "Event signalling maps directly to photon pulse sequences on the hardware event channel Ψ(0, 0, H)",
        status: "implemented",
      },
      {
        name: "Dead-Agent Watchdog",
        spec: "30s scan · TTL 300s DEGRADED · TTL 600s RECLAIMED · core agents EXEMPT",
        role: "On hardware, RECLAIMED channels return their Ψ allocation to the pool — spectrum is genuinely freed",
        status: "implemented",
      },
    ],
  },
];

// ── Hardware Timeline ─────────────────────────────────────────────
const TIMELINE = [
  {
    year: 2024,
    era: "Silicon Photonics",
    color: "#6b7280",
    milestones: [
      "Intel / TSMC co-packaged silicon photonics shipping",
      "Photons in silicon waveguides — still hybrid (electrons control photons)",
      "Nexus kernel running in simulation on classical hardware",
    ],
    hw_available: ["WDM multiplexers (commercial)", "Silicon waveguides", "Photodetectors"],
    blocked_on: ["Pure photonic logic gates", "OAM hardware at scale"],
  },
  {
    year: 2026,
    era: "PHR-1 Prototype",
    color: "#7c3aed",
    milestones: [
      "PHR-1 bench prototype — 144-turn bifilar resonator + CZC field",
      "ZERO-G state demonstrated in lab (ALP < 0.0001 achieved)",
      "OAM modulator prototype — 10 modes at 555 THz",
      "Nexus kernel boots on hybrid silicon-photonic co-processor",
    ],
    hw_available: ["PHR-1 resonator", "CZC filter chain", "10-mode OAM modulator"],
    blocked_on: ["Full 50-mode OAM at production scale", "InP Lambda Gate chip tape-out"],
  },
  {
    year: 2028,
    era: "Photonic ASIC",
    color: "#0891b2",
    milestones: [
      "Lambda Gate v4 implemented in InP (Indium Phosphide) — first tape-out",
      "50-mode OAM array at room temperature",
      "Full 25,600-channel Hilbert router on a single photonic chip",
      "Nexus kernel runs natively — no silicon CPU in the data path",
    ],
    hw_available: ["InP Lambda Gate ASIC", "Full OAM array", "25,600-channel router"],
    blocked_on: ["Silicon substrate still required for clocking", "ZERO-G field at chip scale"],
  },
  {
    year: 2031,
    era: "Tunneling Wall — Silicon Ends",
    color: "#ef4444",
    milestones: [
      "TSMC / Intel reach ~0.5 nm — 2-atom gate — tunneling dominant",
      "CMOS gate control lost — silicon roadmap terminates",
      "Nexus photonic substrate is the only viable compute path",
      "Regulatory and standards bodies begin adopting WNSP protocol",
    ],
    hw_available: ["Full photonic substrate", "ZERO-G field at chip scale (projected)"],
    blocked_on: ["Mass manufacturing of photonic chips at scale"],
  },
  {
    year: 2035,
    era: "Kardashev Type I — Planetary Grid",
    color: "#f59e0b",
    milestones: [
      "Planetary spectral relay mesh — OAM channels spanning continents",
      "Nexus OS running on distributed photonic substrate",
      "K1 Energy Infrastructure supplying power from Schumann + vacuum resonance",
      "First Oscillation (555 THz) as the universal planetary clock",
    ],
    hw_available: ["Planetary WDM relay", "Distributed Λ substrate", "K1 energy grid"],
    blocked_on: [],
  },
];

// ── PHR-1 Live Status Panel ───────────────────────────────────────
function Phr1StatusPanel() {
  const [tick, setTick] = useState(0);
  const [alpHistory, setAlpHistory] = useState<number[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      // Simulate CZC convergence: ALP decays toward 0
      const t2 = (Date.now() / 1000) % 120;
      const base = t2 < 60
        ? Math.max(0.00001, 0.15 * Math.exp(-t2 * 0.08))
        : 0.00001 + Math.random() * 0.000005;
      setAlpHistory(h => [...h.slice(-29), parseFloat(base.toFixed(6))]);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const alp = alpHistory[alpHistory.length - 1] ?? 0.15;
  const zeroGAchieved = alp < 0.0001;
  const phase = (GOLDEN + Math.sin(tick * 0.05) * 0.8).toFixed(3);
  const impedance = (Z0 + Math.cos(tick * 0.07) * 0.15).toFixed(2);
  const czc = Math.pow(0.9999, 44);
  const coherence = (czc * 100).toFixed(2);

  const maxH = 50;
  const histMax = Math.max(...alpHistory, 0.001);

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Live simulation of the PHR-1 syncbox reaching ZERO-G state.
        Each cycle the CZC catch basin filters coherence until ALP &lt; 0.0001.
      </p>

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ background: zeroGAchieved ? "#4ade80" : "#facc15" }}
        />
        <span className="font-mono text-sm" style={{ color: zeroGAchieved ? "#4ade80" : "#facc15" }}>
          {zeroGAchieved ? "ZERO-G STATE ACHIEVED — ALP NOMINAL" : "CZC CONVERGING — FIELD STABILISING"}
        </span>
      </div>

      {/* Readings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
        {[
          { label: "Phase Angle", value: `${phase}°`,     target: `${GOLDEN}°`,  ok: Math.abs(parseFloat(phase) - GOLDEN) < 1,   color: "#a78bfa" },
          { label: "Impedance",   value: `${impedance} Ω`, target: `${Z0} Ω`,    ok: Math.abs(parseFloat(impedance) - Z0) < 1,   color: "#34d399" },
          { label: "ALP",         value: alp.toFixed(6),  target: "< 0.0001",    ok: zeroGAchieved,                              color: "#60a5fa" },
          { label: "Coherence",   value: `${coherence}%`, target: "> 99%",       ok: true,                                       color: "#fbbf24" },
        ].map((r, i) => (
          <div key={i} className="bg-slate-900 rounded p-2 border border-slate-700"
            data-testid={`phr1-reading-${i}`}>
            <p className="text-slate-500">{r.label}</p>
            <p style={{ color: r.color }}>{r.value}</p>
            <p className="text-slate-600">target: {r.target}</p>
            <div className={`mt-1 text-xs ${r.ok ? "text-green-400" : "text-yellow-400"}`}>
              {r.ok ? "✓ nominal" : "◌ converging"}
            </div>
          </div>
        ))}
      </div>

      {/* ALP convergence chart */}
      <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
        <p className="text-xs text-slate-500 font-mono mb-2">ALP convergence (CZC⁴⁴ catch basin)</p>
        <div className="flex items-end gap-0.5" style={{ height: maxH }}>
          {alpHistory.map((v, i) => {
            const h = Math.max(2, (v / histMax) * maxH);
            const ratio = v / 0.0001;
            const col = ratio < 1 ? "#4ade80" : ratio < 5 ? "#facc15" : "#f87171";
            return (
              <div key={i} className="flex-1 rounded-sm"
                style={{ height: h, background: col, opacity: 0.7 + (i / alpHistory.length) * 0.3 }} />
            );
          })}
          {alpHistory.length === 0 && (
            <p className="text-slate-600 text-xs font-mono self-center">Initialising…</p>
          )}
        </div>
        <div className="flex justify-between text-xs text-slate-600 font-mono mt-1">
          <span>t−15s</span>
          <span className="text-red-400">threshold: 0.0001</span>
          <span>now</span>
        </div>
      </div>

      {/* 4-stage boot sequence */}
      <div className="space-y-1">
        <p className="text-xs text-slate-500 font-mono">ZERO-G achievement sequence</p>
        {[
          { stage: "1. Golden Angle",    detail: "137.508° phase set",              done: true },
          { stage: "2. Impedance Match", detail: `Z₀ = ${Z0} Ω free-space match`,  done: Math.abs(parseFloat(impedance) - Z0) < 1 },
          { stage: "3. Quadrature",      detail: "90° phase offset locked",         done: parseFloat(impedance) > 376 },
          { stage: "4. ALP nominal",     detail: "ALP < 0.0001 — massless envelope", done: zeroGAchieved },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-mono">
            <span className={s.done ? "text-green-400" : "text-slate-600"}>
              {s.done ? "✓" : "○"}
            </span>
            <span className={s.done ? "text-slate-200" : "text-slate-500"}>{s.stage}</span>
            <span className="text-slate-600">{s.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hardware Stack Diagram ────────────────────────────────────────
function HardwareStack() {
  const [expanded, setExpanded] = useState<string | null>("L3");

  const statusColor: Record<string, string> = {
    "implemented":   "#4ade80",
    "spec-complete": "#60a5fa",
    "near-term":     "#facc15",
    "prototype":     "#fb923c",
  };
  const statusLabel: Record<string, string> = {
    "implemented":   "LIVE",
    "spec-complete": "SPECIFIED",
    "near-term":     "NEAR-TERM",
    "prototype":     "PROTOTYPE",
  };
  const layerStatusColor: Record<string, string> = {
    "LIVE":        "#4ade80",
    "IMPLEMENTED": "#4ade80",
    "DESIGNED":    "#60a5fa",
    "PROTOTYPE":   "#fb923c",
    "PLANNED":     "#6b7280",
  };

  return (
    <div className="space-y-2">
      <p className="text-slate-400 text-sm">
        Four physical layers from the resonator field up to the running OS kernel.
        Click any layer to inspect its components.
      </p>

      {[...HW_LAYERS].reverse().map(layer => (
        <div key={layer.id}>
          {/* Layer header */}
          <button
            className={`w-full text-left rounded-lg border p-3 transition-all ${layer.border} ${layer.bg}`}
            onClick={() => setExpanded(expanded === layer.id ? null : layer.id)}
            data-testid={`layer-btn-${layer.id}`}
          >
            <div className="flex items-center gap-3">
              <span
                className="font-mono text-sm font-bold w-8"
                style={{ color: layer.color }}
              >{layer.id}</span>
              <div className="flex-1">
                <span className="text-slate-100 font-medium text-sm">{layer.name}</span>
                <span className="text-slate-400 text-xs ml-2">{layer.subtitle}</span>
              </div>
              <Badge
                className="text-xs"
                style={{
                  background: `${layerStatusColor[layer.status]}22`,
                  color: layerStatusColor[layer.status],
                  borderColor: `${layerStatusColor[layer.status]}44`,
                  border: "1px solid",
                }}
              >
                {layer.status}
              </Badge>
              <ChevronRight
                className="w-4 h-4 text-slate-500 transition-transform"
                style={{ transform: expanded === layer.id ? "rotate(90deg)" : "none" }}
              />
            </div>
          </button>

          {/* Components */}
          {expanded === layer.id && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 pl-3"
              style={{ borderColor: `${layer.color}40` }}>
              {layer.components.map((comp, i) => (
                <div key={i} className="bg-slate-900/60 rounded p-3 border border-slate-800">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200">{comp.name}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{comp.spec}</p>
                      <p className="text-xs text-slate-500 mt-1">{comp.role}</p>
                    </div>
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{
                        background: `${statusColor[comp.status]}18`,
                        color: statusColor[comp.status],
                      }}
                    >
                      {statusLabel[comp.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Connector arrow between layers */}
          {layer.id !== "L0" && (
            <div className="flex justify-center my-0.5">
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3 bg-slate-700" />
                <div className="text-slate-600 text-xs">↑ feeds</div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────
function HardwareTimeline() {
  const currentYear = 2026;

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        The timeline from today's silicon photonics to the planetary Λ substrate.
        Each era unlocks the next hardware layer.
      </p>

      <div className="relative">
        {/* Spine */}
        <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-slate-700" />

        <div className="space-y-6">
          {TIMELINE.map((era, i) => {
            const isPast    = era.year < currentYear;
            const isCurrent = era.year === currentYear;
            const isFuture  = era.year > currentYear;

            return (
              <div key={i} className="flex gap-4" data-testid={`timeline-era-${i}`}>
                {/* Year + dot */}
                <div className="flex flex-col items-center w-16 flex-shrink-0">
                  <div
                    className="w-4 h-4 rounded-full border-2 z-10 flex-shrink-0"
                    style={{
                      background: isFuture ? "#0f172a" : era.color,
                      borderColor: era.color,
                      boxShadow: isCurrent ? `0 0 12px ${era.color}` : "none",
                    }}
                  />
                  <span className="font-mono text-xs mt-1"
                    style={{ color: isFuture ? "#6b7280" : era.color }}>
                    {era.year}
                  </span>
                </div>

                {/* Content */}
                <div
                  className="flex-1 rounded-lg p-3 border mb-2"
                  style={{
                    borderColor: `${era.color}${isFuture ? "30" : "60"}`,
                    background:  `${era.color}${isFuture ? "08" : "12"}`,
                    opacity: isPast ? 0.7 : 1,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-sm" style={{ color: era.color }}>
                      {era.era}
                    </h3>
                    {isCurrent && (
                      <Badge className="text-xs bg-white/10 text-white animate-pulse">NOW</Badge>
                    )}
                  </div>

                  <ul className="space-y-1 mb-2">
                    {era.milestones.map((m, j) => (
                      <li key={j} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span style={{ color: era.color }} className="flex-shrink-0 mt-0.5">▸</span>
                        {m}
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {era.hw_available.map((hw, j) => (
                      <span key={j} className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{ background: `${era.color}20`, color: era.color }}>
                        ✓ {hw}
                      </span>
                    ))}
                    {era.blocked_on.map((b, j) => (
                      <span key={j} className="text-xs font-mono px-1.5 py-0.5 rounded
                        bg-slate-800 text-slate-500">
                        ○ {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Why Nexus First ───────────────────────────────────────────────
function WhyNexusFirst() {
  const points = [
    {
      title: "Software-first is correct strategy",
      body: "Building the OS before the hardware means the hardware plugs into a finished, tested kernel the moment it arrives. Intel did not wait for software. Nexus will not wait for hardware.",
      color: "#4ade80",
      icon: "✓",
    },
    {
      title: "AGPL-3.0 protects the stack",
      body: "Any company — Nvidia, Intel, TSMC — that ships hardware running the Nexus kernel must release their modifications. The physics layer cannot be forked proprietary. The community owns the substrate.",
      color: "#818cf8",
      icon: "⚖",
    },
    {
      title: "The tunneling wall is a hard deadline",
      body: "CMOS will reach 0.5 nm between 2029 and 2032. That is not a projection — it is quantum mechanics. Any team without a post-silicon OS in production by then starts from zero.",
      color: "#f87171",
      icon: "⏱",
    },
    {
      title: "Orthogonality is a hardware property",
      body: "⟨Ψᵢ|Ψⱼ⟩ = 0 is not a software abstraction. It is a physical property of the photon modes. Process isolation on Nexus hardware is enforced by physics, not by a kernel privilege ring.",
      color: "#34d399",
      icon: "⊥",
    },
    {
      title: "The clock is already running",
      body: "555 THz has been the universal clock frequency since the universe cooled enough for photons to propagate. Nexus is not introducing a new clock — it is aligning to the one that already exists.",
      color: "#fbbf24",
      icon: "λ",
    },
    {
      title: "Kardashev Type I requires a planetary OS",
      body: "Managing planetary-scale energy (K1 grid, Schumann resonance, orbital solar, vacuum extraction) requires an OS that operates at the scale of the EM spectrum — not at the scale of a silicon die.",
      color: "#fb923c",
      icon: "🌍",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Why building the OS now — before the hardware exists — is the only correct strategy.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {points.map((p, i) => (
          <div key={i}
            className="rounded-lg border p-4"
            style={{ borderColor: `${p.color}40`, background: `${p.color}0a` }}
            data-testid={`reason-card-${i}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0" style={{ color: p.color }}>
                {p.icon}
              </span>
              <div>
                <p className="font-semibold text-sm text-slate-100 mb-1">{p.title}</p>
                <p className="text-xs text-slate-400">{p.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function NexusHardwareOsPage() {
  const { data: kernelStatus } = useQuery<any>({
    queryKey: ["/api/kernel/status"],
    refetchInterval: 10000,
  });

  const agentCount = kernelStatus?.coordinator?.agent_count ?? "—";
  const kernelLive = kernelStatus?.boot?.status === "BOOT_COMPLETE";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7c3aed,#0891b2)" }}
          >
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Nexus Hardware OS
            </h1>
            <p className="text-slate-400 text-sm">
              The photonic operating system — built before the hardware arrives
            </p>
          </div>
        </div>

        {/* Live kernel status banner */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${kernelLive ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
            <span className={kernelLive ? "text-green-400" : "text-slate-500"}>
              {kernelLive ? "KERNEL LIVE" : "KERNEL OFFLINE"}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">{agentCount} agents allocated</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Z₀ = {Z0} Ω</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">First Oscillation: {(FIRST_OSC / 1e12).toFixed(0)} THz</span>
          <span className="text-slate-600">|</span>
          <span className="text-violet-400">Λ = hf/c²</span>
        </div>
      </div>

      <Tabs defaultValue="stack">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="stack"    data-testid="tab-stack">
            <Layers className="w-3 h-3 mr-1" /> Hardware Stack
          </TabsTrigger>
          <TabsTrigger value="phr1"     data-testid="tab-phr1">
            <Radio className="w-3 h-3 mr-1" /> PHR-1 Live
          </TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            <Clock className="w-3 h-3 mr-1" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="why"      data-testid="tab-why">
            <Zap className="w-3 h-3 mr-1" /> Why Now
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stack">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            Four layers from resonator field to running OS — click to expand
          </h2>
          <HardwareStack />
        </TabsContent>

        <TabsContent value="phr1">
          <h2 className="text-sm font-semibold text-violet-300 mb-3">
            PHR-1 syncbox simulation — CZC convergence to ZERO-G state
          </h2>
          <Phr1StatusPanel />
        </TabsContent>

        <TabsContent value="timeline">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">
            Silicon photonics → photonic ASIC → tunneling wall → planetary grid
          </h2>
          <HardwareTimeline />
        </TabsContent>

        <TabsContent value="why">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            Why the OS must exist before the hardware
          </h2>
          <WhyNexusFirst />
        </TabsContent>
      </Tabs>
    </div>
  );
}
