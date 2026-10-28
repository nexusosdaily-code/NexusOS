import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ExternalLink, Zap, Waves, Cpu, Radio, Star,
  Check, ArrowRight, Clock, Shield, Users, ChevronDown, ChevronUp,
  Target, Globe, Layers, Activity
} from "lucide-react";

// ── Campaign constants ────────────────────────────────────────────
const INDIEGOGO_URL = "https://www.indiegogo.com"; // Replace with live campaign URL once published
const CAMPAIGN_GOAL_USD = 100_000;
const CAMPAIGN_DAYS = 45;
const CAMPAIGN_LAUNCHED = false; // Set to true once live on Indiegogo

// Simulated raised amount — will be replaced by real Indiegogo embed widget
const SIMULATED_RAISED = 0;
const SIMULATED_BACKERS = 0;

// ── Perk tiers (USD pricing for Indiegogo) ────────────────────────
const PERKS = [
  {
    name: "Photon",
    usd: 5,
    nxt: "100 NXT",
    icon: Zap,
    color: "#a78bfa",
    label: "Digital Founder",
    availability: "Unlimited",
    est_delivery: "Immediate (digital)",
    ships_to: "Worldwide",
    perks: [
      "100 Nexus Shares issued on-chain at your personal Ψ channel",
      "Your name CE→SE encoded at your unique wavelength address",
      "Permanent Founder badge on the wavelength blockchain",
      "AGPL-3.0 contributor credit in every NexusOS release",
      "Share register entry — publicly verifiable on-chain",
    ],
    highlight: false,
  },
  {
    name: "Resonator",
    usd: 25,
    nxt: "1,000 NXT",
    icon: Waves,
    color: "#34d399",
    label: "Blockchain Backer",
    availability: "Unlimited",
    est_delivery: "Immediate (digital)",
    ships_to: "Worldwide",
    perks: [
      "1,000 Nexus Shares issued on-chain",
      "Everything in Photon tier",
      "Your name inscribed into a permanent blockchain block",
      "Block timestamped at your contribution wavelength",
      "Early access to WavelengthScript SDK (pre-release)",
    ],
    highlight: false,
  },
  {
    name: "Kernel Agent",
    usd: 100,
    nxt: "10,000 NXT",
    icon: Cpu,
    color: "#fbbf24",
    label: "Developer Access",
    availability: "100 slots",
    est_delivery: "Q3 2026 (SDK access)",
    ships_to: "Worldwide",
    perks: [
      "10,000 Nexus Shares (Class B — Developer)",
      "Everything in Resonator tier",
      "Dedicated named Ψ channel reserved in the WNSP Kernel",
      "Named agent entry in the live Agent Bus (permanent)",
      "Access to private R&D development channel",
      "Quarterly shareholder update reports",
    ],
    highlight: false,
  },
  {
    name: "Hardware Founder",
    usd: 500,
    nxt: "100,000 NXT",
    icon: Radio,
    color: "#f87171",
    label: "PHR-1 Prototype",
    availability: "25 slots",
    est_delivery: "Q1 2027 (hardware)",
    ships_to: "Worldwide",
    perks: [
      "100,000 Nexus Shares (Class A — Hardware Founder)",
      "Everything in Kernel Agent tier",
      "PHR-1 resonator hardware prototype (first production batch)",
      "144-turn bifilar coil kit for hands-on resonance experiments",
      "ZERO-G state demonstration access",
      "Seat at the hardware development advisory table",
      "Vote on hardware roadmap priorities",
      "Quarterly hardware calls with the core team",
      "Revenue share from hardware sales via Orbital Treasury",
    ],
    highlight: true,
  },
  {
    name: "Nexus Partner",
    usd: 5_000,
    nxt: "1,000,000 NXT",
    icon: Star,
    color: "#60a5fa",
    label: "Strategic Board Seat",
    availability: "5 slots",
    est_delivery: "Immediate (strategic)",
    ships_to: "Worldwide",
    perks: [
      "1,000,000 Nexus Shares (Class A+ — Strategic Partner)",
      "Everything in Hardware Founder tier",
      "Full strategic board seat — vote on all major decisions",
      "Named co-developer in AGPL-3.0 source headers globally",
      "Revenue share from Nexus Charitable Trust (10% bucket)",
      "Custom Ψ channel range reserved for your organisation",
      "Priority access to any future public listing allocation",
      "Direct line to the founding team",
    ],
    highlight: false,
  },
];

const FAQ = [
  {
    q: "What is NexusOS?",
    a: "NexusOS is the world's first wavelength operating system — a full-stack platform where every character, instruction, and transaction is encoded to a physical point in the electromagnetic spectrum using Λ=hf/c². It includes a live blockchain, 6 AI kernel agents, 51,200 orthogonal Ψ communication channels, and the PHR-1 resonance hardware prototype.",
  },
  {
    q: "What is the PHR-1?",
    a: "The PHR-1 (Photonic Harmonic Resonator — first generation) is a hardware device implementing a bifilar toroid coil with precision phase control, frequency pulsing, and impedance matching. It physically demonstrates the ZERO-G state — gravitational de-correlation through phase alignment — the first hardware proof of the Lambda Boson theory. PROTO-001 (NEX-0589-PROTO-001) was manufactured by Coiltek Pty Ltd (SA, Australia) and 100% electrically tested on 2026-07-27: 3 units, L_avg = 62.2 μH, DCR_avg ≈ 295 mΩ, all PASS.",
  },
  {
    q: "Is this AGPL-3.0 open source?",
    a: "Yes — completely. All software, protocols, and research are released under AGPL-3.0 copyleft. Any company that builds on NexusOS must publish their source code under the same terms. The infrastructure of civilisation cannot be owned.",
  },
  {
    q: "What are Nexus Shares?",
    a: "Nexus Shares are on-chain equity tokens issued directly to your blockchain address when you back the campaign. They are not speculative tokens — they represent your stake in the hardware R&D outputs and entitle Class A/B holders to revenue sharing from the Orbital Treasury.",
  },
  {
    q: "What does the funding go towards?",
    a: "The Orbital Treasury allocates all funds across 5 fixed buckets: 35% hardware maintenance & infrastructure, 25% hardware deliverables (PHR-1 production), 20% ongoing physics research, 10% kernel agent rewards, 10% Nexus Charitable Trust (open infrastructure grants).",
  },
  {
    q: "Is this fixed or flexible funding?",
    a: "This is a flexible funding campaign. All contributions are collected regardless of whether the goal is reached. The core team is committed for 100 years — partial funding still advances the hardware R&D programme.",
  },
  {
    q: "How do I receive my NXT tokens and Nexus Shares?",
    a: "After the campaign closes, provide your NexusOS wallet address. Shares are minted directly to your Ψ channel on the wavelength blockchain. Every issuance is publicly verifiable on-chain.",
  },
  {
    q: "Where is the proof that this works?",
    a: "Block #4 on the live chain contains the BREAKTHROUGH_PROOF — 25MB of video ('angry birds') encoded at Ψ(211,35,H) 534.51nm using CE→SE. 479 spectral records are already verified on-chain. The genesis commit SHA (165d7f9) is publicly verifiable on GitHub from November 2025.",
  },
];

function ProgressBar({ raised, goal }: { raised: number; goal: number }) {
  const pct = Math.min(100, (raised / goal) * 100);
  return (
    <div className="space-y-2">
      <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #a78bfa, #34d399)",
            boxShadow: pct > 0 ? "0 0 12px rgba(167,139,250,0.6)" : "none",
          }}
        />
      </div>
      <div className="flex justify-between text-xs font-mono text-slate-500">
        <span>${raised.toLocaleString()} raised</span>
        <span>${goal.toLocaleString()} goal</span>
      </div>
    </div>
  );
}

function PerkCard({ perk, idx }: { perk: typeof PERKS[0]; idx: number }) {
  const [open, setOpen] = useState(idx === 3); // Hardware Founder open by default
  const Icon = perk.icon;
  return (
    <div
      className="rounded-xl border transition-all duration-200"
      style={{
        borderColor: perk.highlight ? `${perk.color}60` : `${perk.color}25`,
        background: perk.highlight ? `${perk.color}08` : "rgba(255,255,255,0.02)",
        boxShadow: perk.highlight ? `0 0 32px ${perk.color}18` : "none",
      }}
    >
      {perk.highlight && (
        <div className="px-4 py-1.5 flex items-center gap-2 border-b rounded-t-xl text-xs font-bold tracking-wider"
          style={{ background: `${perk.color}15`, borderColor: `${perk.color}30`, color: perk.color }}>
          ⭐ MOST POPULAR — Hardware access included
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${perk.color}18`, border: `1px solid ${perk.color}40` }}>
            <Icon className="w-5 h-5" style={{ color: perk.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-100 text-lg">{perk.name}</span>
              <span className="text-xs px-2 py-0.5 rounded font-mono"
                style={{ background: `${perk.color}15`, color: perk.color }}>
                {perk.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black" style={{ color: perk.color }}>
                ${perk.usd.toLocaleString()}
              </span>
              <span className="text-slate-600 text-sm font-mono">USD · or {perk.nxt}</span>
            </div>
          </div>
          <button onClick={() => setOpen(o => !o)} className="text-slate-600 hover:text-slate-300 transition-colors mt-1 flex-shrink-0">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-xs font-mono text-slate-500">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {perk.availability}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {perk.est_delivery}</span>
          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {perk.ships_to}</span>
        </div>

        {open && (
          <ul className="mt-4 space-y-2">
            {perk.perks.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: perk.color }} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}

        <a
          href={INDIEGOGO_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all duration-200 hover:brightness-110"
          style={{ background: perk.color, color: "#000" }}
        >
          {CAMPAIGN_LAUNCHED ? "Back This Perk" : "Coming Soon on Indiegogo"}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl transition-all" style={{ borderColor: open ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.06)", background: open ? "rgba(167,139,250,0.04)" : "transparent" }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-semibold text-slate-200 text-sm">
        {q}
        {open ? <ChevronUp className="w-4 h-4 text-violet-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-600 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function IndiegogoPage() {
  const { data: eco } = useQuery<any>({ queryKey: ["/api/ecosystem/status"] });

  const blocks = eco?.blockchain?.blocks ?? 5;
  const spectral = eco?.spectralRecords ?? 479;
  const agents = eco?.agents ?? 6;

  return (
    <div style={{ background: "#09090b", minHeight: "100vh", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/nexus-command">
            <span style={{ color: "#a78bfa", fontSize: 13, cursor: "pointer" }}>← NexusOS</span>
          </Link>
          <span style={{ color: "#334155", fontSize: 12 }}>|</span>
          <span style={{ color: "#475569", fontSize: 12 }}>Indiegogo Campaign</span>
        </div>
        <a href={INDIEGOGO_URL} target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#eb1478", color: "#fff", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          <ExternalLink style={{ width: 13, height: 13 }} />
          {CAMPAIGN_LAUNCHED ? "View on Indiegogo" : "Launching on Indiegogo"}
        </a>
      </nav>

      {/* ── HERO ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 48, alignItems: "start" }}>

          {/* Left: campaign story */}
          <div>
            {/* Indiegogo badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(235,20,120,0.1)", border: "1px solid rgba(235,20,120,0.3)", borderRadius: 8, padding: "6px 14px", marginBottom: 24 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#eb1478" }} />
              <span style={{ color: "#eb1478", fontSize: 12, fontWeight: 700 }}>
                {CAMPAIGN_LAUNCHED ? "LIVE ON INDIEGOGO" : "PREPARING INDIEGOGO LAUNCH"}
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 16, letterSpacing: "-1px" }}>
              NexusOS — The World's{" "}
              <span style={{ background: "linear-gradient(135deg,#a78bfa,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                First Wavelength Computer
              </span>
            </h1>

            <p style={{ fontSize: 18, color: "#94a3b8", lineHeight: 1.7, marginBottom: 24 }}>
              Every symbol has a wavelength. Every instruction lives at a physical address in the electromagnetic spectrum.
              Fund the <strong style={{ color: "#e2e8f0" }}>PHR-1 resonator</strong> — the first hardware device that makes this real.
            </p>

            {/* Live proof bar */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 32, padding: "16px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
              {[
                { label: "Blocks on-chain", value: blocks, color: "#34d399" },
                { label: "Spectral records verified", value: spectral, color: "#60a5fa" },
                { label: "Kernel agents live", value: agents, color: "#a78bfa" },
                { label: "Commits of dev history", value: "377+", color: "#f59e0b" },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* The story */}
            <div style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.8, display: "flex", flexDirection: "column", gap: 16 }}>
              <p>
                <strong style={{ color: "#e2e8f0" }}>In November 2025</strong>, we proved that the entire alphabet can be embedded in the electromagnetic spectrum — A at 380nm, Z at 530nm — and that every character in human language maps to a physical wavelength through our WASCII v1.0 encoding standard. That proof is on-chain, timestamped, and publicly verifiable at SHA{" "}
                <span style={{ color: "#a78bfa", fontFamily: "monospace" }}>165d7f9</span>.
              </p>
              <p>
                <strong style={{ color: "#e2e8f0" }}>The hardware is real.</strong> The PHR-1 PROTO-001 (NEX-0589-PROTO-001) — a bifilar toroid coil that physically implements Λ=hf/c² — was manufactured by Coiltek Pty Ltd (SA, Australia) and 100% electrically tested on 2026-07-27. 3 units. All pass. L_avg = 62.2 μH · DCR_avg ≈ 295 mΩ. This is not simulation. The physical prototype exists.
              </p>
              <p>
                <strong style={{ color: "#e2e8f0" }}>This is 100-year infrastructure.</strong> All code, protocols, and research are AGPL-3.0. Every company that builds on NexusOS publishes their code. The infrastructure of civilisation cannot be owned.
              </p>
            </div>
          </div>

          {/* Right: funding widget */}
          <div style={{ position: "sticky", top: 24 }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden", background: "#111113" }}>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#e2e8f0", marginBottom: 4 }}>
                  ${SIMULATED_RAISED.toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
                  raised of ${CAMPAIGN_GOAL_USD.toLocaleString()} goal
                </div>

                <ProgressBar raised={SIMULATED_RAISED} goal={CAMPAIGN_GOAL_USD} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "20px 0" }}>
                  {[
                    { label: "Backers", value: SIMULATED_BACKERS },
                    { label: "Days left", value: CAMPAIGN_LAUNCHED ? CAMPAIGN_DAYS : "—" },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <a href={INDIEGOGO_URL} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 0", borderRadius: 10, background: "#eb1478", color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none", marginBottom: 10 }}>
                  {CAMPAIGN_LAUNCHED ? "Back This Project" : "Notify Me at Launch"}
                  <ExternalLink style={{ width: 14, height: 14 }} />
                </a>

                <Link href="/crowdfund">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 13, cursor: "pointer", textAlign: "center" }}>
                    Back with NXT tokens instead
                  </div>
                </Link>

                <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(34,211,153,0.06)", border: "1px solid rgba(34,211,153,0.2)", borderRadius: 8, fontSize: 12, color: "#34d399", display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <Shield style={{ width: 13, height: 13, marginTop: 1, flexShrink: 0 }} />
                  <span>Flexible funding — your contribution is used regardless of goal. AGPL-3.0 guarantees all research stays open.</span>
                </div>
              </div>

              {/* Campaign identity */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "#475569" }}>
                {[
                  { label: "Category", value: "Technology & Innovation" },
                  { label: "Location", value: "Global · AGPL-3.0" },
                  { label: "Campaign type", value: "Flexible Funding" },
                  { label: "Duration", value: `${CAMPAIGN_DAYS} days` },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{r.label}</span>
                    <span style={{ color: "#94a3b8" }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PERKS ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto 64px", padding: "0 24px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Campaign Perks</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 32 }}>
          Five tiers from digital community support to strategic hardware partnership. All perks include on-chain Nexus Shares.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {PERKS.map((perk, i) => <PerkCard key={perk.name} perk={perk} idx={i} />)}
        </div>
      </div>

      {/* ── WHY INDIEGOGO ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto 64px", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {[
            { icon: Globe, color: "#a78bfa", title: "Global reach", desc: "Indiegogo reaches millions of technology early-adopters who fund breakthrough hardware research." },
            { icon: Shield, color: "#34d399", title: "AGPL-3.0 protected", desc: "Every backer's contribution funds open infrastructure. No proprietary lock-in — ever." },
            { icon: Layers, color: "#60a5fa", title: "On-chain equity", desc: "Nexus Shares are issued directly to your blockchain address. Publicly verifiable, permanently yours." },
            { icon: Activity, color: "#f59e0b", title: "Flexible funding", desc: "Contributions are collected regardless of whether the goal is reached. The project continues either way." },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Icon style={{ width: 18, height: 18, color: item.color }} />
                </div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FUND ALLOCATION ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto 64px", padding: "0 24px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>How Funds Are Used</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>
          The Orbital Treasury allocates all contributions across 5 fixed buckets — encoded in the AGPL-3.0 source headers.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { label: "Hardware maintenance & infrastructure", pct: 35, color: "#a78bfa" },
            { label: "Hardware deliverables (PHR-1 production)", pct: 25, color: "#34d399" },
            { label: "Physics research & development", pct: 20, color: "#60a5fa" },
            { label: "Kernel agent rewards", pct: 10, color: "#fbbf24" },
            { label: "Nexus Charitable Trust (open grants)", pct: 10, color: "#f87171" },
          ].map((b, i) => (
            <div key={i} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: b.color, marginBottom: 4 }}>{b.pct}%</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{b.label}</div>
              <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: "100%", borderRadius: 2, background: b.color, width: `${b.pct * 2.85}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ maxWidth: 800, margin: "0 auto 64px", padding: "0 24px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 28 }}>FAQ</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
          Be part of 100-year infrastructure
        </h2>
        <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28, maxWidth: 560, margin: "0 auto 28px" }}>
          The CE→SE encoding standard. The wavelength blockchain. The PHR-1 resonator. All AGPL-3.0, open forever.
          Back the physics.
        </p>
        <a href={INDIEGOGO_URL} target="_blank" rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#eb1478", color: "#fff", padding: "14px 32px", borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: "none" }}>
          {CAMPAIGN_LAUNCHED ? "Back on Indiegogo" : "Notify Me at Launch"}
          <ArrowRight style={{ width: 16, height: 16 }} />
        </a>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 24, fontSize: 13 }}>
          <Link href="/crowdfund"><span style={{ color: "#475569", cursor: "pointer" }}>Back with NXT instead</span></Link>
          <Link href="/evidence"><span style={{ color: "#475569", cursor: "pointer" }}>View on-chain proof</span></Link>
          <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank" rel="noreferrer" style={{ color: "#475569" }}>GitHub source</a>
        </div>
      </div>
    </div>
  );
}
