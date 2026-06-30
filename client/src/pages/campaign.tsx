import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import TelegramVideoGallery from "@/components/TelegramVideoGallery";
import {
  Zap, Cpu, Radio, Waves, Shield, Globe, Layers, Activity,
  ArrowRight, ExternalLink, Check, ChevronDown, ChevronUp,
  Atom, FlaskConical, Code2, BookOpen, Rocket, Target,
  Users, Coins, Star, Lock, Eye, GitBranch, Network, MapPin,
  FileText, X, Copy, CheckCircle2, Wallet, Bitcoin,
} from "lucide-react";

// ── Token distribution ────────────────────────────────────────────────────
const TOTAL_SUPPLY = 21_000_000_000;

const TOKEN_TRANCHES = [
  { label: "Genesis / Founders",       pct: 2.38,  nxt: "500 M",   color: "#f59e0b", note: "Pre-constitutional — already minted" },
  { label: "Orbital Treasury",         pct: 20,    nxt: "4.2 B",   color: "#6366f1", note: "Locked at genesis, released by governance" },
  { label: "Charity Trust",            pct: 10,    nxt: "2.1 B",   color: "#a78bfa", note: "Vested over 10 years — funds BHLS services" },
  { label: "Campaign Phase 1 — SNIC",  pct: 5,     nxt: "1.05 B",  color: "#22d3ee", note: "Backers who fund the first node" },
  { label: "Campaign Phase 2 — PHR-1", pct: 5,     nxt: "1.05 B",  color: "#34d399", note: "Backers who fund photonic routing" },
  { label: "Campaign Phase 3 — Mesh",  pct: 5,     nxt: "1.05 B",  color: "#f472b6", note: "Backers who fund the live mesh" },
  { label: "Campaign Phase 4 — Compiler", pct: 5,  nxt: "1.05 B",  color: "#fb923c", note: "Backers who fund the photonic compiler" },
  { label: "Developer Ecosystem",      pct: 15,    nxt: "3.15 B",  color: "#4ade80", note: "Earned through building on the platform" },
  { label: "Citizens / Public",        pct: 32.62, nxt: "6.85 B",  color: "#94a3b8", note: "Earned through participation and mesh contribution" },
];

// ── Phase 0 — Software proofs already live ────────────────────────────────
const PHASE_ZERO = [
  {
    title: "CE-SE Pipeline",
    href: "/ce-se-pipeline",
    icon: Zap,
    color: "#fbbf24",
    proves: "Character-to-wavelength encoding works end-to-end. Data can be expressed as light frequencies. Live in your browser right now.",
  },
  {
    title: "WavelengthScript Compiler",
    href: "/wavelength-lang",
    icon: Code2,
    color: "#a78bfa",
    proves: "A programming language built on physics compiles and executes. The instruction set for photonic hardware already exists.",
  },
  {
    title: "WNSP Virtual Machine",
    href: "/wnsp-vm",
    icon: Cpu,
    color: "#22d3ee",
    proves: "Bytecode executes step-by-step in Ψ channel registers. The VM that will run on real photonic hardware is already operational.",
  },
  {
    title: "Compression Explorer",
    href: "/compression-explorer",
    icon: Waves,
    color: "#34d399",
    proves: "Λ=hf/c² compression curve is real, interactive, and mathematically verified. The physics is calculated, not theoretical.",
  },
  {
    title: "Spectral Router",
    href: "/spectral-router",
    icon: Network,
    color: "#f472b6",
    proves: "DNS-free routing via Ψ channel addresses works today — without any physical hardware.",
  },
  {
    title: "Hardware Lab",
    href: "/hardware-lab",
    icon: FlaskConical,
    color: "#fb923c",
    proves: "Physics calibration and spectrometer interface — already built to receive real hardware input the moment SNIC exists.",
  },
  {
    title: "Hardware Spec (AGPL-3.0)",
    href: "/hardware-spec",
    icon: Shield,
    color: "#6366f1",
    proves: "Formal specification of SNIC, PHR-1, Spectral Relay Mesh v1, and WavelengthScript Compiler α. First public disclosure 2026-05-16. Independently verifiable.",
  },
];

// ── Hardware phases ────────────────────────────────────────────────────────
const PHASES = [
  {
    phase: 1,
    name: "SNIC",
    full: "Spectral Network Interface Card",
    color: "#22d3ee",
    gradient: "from-cyan-500/20 to-cyan-900/10",
    border: "border-cyan-500/30",
    tokenPct: "5%",
    tokenNxt: "1.05 B NXT",
    goal: "First physical node capable of wavelength addressing",
    breakthrough: {
      title: "First live spectrometer reading showing data encoded as a physical wavelength",
      detail: "A character is sent. Here is the light it became. Here is the instrument reading. Published on-chain with timestamp. Any physicist can verify it independently.",
      items: [
        "CE table lookup executing as a real wavelength selection — not a simulation",
        "Published spectrometer output, timestamped on-chain",
        "Independent third-party verification open to any lab",
      ],
    },
    audiences: ["Photonics & Physics research labs", "Open source hardware community"],
  },
  {
    phase: 2,
    name: "PHR-1",
    full: "Photonic Hardware Router",
    color: "#a78bfa",
    gradient: "from-violet-500/20 to-violet-900/10",
    border: "border-violet-500/30",
    tokenPct: "5%",
    tokenNxt: "1.05 B NXT",
    goal: "First packet routed between physical nodes using wavelength addressing — no IP, no DNS",
    breakthrough: {
      title: "Node A sends. Node B receives. No internet involved.",
      detail: "Here is node A. Here is node B. Here is the packet. Here is the route. WNSP URI resolves to a physical address in real hardware. Latency published — photon travel time versus TCP/IP overhead.",
      items: [
        "WNSP URI resolves to a physical address in real hardware",
        "Measurable latency comparison vs TCP/IP published",
        "The first moment the internet has a competitor",
      ],
    },
    audiences: ["Sovereignty & infrastructure builders", "Mesh networking communities (Meshtastic, goTenna)"],
  },
  {
    phase: 3,
    name: "Spectral Relay Mesh v1",
    full: "Spectral Relay Mesh v1",
    color: "#34d399",
    gradient: "from-emerald-500/20 to-emerald-900/10",
    border: "border-emerald-500/30",
    tokenPct: "5%",
    tokenNxt: "1.05 B NXT",
    goal: "A live, working section of the WNSP network — censorship-proof routing demonstrated",
    breakthrough: {
      title: "A node is physically destroyed. The message still arrives.",
      detail: "We unplug the node live. The mesh reroutes. The data survives. First censorship-resistance demonstration that is independently witnessed and recorded.",
      items: [
        "Live multi-node OAM multiplexing — multiple streams on the same beam",
        "Physical node failure test — witnessed and recorded",
        "The moment the network becomes real",
      ],
    },
    audiences: ["Deep tech investors", "Longtermist organisations", "Decentralisation community"],
  },
  {
    phase: 4,
    name: "WavelengthScript Compiler α",
    full: "WavelengthScript Compiler α",
    color: "#fb923c",
    gradient: "from-orange-500/20 to-orange-900/10",
    border: "border-orange-500/30",
    tokenPct: "5%",
    tokenNxt: "1.05 B NXT",
    goal: "First code written by a human, compiled by WavelengthScript, executed by light",
    breakthrough: {
      title: "This line of code ran on a photon. Not on a transistor. On a photon.",
      detail: "Side-by-side energy consumption published: silicon vs photonic — same task, fraction of the power. Live AI agent running on the photonic OS.",
      items: [
        "Energy comparison published: silicon vs photonic for identical task",
        "First AI agent running on the photonic OS",
        "The silicon age ends here",
      ],
    },
    audiences: ["Academic and research institutions", "Enterprise infrastructure buyers", "Developers already using the platform"],
  },
];

// ── Target audiences ──────────────────────────────────────────────────────
const AUDIENCES = [
  {
    name: "Photonics & Physics Research",
    icon: FlaskConical,
    color: "#22d3ee",
    channels: "arXiv, IEEE Photonics Society, Optica",
    why: "They understand exactly what SNIC and PHR-1 mean. They don't need convincing the physics works. When a photonics lab validates it, everyone else follows.",
  },
  {
    name: "Open Source Hardware",
    icon: GitBranch,
    color: "#a78bfa",
    channels: "RISC-V Foundation, OpenCores, FOSDEM",
    why: "Already believe in building open infrastructure. AGPL-3.0 is their language. They contribute, audit, and amplify — they don't just back, they build.",
  },
  {
    name: "Sovereignty & Mesh Builders",
    icon: Network,
    color: "#34d399",
    channels: "Meshtastic, Althea, goTenna communities",
    why: "They feel the problem every day — censorship, infrastructure control, single points of failure. The Phase 3 mesh proof speaks directly to them.",
  },
  {
    name: "Deep Tech & Longtermists",
    icon: Rocket,
    color: "#fb923c",
    channels: "Survival & Flourishing Fund, Open Philanthropy, Founders Fund",
    why: "Not crypto — Kardashev-scale thinkers funding 20-year infrastructure plays. Frame: this is what comes after the internet.",
  },
  {
    name: "Developers on the Platform",
    icon: Code2,
    color: "#f472b6",
    channels: "npm (nexusos-ce-encoder), GitHub, this platform",
    why: "Already invested — the campaign converts them from users to infrastructure funders. They can open a browser tab and watch the VM execute right now.",
  },
];

// ── Community micro-donation tiers ─────────────────────────────────────────
const COMMUNITY_TIERS = [
  {
    tier: -1,
    name: "Quanta",
    usd: "$1",
    nxt: 1_000,
    nxtLabel: "1,000 NXT",
    color: "#94a3b8",
    gradient: "from-slate-500/20 to-slate-900/10",
    border: "border-slate-500/30",
    zone: "Community Supporter",
    icon: Zap,
    description: "Every photon counts. A $1 contribution gets you recorded on-chain as a NexusOS community backer — permanently.",
    rewards: [
      "1,000 NXT issued on-chain instantly",
      "Physics-signed spectral contract as your receipt",
      "Name recorded in the community backer registry",
    ],
  },
  {
    tier: 0,
    name: "Signal",
    usd: "$10",
    nxt: 10_000,
    nxtLabel: "10,000 NXT",
    color: "#38bdf8",
    gradient: "from-sky-500/20 to-sky-900/10",
    border: "border-sky-500/30",
    zone: "Community Supporter",
    icon: Radio,
    description: "Ten dollars, ten thousand NXT. Your signal joins the network — recorded on-chain with a spectral contract.",
    rewards: [
      "10,000 NXT issued on-chain instantly",
      "Physics-signed spectral contract as your receipt",
      "Name recorded in the community backer registry",
      "Spectral Observer badge on your NexusOS profile",
    ],
  },
];

// ── Lab donation tiers ─────────────────────────────────────────────────────
const LAB_TIERS = [
  {
    tier: 1,
    name: "Photon",
    usd: "$50",
    nxt: 50_000,
    nxtLabel: "50,000 NXT",
    color: "#22d3ee",
    gradient: "from-cyan-500/20 to-cyan-900/10",
    border: "border-cyan-500/30",
    zone: "ESD Workstation",
    icon: Zap,
    availability: "Unlimited",
    rewards: [
      "Name in on-chain backer registry",
      "ESD Workstation access badge",
      "Spectral observer status in launch broadcast",
    ],
  },
  {
    tier: 2,
    name: "Wavelength",
    usd: "$250",
    nxt: 250_000,
    nxtLabel: "250,000 NXT",
    color: "#a78bfa",
    gradient: "from-violet-500/20 to-violet-900/10",
    border: "border-violet-500/30",
    zone: "Spectrometer Suite",
    icon: Waves,
    availability: "Unlimited",
    rewards: [
      "Everything in Photon",
      "Spectrometer Suite virtual tour (live stream)",
      "Early access: monthly lab progress reports",
    ],
  },
  {
    tier: 3,
    name: "Spectrum",
    usd: "$1,000",
    nxt: 1_000_000,
    nxtLabel: "1,000,000 NXT",
    color: "#34d399",
    gradient: "from-emerald-500/20 to-emerald-900/10",
    border: "border-emerald-500/30",
    zone: "SNIC Fabrication Bench",
    icon: Radio,
    availability: "100 slots",
    rewards: [
      "Everything in Wavelength",
      "SNIC prototype unit (shipped post-fabrication)",
      "Fabrication Bench dedication plaque (physical + on-chain)",
    ],
  },
  {
    tier: 4,
    name: "Relay",
    usd: "$5,000",
    nxt: 5_000_000,
    nxtLabel: "5,000,000 NXT",
    color: "#fb923c",
    gradient: "from-orange-500/20 to-orange-900/10",
    border: "border-orange-500/30",
    zone: "PHR-1 Alignment Chamber",
    icon: Activity,
    availability: "25 slots",
    rewards: [
      "Everything in Spectrum",
      "PHR-1 prototype unit (shipped post-fabrication)",
      "Alignment Chamber naming rights (on-chain + plaque)",
      "Private lab walkthrough session (video call with team)",
    ],
  },
  {
    tier: 5,
    name: "Genesis Node",
    usd: "$25,000",
    nxt: 25_000_000,
    nxtLabel: "25,000,000 NXT",
    color: "#f59e0b",
    gradient: "from-amber-500/20 to-amber-900/10",
    border: "border-amber-500/30",
    zone: "Optical Testing Bay + Server Room",
    icon: Star,
    availability: "5 slots",
    rewards: [
      "Everything in Relay",
      "Optical Testing Bay naming rights",
      "Server Room co-location slot (one rack unit)",
      "Founding Partner status — permanent on-chain recognition",
      "Direct line to core team for hardware collaboration",
    ],
  },
];

// Total Phase 1 pool = 1,050,000,000 NXT (5% of 21B supply)
// Breakdown of how campaign funds are allocated:
const LAB_POOL = [
  { label: "Equipment Procurement",  nxt: "500,000,000", pct: 47.6, color: "#22d3ee" },
  { label: "Prototype Distribution", nxt: "400,000,000", pct: 38.1, color: "#a78bfa" },
  { label: "Lab Operations Reserve", nxt: "150,000,000", pct: 14.3, color: "#34d399" },
];

function BarSegment({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div
      style={{ width: `${pct}%`, backgroundColor: color, minWidth: pct < 3 ? "2px" : undefined }}
      className="h-full relative group cursor-default"
      title={`${label}: ${pct}%`}
    />
  );
}

function PhaseCard({ p, expanded, onToggle }: { p: typeof PHASES[0]; expanded: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-xl border ${p.border} bg-gradient-to-br ${p.gradient} overflow-hidden`}>
      <button
        className="w-full text-left p-5 flex items-start gap-4"
        onClick={onToggle}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
          style={{ backgroundColor: `${p.color}22`, border: `1px solid ${p.color}55`, color: p.color }}
        >
          {p.phase}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm">{p.name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: `${p.color}22`, color: p.color }}>
              {p.tokenPct} · {p.tokenNxt}
            </span>
          </div>
          <div className="text-white/50 text-xs mt-0.5">{p.full}</div>
          <div className="text-white/70 text-xs mt-1.5">{p.goal}</div>
        </div>
        <div className="shrink-0 text-white/30 mt-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: p.color }}>Breakthrough Proof</div>
            <div className="text-white font-medium text-sm mb-1">{p.breakthrough.title}</div>
            <div className="text-white/50 text-xs leading-relaxed mb-3">{p.breakthrough.detail}</div>
            <div className="space-y-1.5">
              {p.breakthrough.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                  <Check size={12} className="shrink-0 mt-0.5" style={{ color: p.color }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-2">Target Audiences</div>
            <div className="flex flex-wrap gap-2">
              {p.audiences.map((a, i) => (
                <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-white/5 text-white/50">{a}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Donate Modal ──────────────────────────────────────────────────────────
interface DonateResult {
  txId: string; tierName: string; nxtLabel: string; usd: string; zone: string;
  psiChannel: string; wavelengthNm: number; band: string; walletAddress: string;
  contractText: string; signature: string; contentHash: string; timestamp: string;
  newBalance: string;
}

function DonateModal({ t, onClose }: { t: typeof LAB_TIERS[0]; onClose: () => void }) {
  const [result, setResult] = useState<DonateResult | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: auth } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const r = await fetch("/api/auth/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      return r.ok ? r.json() : null;
    },
  });

  const { data: physics } = useQuery<any>({
    queryKey: ["/api/physics/my"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const r = await fetch("/api/physics/my", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      return r.ok ? r.json() : null;
    },
    enabled: !!auth,
  });

  const donate = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      const r = await fetch("/api/campaign/donate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ tier: t.tier }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Donation failed");
      return data as DonateResult;
    },
    onSuccess: (data) => setResult(data),
  });

  const psi  = physics?.channel?.psi ?? "—";
  const nm   = physics?.channel?.wavelength_nm ?? null;
  const band = physics?.channel?.band ?? "—";
  const addr = auth?.wallet?.address ?? "—";
  const isLoggedIn = !!auth?.user;

  function copyContract() {
    if (!result) return;
    const full = result.contractText + "\n\nSIGNATURE: " + result.signature;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0d1117] border rounded-2xl overflow-hidden shadow-2xl"
           style={{ borderColor: t.color + "40" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: t.color + "22", border: `1px solid ${t.color}55`, color: t.color }}>
              <t.icon size={14} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Back Tier — {t.name}</div>
              <div className="text-[10px] font-mono text-white/30">{t.nxtLabel} · {t.usd}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {!result ? (
            <>
              {/* Channel info */}
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4 space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-3">
                  Your Spectral Identity
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-y-2 text-xs">
                  <span className="text-white/40">Ψ Channel</span>
                  <span className="font-mono text-cyan-300">{psi}</span>
                  <span className="text-white/40">Wavelength</span>
                  <span className="font-mono text-white/70">{nm ? `${nm}nm` : "—"}</span>
                  <span className="text-white/40">Band</span>
                  <span className="font-mono text-white/70">{band}</span>
                  <span className="text-white/40">Wallet</span>
                  <span className="font-mono text-white/50 text-[10px] break-all">{addr}</span>
                </div>
                {!isLoggedIn && (
                  <div className="mt-3 text-[11px] text-amber-400/70 bg-amber-500/10 rounded px-3 py-2">
                    Log in to record your donation on-chain and receive your spectral contract.
                  </div>
                )}
              </div>

              {/* Step 1 — External payment */}
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">STEP 1</span>
                  <span className="text-xs font-semibold text-white/80">Complete your payment first</span>
                </div>
                <p className="text-[11px] text-amber-200/50 leading-relaxed">
                  NXT is issued as an on-chain reward <span className="text-amber-200/80 font-medium">after</span> your external
                  contribution is confirmed. Back the campaign on Indiegogo (or contact the team directly), then return here to
                  record it on-chain.
                </p>
                <a
                  href="/indiegogo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <ExternalLink size={10} />
                  Go to campaign page → {t.usd} · {t.name} tier
                </a>
              </div>

              {/* Step 2 — On-chain record */}
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/50">STEP 2</span>
                  <span className="text-xs font-semibold text-white/70">Record your contribution on-chain</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={11} style={{ color: t.color }} />
                  <span className="text-[11px] text-white/50">Zone funded: <span className="text-white/70">{t.zone}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet size={11} className="text-white/30" />
                  <span className="text-[11px] text-white/40">
                    <span className="text-white/60 font-mono">{t.nxtLabel}</span> will be issued from the
                    Hardware Campaign pool to your wallet as your on-chain backer receipt.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={11} className="text-white/30" />
                  <span className="text-[11px] text-white/40">
                    A spectral-signed AGPL-3.0 public works contract is generated at your
                    Ψ channel wavelength and permanently recorded on the WNSP network.
                  </span>
                </div>
              </div>

              {/* AGPL / GitHub notice */}
              <div className="text-[10px] font-mono text-white/20 text-center leading-relaxed">
                AGPL-3.0 · Free Public Works · github.com/nexusosdaily-code/NexusOS<br />
                First disclosure 2026-05-16 · Not a financial instrument
              </div>

              {donate.error && (
                <div className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2 text-center">
                  {(donate.error as Error).message}
                </div>
              )}

              <button
                onClick={() => donate.mutate()}
                disabled={!isLoggedIn || donate.isPending}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ backgroundColor: t.color + "30", border: `1px solid ${t.color}60`, color: t.color }}
              >
                {donate.isPending ? "Recording on-chain…" : isLoggedIn ? `Record contribution on-chain — ${t.name}` : "Log in to continue"}
              </button>
            </>
          ) : (
            <>
              {/* Success state */}
              {t.tier <= 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-xl"
                     style={{ backgroundColor: t.color + "15", border: `1px solid ${t.color}30` }}>
                  <CheckCircle2 size={20} style={{ color: t.color }} className="shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-white">Shareholder declaration recorded on-chain</div>
                    <div className="text-[11px] text-white/50 mt-0.5">You are now a permanent co-owner of NexusOS public infrastructure.</div>
                    <div className="text-[10px] text-white/30 font-mono mt-0.5">TX: {result.txId}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl"
                     style={{ backgroundColor: t.color + "15", border: `1px solid ${t.color}30` }}>
                  <CheckCircle2 size={20} style={{ color: t.color }} className="shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-white">Donation recorded on-chain</div>
                    <div className="text-[11px] text-white/40 font-mono mt-0.5">TX: {result.txId}</div>
                  </div>
                </div>
              )}

              {/* Wallet update */}
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">Ψ Channel</span>
                  <span className="font-mono text-cyan-300">{result.psiChannel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">NXT received</span>
                  <span className="font-mono text-emerald-400">+{result.nxtLabel}</span>
                </div>
                {t.tier <= 0 ? (
                  <div className="flex justify-between">
                    <span className="text-white/40">Shareholder status</span>
                    <span className="text-white/60">Permanent · Non-revocable</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-white/40">Zone funded</span>
                    <span className="text-white/60">{result.zone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/40">Signature</span>
                  <span className="font-mono text-white/30 text-[10px]">{result.signature.slice(0, 40)}…</span>
                </div>
              </div>

              {/* Community tier: ownership explainer */}
              {t.tier <= 0 && (
                <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 text-[10px] font-mono text-white/30 leading-relaxed space-y-1">
                  <div className="text-white/50 font-bold mb-1">What you own</div>
                  <div>· WNSP spectral relay nodes (present + future)</div>
                  <div>· SNIC photonic compute units</div>
                  <div>· PHR-1 routing hardware</div>
                  <div>· All AGPL-3.0 public works produced by NexusOS</div>
                  <div className="pt-1 text-white/20">This declaration persists on-chain permanently — regardless of whether any founding team member is alive or active.</div>
                </div>
              )}

              {/* Contract text */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">
                    {t.tier <= 0 ? "Shareholder Declaration" : "Spectral Contract"}
                  </div>
                  <button onClick={copyContract}
                          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                    {copied ? <CheckCircle2 size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="bg-[#060a0f] border border-white/5 rounded-lg p-3 text-[9px] font-mono text-emerald-300/70 overflow-x-auto whitespace-pre leading-relaxed max-h-48 overflow-y-auto">
                  {result.contractText}
                  {"\n\nSIGNATURE: " + result.signature}
                </pre>
              </div>

              <div className="text-[10px] font-mono text-white/20 text-center">
                {t.tier <= 0
                  ? "AGPL-3.0 · Publicly owned infrastructure · Civilisation-grade permanence"
                  : "AGPL-3.0 · Free public works declaration · Verified at " + result.psiChannel}
              </div>

              <button onClick={onClose}
                      className="w-full py-2.5 rounded-xl text-sm text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LabTierCard({ t, expanded, onToggle, onDonate }: {
  t: typeof LAB_TIERS[0]; expanded: boolean; onToggle: () => void; onDonate: () => void;
}) {
  return (
    <div className={`rounded-xl border ${t.border} bg-gradient-to-br ${t.gradient} overflow-hidden`}>
      <button
        className="w-full text-left p-5 flex items-start gap-4"
        onClick={onToggle}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `${t.color}22`, border: `1px solid ${t.color}55`, color: t.color }}
        >
          <t.icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm">{t.name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
              {t.nxtLabel}
            </span>
            <span className="text-[10px] font-mono text-white/30">{t.usd}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={10} style={{ color: t.color }} className="shrink-0" />
            <span className="text-white/50 text-xs">{t.zone}</span>
          </div>
          <div className="text-[11px] text-white/30 mt-0.5">{t.availability}</div>
        </div>
        <div className="shrink-0 text-white/30 mt-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: t.color }}>Rewards</div>
            <div className="space-y-2">
              {t.rewards.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                  <Check size={12} className="shrink-0 mt-0.5" style={{ color: t.color }} />
                  {r}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDonate(); }}
            className="w-full py-2.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
            style={{ backgroundColor: t.color + "25", border: `1px solid ${t.color}50`, color: t.color }}
          >
            Back this tier — {t.nxtLabel} · {t.usd}
          </button>
          <div className="text-[10px] font-mono text-white/20 text-center">
            Spectral-signed AGPL-3.0 contract issued to your Ψ channel on confirmation
          </div>
        </div>
      )}
    </div>
  );
}

function CommunityTierCard({ t, onDonate }: {
  t: typeof COMMUNITY_TIERS[0]; onDonate: () => void;
}) {
  return (
    <div className={`rounded-xl border ${t.border} bg-gradient-to-br ${t.gradient} p-5 flex items-center gap-4`}>
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${t.color}22`, border: `1px solid ${t.color}55`, color: t.color }}
      >
        <t.icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white text-sm">{t.name}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
            {t.nxtLabel}
          </span>
          <span className="text-[10px] font-mono text-white/30">{t.usd}</span>
        </div>
        <p className="text-[11px] text-white/40 mt-1 leading-relaxed">{t.description}</p>
      </div>
      <button
        onClick={onDonate}
        className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 whitespace-nowrap"
        style={{ backgroundColor: t.color + "25", border: `1px solid ${t.color}50`, color: t.color }}
      >
        Back — {t.usd}
      </button>
    </div>
  );
}

export default function CampaignPage() {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [expandedTier, setExpandedTier] = useState<number | null>(null);
  const [expandedAudience, setExpandedAudience] = useState<number | null>(null);
  const [donatingTier, setDonatingTier] = useState<typeof LAB_TIERS[0] | typeof COMMUNITY_TIERS[0] | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <Link href="/wnsp" className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1.5 transition-colors">
          ← NexusOS
        </Link>
        <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">Infrastructure Campaign</span>
        <Link href="/indiegogo" className="text-[11px] font-mono px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1.5 hover:bg-orange-500/30 transition-colors">
          Indiegogo <ExternalLink size={10} />
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-14">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Phase 0 — Software Complete · Hardware Begins
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            Building the infrastructure for a<br />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-orange-400 bg-clip-text text-transparent">
              Type I Civilisation
            </span>
          </h1>
          <p className="text-white/50 text-sm max-w-xl mx-auto leading-relaxed">
            One photonic component at a time. Each campaign funds one layer of the network.
            When all four are complete, the first censorship-proof, physics-based network is live.
            Your contribution is recorded on-chain, permanently.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/hardware-spec" className="text-xs px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
              <Shield size={12} /> Hardware Spec (AGPL-3.0)
            </Link>
            <Link href="/indiegogo" className="text-xs px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-colors flex items-center gap-1.5">
              <Rocket size={12} /> Campaign Page
            </Link>
          </div>
        </div>

        {/* Phase 0 — Proof Already Exists */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Phase 0 — Already Built</div>
            <h2 className="text-lg font-bold text-white">The software already proves it works.</h2>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              We are not asking anyone to fund an idea. The idea runs in your browser right now.
              Open any of these — every one is a live demonstration of the physics that the hardware will run on.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PHASE_ZERO.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex gap-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-all"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${item.color}18`, border: `1px solid ${item.color}33` }}
                >
                  <item.icon size={14} style={{ color: item.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1">
                    {item.title} <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5 leading-snug">{item.proves}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* WNSP Research Paper */}
        <div>
          <div className="mb-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Peer-Reviewable Research</div>
            <h2 className="text-lg font-bold text-white">The physics is published. Read it yourself.</h2>
          </div>
          <Link href="/wnsp-paper">
            <div className="group rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-blue-900/10 p-5 hover:border-violet-500/50 hover:from-violet-500/15 hover:to-blue-900/15 transition-all cursor-pointer">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#8b5cf620", border: "1px solid #8b5cf640" }}>
                    <BookOpen size={14} style={{ color: "#8b5cf6" }} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-violet-400/70 uppercase tracking-wider">NexusOS Research · May 2026</div>
                    <div className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors leading-snug">
                      Multidimensional Orthogonal Communication via WDM, OAM, and Polarization
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-violet-400 shrink-0 mt-1 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-white/50 leading-relaxed mb-3 pl-10">
                We present WNSP — a communication framework replacing software-defined addressing with
                physics-derived channel allocation across three orthogonal electromagnetic dimensions: WDM (256 channels),
                OAM (50 modes), and polarization (2 states). The combined Hilbert space yields{" "}
                <span className="text-emerald-400 font-semibold">25,600 mutually orthogonal channels</span>{" "}
                satisfying ⟨Ψ<sub>i</sub>|Ψ<sub>j</sub>⟩ = 0 by quantum mechanical principle — enforced by physics, not software policy.
              </p>
              <div className="flex flex-wrap gap-1.5 pl-10">
                {["WNSP", "WDM", "OAM", "Spectral Addressing", "Quantum Orthogonality", "Photonic Computing", "Security"].map(tag => (
                  <span key={tag} className="text-[10px] bg-white/5 border border-white/10 rounded px-2 py-0.5 text-white/40 font-mono">{tag}</span>
                ))}
                <span className="text-[10px] bg-violet-500/10 border border-violet-500/30 rounded px-2 py-0.5 text-violet-400 font-mono ml-1">Read Paper →</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Hardware Phases */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Hardware Phases 1–4</div>
            <h2 className="text-lg font-bold text-white">Each phase completes a layer of the network.</h2>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              Every campaign closes with a tangible breakthrough proof — independently verifiable, timestamped on-chain before the next phase opens.
              Earlier backers receive more NXT per dollar. Higher risk, higher stake in what they made possible.
            </p>
          </div>
          <div className="space-y-3">
            {PHASES.map((p) => (
              <PhaseCard
                key={p.phase}
                p={p}
                expanded={expandedPhase === p.phase}
                onToggle={() => setExpandedPhase(expandedPhase === p.phase ? null : p.phase)}
              />
            ))}
          </div>
        </div>

        {/* Nexus Operations — Lab Funding */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Nexus Operations</div>
            <h2 className="text-lg font-bold text-white">Nexus Operations — Lab Funding</h2>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              Each donation funds a specific zone of the physical testing facility.
            </p>
          </div>

          {/* Campaign images */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
              <img
                src="/attached_assets/nexus_operations_floor_plan.png"
                alt="Nexus Operations Facility Layout"
                className="w-full object-cover"
              />
              <div className="px-3 py-2 text-[10px] font-mono text-white/30 text-center">Facility Layout v1.0</div>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
              <img
                src="/attached_assets/nexus_operations_tokenomics.png"
                alt="Nexus Operations Donation Tiers"
                className="w-full object-cover"
              />
              <div className="px-3 py-2 text-[10px] font-mono text-white/30 text-center">Donation Tiers</div>
            </div>
          </div>

          {/* Pool breakdown bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">Hardware Campaign Pool</div>
              <div className="text-[10px] font-mono text-white/30">1,050,000,000 NXT</div>
            </div>
            <div className="w-full h-4 rounded-full overflow-hidden flex mb-3">
              <BarSegment pct={47.6} color="#22d3ee" label="Equipment Procurement" />
              <BarSegment pct={38.1} color="#a78bfa" label="Prototype Distribution" />
              <BarSegment pct={14.3} color="#34d399" label="Lab Operations Reserve" />
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Equipment Procurement", color: "#22d3ee", nxt: "500,000,000", pct: "47.6%" },
                { label: "Prototype Distribution", color: "#a78bfa", nxt: "400,000,000", pct: "38.1%" },
                { label: "Lab Operations Reserve", color: "#34d399", nxt: "150,000,000", pct: "14.3%" },
              ].map((seg) => (
                <div key={seg.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-[11px] text-white/40">{seg.label}</span>
                  <span className="text-[11px] font-mono text-white/30">{seg.pct}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Community tiers */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/5" />
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 px-2">Community — Any Budget Welcome</div>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <p className="text-[11px] text-white/30 text-center -mt-2 mb-4">
              Can't afford $50? No problem. Even $1 earns NXT, gets recorded on-chain, and makes you a permanent part of this.
            </p>
            {COMMUNITY_TIERS.map((t) => (
              <CommunityTierCard
                key={t.tier}
                t={t}
                onDonate={() => setDonatingTier(t as any)}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/5" />
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 px-2">Hardware Lab Tiers</div>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Lab tier cards */}
          <div className="space-y-3">
            {LAB_TIERS.map((t) => (
              <LabTierCard
                key={t.tier}
                t={t}
                expanded={expandedTier === t.tier}
                onToggle={() => setExpandedTier(expandedTier === t.tier ? null : t.tier)}
                onDonate={() => setDonatingTier(t)}
              />
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-4 text-center text-[11px] font-mono text-white/20">
            All lab milestones recorded on-chain · AGPL-3.0 · Open science
          </div>
        </div>

        {/* Token Distribution */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Token Distribution</div>
            <h2 className="text-lg font-bold text-white">21 Billion NXT — distributed by contribution</h2>
            <p className="text-white/40 text-xs mt-1">
              No entity may hold more than 33% of circulating supply (C-0001 Non-Dominance). Earlier backers receive more NXT per dollar than later phases.
            </p>
          </div>

          {/* Bar chart */}
          <div className="w-full h-5 rounded-full overflow-hidden flex mb-4">
            {TOKEN_TRANCHES.map((t) => (
              <BarSegment key={t.label} pct={t.pct} color={t.color} label={t.label} />
            ))}
          </div>

          <div className="space-y-2">
            {TOKEN_TRANCHES.map((t) => (
              <div key={t.label} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/80">{t.label}</div>
                  <div className="text-[11px] text-white/30">{t.note}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-white/70">{t.nxt}</div>
                  <div className="text-[10px] font-mono text-white/30">{t.pct}%</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300/70 leading-relaxed">
            C-0001 Non-Dominance: no single entity may hold more than 33% of circulating NXT. The charity trust funds the Basic Human Living Standard — 1,150 NXT/month measured monthly service consumption per citizen, delivered through the charity which receives funds from the orbital treasury.
          </div>
        </div>

        {/* BRC-20 Economic Supplement */}
        <div>
          <div className="mb-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Bitcoin Economic Layer</div>
            <h2 className="text-lg font-bold text-white">wnsp BRC-20 — The Bitcoin Gateway</h2>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              wnsp BRC-20 and NXT share an identical 21B maximum supply — 1:1 parity. BRC-20 is the Bitcoin-native entry into the NexusOS economy. Minting wnsp on Bitcoin signals participation and unlocks the same campaign tiers as holding NXT.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-950/20 to-black overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-orange-500/10">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Bitcoin size={11} className="text-orange-400" />
                </div>
                <span className="text-[11px] font-mono text-orange-400 font-bold">wnsp BRC-20</span>
              </div>
              <div className="flex gap-3 text-[10px] font-mono text-white/25">
                <span>tick: <span className="text-amber-400">wnsp</span></span>
                <span>max: <span className="text-amber-400">21,000,000,000</span></span>
                <span>limit: <span className="text-amber-400">1,000/mint</span></span>
              </div>
            </div>

            {/* Supplement rows: NXT tranche → BRC-20 equivalent */}
            <div className="divide-y divide-white/5">
              {[
                { label: "Campaign Phase 1 — SNIC",        nxt: "1.05 B", wnsp: "1.05 B", pct: "5%",  color: "#22d3ee" },
                { label: "Campaign Phase 2 — PHR-1",       nxt: "1.05 B", wnsp: "1.05 B", pct: "5%",  color: "#a78bfa" },
                { label: "Campaign Phase 3 — Mesh",        nxt: "1.05 B", wnsp: "1.05 B", pct: "5%",  color: "#34d399" },
                { label: "Campaign Phase 4 — Compiler",    nxt: "1.05 B", wnsp: "1.05 B", pct: "5%",  color: "#fb923c" },
                { label: "Developer Ecosystem (bonus)",    nxt: "3.15 B", wnsp: "3.15 B", pct: "15%", color: "#4ade80" },
                { label: "Citizens / Public Mint",         nxt: "6.85 B", wnsp: "6.85 B", pct: "32.62%",color: "#94a3b8" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white/70">{row.label}</div>
                  </div>
                  <div className="flex gap-4 items-center shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-white/40">{row.nxt} NXT</div>
                    </div>
                    <div className="text-[9px] text-white/20 font-mono">=</div>
                    <div className="text-right min-w-[80px]">
                      <div className="text-[10px] font-mono text-amber-400">{row.wnsp} wnsp</div>
                      <div className="text-[9px] font-mono text-white/25">{row.pct} supply</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer CTA */}
            <div className="px-4 py-3 border-t border-orange-500/10 flex items-center justify-between">
              <div className="text-[10px] font-mono text-white/25">Anchored to wnsp.sats · inscribed to Bitcoin permanently</div>
              <Link href="/wnsp-ordinals">
                <button className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/25 text-orange-400 hover:bg-orange-500/25 transition-all flex items-center gap-1">
                  <Zap size={9} /> Deploy & Mint
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Target Audiences */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Campaign Strategy</div>
            <h2 className="text-lg font-bold text-white">The right audience makes the campaign.</h2>
            <p className="text-white/40 text-xs mt-1">
              Indiegogo is the mechanism. Targeted outreach to these five communities is the strategy.
            </p>
          </div>
          <div className="space-y-2">
            {AUDIENCES.map((a, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <button
                  className="w-full text-left p-4 flex items-center gap-3"
                  onClick={() => setExpandedAudience(expandedAudience === i ? null : i)}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${a.color}18`, border: `1px solid ${a.color}33` }}
                  >
                    <a.icon size={14} style={{ color: a.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">{a.name}</div>
                    <div className="text-[11px] text-white/30">{a.channels}</div>
                  </div>
                  <div className="text-white/30 shrink-0">
                    {expandedAudience === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>
                {expandedAudience === i && (
                  <div className="px-4 pb-4 pt-0 text-xs text-white/50 leading-relaxed border-t border-white/5">
                    {a.why}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Campaign execution timeline */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Execution Timeline</div>
            <h2 className="text-lg font-bold text-white">How "properly executed" looks</h2>
          </div>
          <div className="space-y-3">
            {[
              { stage: "Pre-launch", color: "#6366f1", actions: ["Submit hardware spec to arXiv", "Brief 3–5 photonics researchers privately", "Get one credible validator on record before launch day"] },
              { stage: "Launch Day", color: "#22d3ee", actions: ["Campaign goes live with Phase 0 proof", "Not a video — a live link to the VM, compiler, CE pipeline", "On-chain timestamp confirms Phase 0 completion"] },
              { stage: "Week 1", color: "#34d399", actions: ["Open source hardware forums, RISC-V communities", "Meshtastic / mesh networking groups with the Phase 3 censorship story", "Developers already on the platform — convert users to infrastructure funders"] },
              { stage: "Weeks 2–4", color: "#fb923c", actions: ["Longtermist and deep tech outreach", "Framed as: 'we thought you should know this exists'", "Academic preprint visibility through arXiv submission"] },
              { stage: "Ongoing", color: "#a78bfa", actions: ["Every breakthrough proof timestamped on-chain and announced", "The campaign feeds itself with evidence", "InDemand (Indiegogo ongoing) bridges between milestone campaigns"] },
            ].map((row, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: row.color }} />
                  {i < 4 && <div className="w-px flex-1 mt-1" style={{ backgroundColor: `${row.color}30` }} />}
                </div>
                <div className="pb-4">
                  <div className="text-xs font-bold text-white mb-1.5" style={{ color: row.color }}>{row.stage}</div>
                  {row.actions.map((a, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs text-white/50 mb-1">
                      <span style={{ color: row.color }} className="shrink-0 mt-0.5">·</span>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-6 text-center space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60">The pitch writes itself</div>
          <blockquote className="text-sm text-white/70 leading-relaxed italic max-w-lg mx-auto">
            "Phase 0 is done. The language exists. The VM runs. The physics is verified. The compiler works.
            Every line of code is already written in the language of photonic hardware — because we designed it that way from day one.
            SNIC is Phase 1. We are building the chip that runs what already works."
          </blockquote>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <Link href="/indiegogo" className="text-xs px-5 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-colors flex items-center gap-1.5">
              <Rocket size={12} /> Campaign Page
            </Link>
            <Link href="/hardware-spec" className="text-xs px-5 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
              <Shield size={12} /> Hardware Spec
            </Link>
            <Link href="/evidence" className="text-xs px-5 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
              <Eye size={12} /> Evidence
            </Link>
            <Link href="/contact" className="text-xs px-5 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
              Institutional Inquiry
            </Link>
          </div>
        </div>

      </div>

      {/* Telegram video feed */}
      <div className="mt-8 px-1">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-0.5">Latest from Telegram</div>
            <div className="text-sm font-bold text-white">Video updates</div>
          </div>
          <a href="https://t.me/nexusosdaily" target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-mono">
            Follow →
          </a>
        </div>
        <TelegramVideoGallery compact maxVideos={3} showLink accentColor="#22d3ee" />
      </div>

      <p className="mt-6 text-center text-xs text-gray-700 pb-8">
        Built on{" "}
        <a
          href="https://replit.com/refer/nexusosdaily"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-400 transition-colors underline underline-offset-2"
        >
          Replit
        </a>
      </p>

      {donatingTier && (
        <DonateModal t={donatingTier as any} onClose={() => setDonatingTier(null)} />
      )}
    </div>
  );
}
