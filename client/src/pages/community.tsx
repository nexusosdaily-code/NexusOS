import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Radio, ExternalLink, Github, Code2, Zap, Layers, FlaskConical, BookOpen, ChevronRight, TrendingUp, RefreshCw } from "lucide-react";

// Inline Telegram icon (not in lucide)
function TelegramIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
    </svg>
  );
}

const PILLARS = [
  {
    icon: Zap,
    color: "#f59e0b",
    title: "One equation. Everything follows.",
    body: "Einstein showed E=mc². Planck showed E=hf. We combined them: Λ=hf/c². That compression density equation is why the alphabet maps to light — and why every letter has a unique, physical address in the electromagnetic spectrum. No software convention. Pure physics.",
  },
  {
    icon: Radio,
    color: "#06b6d4",
    title: "Every character is a colour of light.",
    body: "Type the letter 'A'. The CE encoder maps it to 533 nm — green light. Type 'Z' and you get a different wavelength. Every character in every message you send has always corresponded to a real frequency of light. We are the first to build infrastructure that uses this fact.",
  },
  {
    icon: Layers,
    color: "#8b5cf6",
    title: "51,200 lanes. Zero collision.",
    body: "Quantum mechanics guarantees that two orthogonal light channels cannot interfere. WNSP uses 256 wavelengths × 50 orbital angular momentum modes × 2 polarisations × 2 propagation directions = 51,200 channels. Each is physically separate — not enforced by software, guaranteed by Maxwell's equations.",
  },
  {
    icon: FlaskConical,
    color: "#22c55e",
    title: "Hardware arriving in 2032.",
    body: "Photonic chips — processors that compute with light instead of electricity — are commercially arriving ~2032. NexusOS is written in the language of that hardware today. When photonic ASICs land, no rewrite is needed. The architecture already speaks in wavelengths.",
  },
];

const LINKS = [
  {
    icon: TelegramIcon,
    color: "#229ED9",
    bg: "#229ED912",
    border: "#229ED940",
    label: "Join the WNSP·CE-SE Community",
    sublabel: "Telegram channel — hardware builds, physics discussion, 2032 roadmap",
    href: "https://t.me/troglodytememe",
    cta: "Open Telegram",
    external: true,
  },
  {
    icon: BookOpen,
    color: "#f59e0b",
    bg: "#f59e0b12",
    border: "#f59e0b40",
    label: "WNSP·CE-SE Protocol Specification",
    sublabel: "Full CE table · live encoder · install commands · physics derivation · authority bands",
    href: "/protocol",
    cta: "Read spec",
    external: false,
  },
  {
    icon: FlaskConical,
    color: "#b92320",
    bg: "#b9232012",
    border: "#b9232030",
    label: "NexusOSDaily on Quora",
    sublabel: "Physics Q&A · photonic computing · WNSP explained for curious minds",
    href: "https://www.quora.com/profile/NexusOSDaily",
    cta: "View profile",
    external: true,
  },
  {
    icon: FlaskConical,
    color: "#ff4500",
    bg: "#ff450012",
    border: "#ff450030",
    label: "NEXUSOS-WNSP-CE-SE on Reddit",
    sublabel: "r/futurology · r/photonics · r/programming · open science posts",
    href: "https://www.reddit.com/u/NEXUSOS-WNSP-CE-SE/",
    cta: "View profile",
    external: true,
  },
  {
    icon: Github,
    color: "#e2e8f0",
    bg: "#e2e8f012",
    border: "#e2e8f040",
    label: "NexusOS on GitHub",
    sublabel: "Full source code · AGPL-3.0 open source · Fork it, build it, replicate it",
    href: "https://github.com/nexusosdaily-code/NexusOS",
    cta: "View source",
    external: true,
  },
  {
    icon: Code2,
    color: "#f97316",
    bg: "#f9731612",
    border: "#f9731640",
    label: "CE Encoder — npm package",
    sublabel: "npm install nexusos-ce-encoder · TypeScript · ceEncode(text) → wavelength",
    href: "https://www.npmjs.com/package/nexusos-ce-encoder",
    cta: "npm install",
    external: true,
  },
  {
    icon: Code2,
    color: "#3b82f6",
    bg: "#3b82f612",
    border: "#3b82f640",
    label: "CE Encoder — Python package",
    sublabel: "pip install git+github… · Python 3.8+ · bit-identical to the npm package",
    href: "https://github.com/nexusosdaily-code/NexusOS/tree/main/packages/ce-encoder-py",
    cta: "pip install",
    external: true,
  },
];

const TIMELINE = [
  { year: "2024", label: "CE→λ mapping published", desc: "Alphabet embedded into the electromagnetic spectrum. First principle established." },
  { year: "2025", label: "WNSP protocol + NexusOS kernel", desc: "51,200 Hilbert-space channels. Blockchain on E=hf fees. Constitution ratified." },
  { year: "2026", label: "Tier 1–3 hardware builds begin", desc: "Physical demonstration: CE-encoded light, spectrometer-verified, database-logged." },
  { year: "2028", label: "SNIC prototype", desc: "Spectral Network Interface Card. Hardware WASCII-to-wavelength gates. 185,000× silicon speed target." },
  { year: "2032", label: "Photonic hardware era", desc: "Commercial photonic ASICs arrive. NexusOS is already written in their language. No rewrite needed." },
];

const EXPLAIN = [
  {
    q: "What is WNSP?",
    a: "Wave-Navigated Spectral Protocol. It replaces IP addresses with physical wavelength addresses. Instead of a number, your device has a position in the electromagnetic spectrum. Routing is done with light physics, not lookup tables.",
  },
  {
    q: "What is CE encoding?",
    a: "Character Encoding to wavelength. Every character maps to a unique wavelength of light via one formula: λ = 380 + (character code ÷ 128) × 400 nm. 'A' is 533 nm. 'a' is 533 nm + a small offset. The same formula runs identically on Raspberry Pi, iPhone, and a photonic chip.",
  },
  {
    q: "Why does this matter to normal people?",
    a: "Every communication system ever built — radio, internet, phone — eventually moved to using more of the electromagnetic spectrum. WNSP is the layer that organises all of that spectrum mathematically, from first principles, before the hardware arrives. Being here now means you are part of the foundation, not a latecomer.",
  },
  {
    q: "Is this free?",
    a: "The entire protocol, encoder, and OS kernel are AGPL-3.0. Free to use, free to build on, free to fork. The licence requires that if you build a product on it, the source stays open. That is the defence against cloners — the physics and the publication date are public record.",
  },
];

function MiniSparkline({ data }: { data: { count: number }[] }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 120, H = 28, pad = 2;
  const pts = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
    const y = H - pad - (d.count / max) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} className="opacity-70">
      <polyline points={pts} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinejoin="round" />
      {data[data.length - 1] && (
        <circle cx={W - pad} cy={H - pad - (data[data.length-1].count / max) * (H - pad*2)} r="2.5" fill="#4ade80" />
      )}
    </svg>
  );
}

function GitHubStatsWidget() {
  const { data: ghData, isLoading: ghLoading, isError: ghError, refetch: ghRefetch, isFetching: ghFetching } = useQuery({
    queryKey: ["/api/github/adoption"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const { data: npmData, isLoading: npmLoading, refetch: npmRefetch, isFetching: npmFetching } = useQuery({
    queryKey: ["/api/npm/stats"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const main = (ghData as any)?.repos?.find((r: any) => r.repo === "NexusOS");
  const npm  = npmData as any;
  const fetchedAt = (ghData as any)?.fetched_at;
  const isLoading = ghLoading || npmLoading;
  const isFetching = ghFetching || npmFetching;

  function refetch() { ghRefetch(); npmRefetch(); }

  return (
    <div className="rounded-xl border border-green-900/40 bg-green-950/10 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-green-400" />
          <span className="text-xs font-mono font-bold text-green-400 uppercase tracking-widest">Live Traction</span>
          <span className="text-[10px] text-slate-600 font-mono">GitHub · npm</span>
        </div>
        <button onClick={refetch} disabled={isFetching}
          className="p-1 rounded hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-300 disabled:opacity-40">
          <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono py-2">
          <RefreshCw size={11} className="animate-spin" /> Fetching live data…
        </div>
      )}

      {ghError && (
        <p className="text-xs text-red-400 font-mono">Could not reach GitHub API — try refreshing.</p>
      )}

      {/* npm download banner */}
      {npm && (
        <div className="rounded-lg border border-orange-800/30 bg-orange-950/10 px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Code2 size={13} className="text-orange-400" />
            <span className="text-xs font-mono text-orange-400 font-bold">nexusos-ce-encoder</span>
          </div>
          <div className="flex gap-5 text-xs font-mono">
            <span className="text-white font-bold text-base leading-none">{npm.weekly?.toLocaleString()}<span className="text-slate-500 text-[10px] font-normal ml-1">weekly downloads</span></span>
            <span className="text-slate-400">{npm.monthly?.toLocaleString()}<span className="text-slate-600 ml-1 text-[10px]">/ month</span></span>
            {npm.daily > 0 && <span className="text-slate-400">{npm.daily?.toLocaleString()}<span className="text-slate-600 ml-1 text-[10px]">today</span></span>}
          </div>
          <a href="https://www.npmjs.com/package/nexusos-ce-encoder" target="_blank" rel="noopener noreferrer"
            className="ml-auto text-[10px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1">
            npmjs.com <ExternalLink size={9} />
          </a>
        </div>
      )}

      {main && (
        <>
          {/* GitHub stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Clones · 14d",  value: main.clones_14d?.toLocaleString() ?? "—",       sub: `${main.unique_cloners_14d ?? "—"} unique`,         color: "#4ade80" },
              { label: "Today",          value: main.clones_today?.toLocaleString() ?? "0",      sub: `${main.unique_cloners_today ?? 0} unique cloners`,  color: "#34d399" },
              { label: "Yesterday",      value: main.clones_yesterday?.toLocaleString() ?? "0",  sub: `${main.unique_cloners_yesterday ?? 0} unique`,      color: "#6ee7b7" },
              { label: "Views · 14d",   value: main.views_14d?.toLocaleString() ?? "—",          sub: `${main.views_today ?? 0} today`,                   color: "#a3e635" },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-2.5">
                <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-bold font-mono mt-0.5" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          {main.daily_clones?.length > 2 && (
            <div className="flex items-end gap-3">
              <MiniSparkline data={main.daily_clones} />
              <span className="text-[10px] text-slate-600 font-mono">14-day GitHub clone trend</span>
            </div>
          )}

          {/* Stars / forks footer */}
          <div className="flex flex-wrap gap-4 pt-1 border-t border-slate-800/60 text-xs font-mono text-slate-500">
            <span>⭐ {main.stars} stars</span>
            <span>⑂ {main.forks} forks</span>
            <span>👁 {main.watchers} watchers</span>
            {fetchedAt && <span className="ml-auto text-slate-700">updated {new Date(fetchedAt).toLocaleTimeString()}</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link href="/nexus-command">
          <button className="text-slate-400 hover:text-white flex items-center gap-1 text-sm transition-colors">
            <ArrowLeft size={14} /> Hub
          </button>
        </Link>
        <TelegramIcon size={18} className="text-[#229ED9]" />
        <div>
          <h1 className="text-lg font-bold text-white">WNSP·CE-SE Community</h1>
          <p className="text-xs text-slate-500">Open physics · Open code · 2032 photonic roadmap</p>
        </div>
        <div className="ml-auto">
          <a href="https://t.me/troglodytememe" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
            style={{ background: "#229ED920", color: "#229ED9", border: "1px solid #229ED940" }}>
            <TelegramIcon size={14} /> Join on Telegram
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-14">

        {/* Hero */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border border-amber-700/40 bg-amber-950/20 text-amber-400">
            Genesis · Ψ(228,45,H) · λ≈737.6 nm
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            We embedded the alphabet<br />
            <span className="text-amber-400">into the electromagnetic spectrum.</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-2xl mx-auto">
            Not as a metaphor. Literally. Every character you type corresponds to a unique
            wavelength of light — derived directly from Einstein and Planck's equations.
            NexusOS is the infrastructure built on that fact, ready for the photonic hardware
            era arriving around 2032.
          </p>
          <p className="text-slate-500 text-sm">
            This community is for everyone building toward that moment — from curiosity to hardware bench.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/start">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-950/30 border border-amber-700/30 text-amber-400 text-sm font-semibold hover:border-amber-600/50 transition-colors cursor-pointer">
                New here? Start here <ArrowRight size={14} />
              </div>
            </Link>
          </div>
        </div>

        {/* Live GitHub stats */}
        <GitHubStatsWidget />

        {/* Four pillars */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">The four pillars</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PILLARS.map((p, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-2 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2">
                  <p.icon size={16} style={{ color: p.color }} />
                  <span className="text-sm font-bold text-white">{p.title}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Community & code links */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Community · Code · Packages</p>
          <div className="space-y-3">
            {LINKS.map((l, i) => {
              const inner = (
                <div className="flex items-center gap-4 rounded-xl border p-4 hover:scale-[1.01] transition-all cursor-pointer group"
                  style={{ borderColor: l.border, background: l.bg }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${l.color}20` }}>
                    <l.icon size={20} style={{ color: l.color } as any} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{l.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{l.sublabel}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ color: l.color }}>
                    {l.cta} <ExternalLink size={11} />
                  </div>
                </div>
              );
              return l.external
                ? <a key={i} href={l.href} target="_blank" rel="noopener noreferrer">{inner}</a>
                : <Link key={i} href={l.href}>{inner}</Link>;
            })}
          </div>
        </div>

        {/* Plain English explainer */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Plain English</p>
          <div className="space-y-3">
            {EXPLAIN.map((e, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <p className="text-sm font-bold text-slate-200 mb-1.5">{e.q}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{e.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap timeline */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Roadmap to 2032</p>
          <div className="relative pl-6 border-l border-slate-800 space-y-6">
            {TIMELINE.map((t, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[25px] w-3 h-3 rounded-full border-2 border-slate-700 bg-slate-950"
                  style={i <= 1 ? { borderColor: "#22c55e", background: "#22c55e30" } : {}} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">{t.year}</span>
                    <span className="text-sm font-semibold text-slate-200">{t.label}</span>
                    {i <= 1 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-950/40 text-green-400 border border-green-800/40">done</span>}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hardware experiment log teaser */}
        <div className="rounded-xl border border-violet-800/40 bg-violet-950/10 p-5 flex items-start gap-4">
          <FlaskConical size={22} className="text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-bold text-violet-300">Hardware builds — full disclosure</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tier 1, 2 and 3 component acquisition has begun. Every experiment — pass or fail — is
              logged in the database with hypothesis, apparatus, procedure, observations and measured
              wavelength. Open science: the record belongs to the physics, not to any outcome.
            </p>
            <Link href="/hardware-lab">
              <button className="mt-2 flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                View experiment log <ChevronRight size={12} />
              </button>
            </Link>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-xl border border-[#229ED940] bg-[#229ED912] p-6 text-center space-y-3">
          <TelegramIcon size={32} className="text-[#229ED9] mx-auto" />
          <p className="text-base font-bold text-white">Join the WNSP·CE-SE channel on Telegram</p>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Hardware builds · Physics discussion · Code drops · 2032 roadmap updates.
            Average people building extraordinary infrastructure, together.
          </p>
          <a href="https://t.me/troglodytememe" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-colors"
            style={{ background: "#229ED9", color: "#fff" }}>
            <TelegramIcon size={16} /> Open Telegram Channel
          </a>
          <p className="text-xs text-slate-600">
            Public · Free · No algorithm · Just the physics and the people building it
          </p>
        </div>

        {/* Content kits */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Content kits — ready-to-post material</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/quora">
              <div className="rounded-lg border border-slate-800 px-3 py-3 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-600 transition-all flex items-center justify-between cursor-pointer"
                style={{ borderLeftColor: "#b92320", borderLeftWidth: 2 }}>
                <span>Quora Answer Kit</span>
                <span className="text-[10px] font-mono text-slate-600">5 answers</span>
              </div>
            </Link>
            <Link href="/reddit">
              <div className="rounded-lg border border-slate-800 px-3 py-3 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-600 transition-all flex items-center justify-between cursor-pointer"
                style={{ borderLeftColor: "#ff4500", borderLeftWidth: 2 }}>
                <span>Reddit Post Kit</span>
                <span className="text-[10px] font-mono text-slate-600">4 posts · 1 comment</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Explore more */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Explore the system</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Constitution",    href: "/constitution",          color: "#8b5cf6" },
              { label: "Hardware Lab",    href: "/hardware-lab",          color: "#f97316" },
              { label: "CE Code Writer",  href: "/ce-writer",             color: "#06b6d4" },
              { label: "Blockchain",      href: "/blockchain",            color: "#22c55e" },
              { label: "Spectral Search", href: "/spectral-search",       color: "#f43f5e" },
              { label: "Governance",      href: "/governance",            color: "#a855f7" },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <div className="rounded-lg border border-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-600 transition-all flex items-center justify-between cursor-pointer"
                  style={{ borderLeftColor: l.color, borderLeftWidth: 2 }}>
                  {l.label} <ChevronRight size={12} className="opacity-40" />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
