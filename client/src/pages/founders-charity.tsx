import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Heart, Shield, Globe, Zap, Scale, Lock,
  Users, TrendingUp, FileText, ExternalLink, CheckCircle2
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_SUPPLY_NXT   = 21_000_000_000;   // 21 billion NXT
const DECIMALS           = 1e8;              // 8 decimal places
const CHARITY_PCT        = 0.10;             // §6 — 10% of Orbital Treasury
const TRUST_NAME         = "Chairman Founder Nexus Charitable Trust";
const CONSTITUTION_VER   = "v1.0";

// Token distribution — shareholder structure
const TOKEN_DISTRIBUTION = [
  { label: "Public Circulation",        pct: 40, color: "#22d3ee",  desc: "Open market — spectral wallets, peer-to-peer transactions" },
  { label: "Founders Reserve",          pct: 20, color: "#a78bfa",  desc: "Vested over 10 years — locked under C-0001 Non-Dominance (≤33% ceiling)" },
  { label: "Orbital Treasury",          pct: 20, color: "#fbbf24",  desc: "System maintenance, deliverables, research, agent rewards, charitable trust" },
  { label: "Ecosystem Fund",            pct: 10, color: "#4ade80",  desc: "Developer grants, SDK adoption, SNIC/PHR-1 hardware partnerships" },
  { label: "Chairman Founder Nexus\nCharitable Trust", pct: 10, color: "#f43f5e", desc: "Permanently allocated — non-extractable by any single authority" },
];

// Humanitarian pillars
const PILLARS = [
  { icon: "🏥", title: "Major Healthcare Projects",      desc: "The charity provides funds to establish major healthcare projects — hospitals, clinics, remote medical infrastructure, and population-scale health programmes funded through the orbital treasury." },
  { icon: "🌍", title: "Environmental Projects",          desc: "The charity provides funds to establish major environmental projects — clean water systems, atmospheric monitoring, land restoration, and climate resilience programmes funded through the orbital treasury." },
  { icon: "🤝", title: "Humanitarian Projects",           desc: "The charity provides funds to establish major humanitarian projects — emergency relief, shelter, food security, and community development programmes funded through the orbital treasury." },
  { icon: "📡", title: "Connectivity Infrastructure",    desc: "The charity provides funds to establish major connectivity projects — Spectral Relay Mesh, LoRaWAN networks, and open internet access for communities currently without coverage." },
  { icon: "⚡", title: "Energy & Resource Access",       desc: "The charity provides funds to establish major energy access projects — photonic infrastructure and off-grid power for energy-scarce regions, advancing toward Kardashev Type I outcomes." },
  { icon: "🎓", title: "Education & Open Knowledge",     desc: "The charity provides funds to establish major education projects — open curricula, local-language programmes, and free access to the NexusOS spectral physics stack under AGPL-3.0." },
];

// Constitutional safeguards
const SAFEGUARDS = [
  { article: "C-0001", title: "Non-Dominance",    color: "#fbbf24", text: "No entity — including the founders — may hold more than 33% of total circulating NXT. This applies to the charitable trust itself. Concentration is constitutionally impossible." },
  { article: "C-0002", title: "Immutable Rights", color: "#a78bfa", text: "No transaction may reduce any citizen's balance below the Basic Human Living Standard of 1,150 NXT/month provided in services by NexusOS through the orbital treasury. Charitable disbursements cannot override citizen rights." },
  { article: "§6–§7",  title: "Trust Lock",       color: "#f43f5e", text: "10% of all Orbital Treasury deposits are permanently and irrevocably allocated to the trust. Disbursements require Sigma Constitution Engine consensus — no single authority can extract funds." },
];

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono border"
      style={{ color, borderColor: color + "40", background: color + "12" }}>
      {text}
    </span>
  );
}

function StatCard({ value, label, color, sub }: { value: string; label: string; color: string; sub?: string }) {
  return (
    <div className="border border-white/10 rounded-xl p-4 text-center" style={{ background: color + "08" }}>
      <div className="font-bold text-xl font-mono" style={{ color }}>{value}</div>
      <div className="text-white/40 text-[10px] uppercase tracking-widest mt-1">{label}</div>
      {sub && <div className="text-white/20 text-[9px] mt-1 font-mono">{sub}</div>}
    </div>
  );
}

export default function FoundersCharityPage() {
  const { data: treasuryData } = useQuery<{
    treasury: { total_ordinal_units: string };
  }>({
    queryKey: ["/api/orbital-treasury"],
    refetchInterval: 30_000,
  });

  const totalTreasuryUnits = parseInt(treasuryData?.treasury.total_ordinal_units ?? "0");
  const charityUnits       = Math.round(totalTreasuryUnits * CHARITY_PCT);
  const charityNxt         = (charityUnits / DECIMALS).toFixed(8);
  const totalSupplyFmt     = "21,000,000,000";

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "monospace" }}>

      {/* Spectral stripe */}
      <div className="h-0.5 w-full"
        style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#16a34a,#cccc00,#ff8c00,#cc0000)" }} />

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/orbital-treasury">
            <button className="text-white/30 hover:text-white/60 transition-colors">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-rose-400" />
              <span className="text-sm font-bold tracking-wider text-rose-400">{TRUST_NAME.toUpperCase()}</span>
            </div>
            <div className="text-white/30 text-[10px] mt-0.5">
              §6 · §7 Sigma Constitution · AGPL-3.0 · 100-year humanitarian mandate
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* ── Mission statement ── */}
        <div className="border border-rose-500/30 rounded-2xl p-6 space-y-3"
          style={{ background: "rgba(244,63,94,0.04)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={16} className="text-rose-400" />
            <span className="text-rose-400 text-xs font-bold uppercase tracking-widest">Humanitarian Mission</span>
          </div>
          <h1 className="text-xl font-bold text-white leading-snug">
            Building a Kardashev Type I Civilisation —<br />
            <span className="text-rose-400">One Wavelength at a Time</span>
          </h1>
          <p className="text-white/50 text-xs leading-relaxed">
            The Chairman Founder Nexus Charitable Trust exists as an irrevocable constitutional obligation
            within NexusOS. Ten percent of every NXT ordinal reclaimed into the Orbital Treasury flows
            directly here — automatically, on-chain, with no human intermediary required. The trust is
            governed by the Sigma Constitution Engine, not by any individual. Its mandate is to provide
            funds to establish major healthcare, environmental, and humanitarian projects worldwide —
            disbursed through the orbital treasury to move humanity toward harnessing the full energy
            output of the planet, what physicist Nikolai Kardashev classified as a Type I civilisation.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Pill text="AGPL-3.0" color="#a78bfa" />
            <Pill text="§6 · §7 Constitution" color="#f43f5e" />
            <Pill text="Non-extractable" color="#fbbf24" />
            <Pill text="100-year fund" color="#22d3ee" />
            <Pill text={`First disclosure: 2026-05-16`} color="#4ade80" />
          </div>
        </div>

        {/* ── Live stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard value={charityNxt} label="Trust Balance" color="#f43f5e" sub="NXT (live)" />
          <StatCard value="10%" label="Treasury Allocation" color="#fbbf24" sub="§6 Sigma Constitution" />
          <StatCard value={totalSupplyFmt} label="Total NXT Supply" color="#a78bfa" sub="21 billion · 8 decimals" />
          <StatCard value="33%" label="Non-Dominance Ceiling" color="#22d3ee" sub="C-0001 · any entity" />
        </div>

        {/* ── Token supply & shareholders ── */}
        <div className="border border-white/10 rounded-xl p-5 space-y-4"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-2">
            <Users size={13} className="text-white/40" />
            <span className="text-white/40 text-[10px] uppercase tracking-widest">
              21 Billion NXT — Shareholder Structure
            </span>
          </div>

          <div className="space-y-3">
            {TOKEN_DISTRIBUTION.map(({ label, pct, color, desc }) => {
              const amountNxt = ((TOTAL_SUPPLY_NXT * pct) / 100).toLocaleString();
              return (
                <div key={label}>
                  <div className="flex items-start justify-between text-xs mb-1.5 gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold" style={{ color }}>{label.replace("\n", " ")}</span>
                      <span className="text-white/30 ml-2 text-[10px]">{desc}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-white/50">{pct}%</span>
                      <div className="text-[9px] text-white/20 font-mono">{amountNxt} NXT</div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/5 pt-3 text-[10px] text-white/20 leading-relaxed">
            The Non-Dominance article (C-0001) caps any single entity — including the founders — at 33% of
            circulating supply. The 20% founders reserve is vested over 10 years and falls well within this
            ceiling. The charitable trust's 10% is constitutionally ring-fenced and cannot be redirected
            by governance vote or any other mechanism.
          </div>
        </div>

        {/* ── Fund flow ── */}
        <div className="border border-amber-400/20 rounded-xl p-5 space-y-4"
          style={{ background: "rgba(251,191,36,0.02)" }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-amber-400" />
            <span className="text-amber-400/70 text-[10px] uppercase tracking-widest">Fund Flow — How the Trust Receives Money</span>
          </div>
          <div className="space-y-3">
            {[
              { n: "1", col: "#22c55e",  label: "Spectral file deleted",        detail: "User deletes a file stored at Ψ(wdm,oam,pol). Its wavelength ordinal (freq_hz ÷ 10⁶ NXT units) is reclaimed." },
              { n: "2", col: "#3b82f6",  label: "Ordinal deposited to Treasury", detail: "The reclaimed ordinal flows automatically into the Orbital Treasury — on-chain, immutable, verifiable." },
              { n: "3", col: "#f43f5e",  label: "10% splits to Trust",           detail: "The Sigma Constitution Engine's §6 allocation fires: 10% of the deposit is credited to the Chairman Founder Nexus Charitable Trust." },
              { n: "4", col: "#a78bfa",  label: "Consensus disbursement",        detail: "When a disbursement is requested, Sigma Constitution Engine consensus is required. No single authority can unlock funds." },
              { n: "5", col: "#fbbf24",  label: "Proof recorded on-chain",       detail: "Every disbursement is written as an immutable transaction on the wavelength blockchain — permanently public." },
            ].map(({ n, col, label, detail }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                  style={{ background: col + "20", color: col, border: `1px solid ${col}40` }}>
                  {n}
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: col }}>{label}</div>
                  <div className="text-white/40 text-[10px] mt-0.5 leading-relaxed">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Humanitarian pillars ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Heart size={13} className="text-rose-400" />
            <span className="text-rose-400/70 text-[10px] uppercase tracking-widest">Six Humanitarian Pillars — Kardashev Type I Outcomes</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PILLARS.map(({ icon, title, desc }) => (
              <div key={title}
                className="border border-white/10 rounded-xl p-4 space-y-1.5 hover:border-rose-500/30 transition-colors"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="text-lg leading-none">{icon}</div>
                <div className="text-xs font-bold text-white/80">{title}</div>
                <div className="text-white/40 text-[10px] leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Constitutional safeguards ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-cyan-400" />
            <span className="text-white/40 text-[10px] uppercase tracking-widest">Constitutional Safeguards — Why It Cannot Be Corrupted</span>
          </div>
          <div className="space-y-3">
            {SAFEGUARDS.map(({ article, title, color, text }) => (
              <div key={article} className="border rounded-xl p-4 flex items-start gap-4"
                style={{ borderColor: color + "30", background: color + "06" }}>
                <div className="flex-shrink-0 text-center">
                  <div className="text-[9px] font-mono px-2 py-0.5 rounded border"
                    style={{ color, borderColor: color + "40", background: color + "15" }}>
                    {article}
                  </div>
                  <div className="text-[9px] text-white/30 mt-1">{title}</div>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Transparency pledge ── */}
        <div className="border border-white/10 rounded-xl p-5 text-center space-y-3"
          style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="flex justify-center">
            <CheckCircle2 size={20} className="text-green-400" />
          </div>
          <div className="text-white/60 text-xs leading-relaxed max-w-lg mx-auto">
            "We prove our work to the people willingly."
            <br /><br />
            Every ordinal is public. Every treasury deposit is on-chain. Every charitable
            disbursement is recorded as an immutable spectral transaction. The trust has no
            private ledger — it is the wavelength blockchain.
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Pill text="AGPL-3.0 · open source" color="#4ade80" />
            <Pill text="On-chain transparency" color="#22d3ee" />
            <Pill text="No private ledger" color="#a78bfa" />
          </div>
        </div>

        {/* ── Links ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
          {[
            { label: "Orbital Treasury",  href: "/orbital-treasury",  icon: Zap },
            { label: "Constitution",      href: "/constitution",       icon: Scale },
            { label: "Governance",        href: "/governance",         icon: FileText },
            { label: "Spectral Audit",    href: "/spectral-audit",     icon: Lock },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 border border-white/10 rounded-lg px-3 py-2 text-white/40 hover:text-white/70 hover:border-white/20 transition-all">
              <Icon size={11} />
              <span>{label}</span>
              <ExternalLink size={9} className="ml-auto opacity-40" />
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] text-white/15 leading-relaxed border-t border-white/5 pt-6 space-y-1">
          <div>{TRUST_NAME} · NexusOS Constitutional Economy · {CONSTITUTION_VER}</div>
          <div>AGPL-3.0 · First public disclosure 2026-05-16 · github.com/nexusosdaily-code/NexusOS</div>
        </div>

      </div>
    </div>
  );
}
