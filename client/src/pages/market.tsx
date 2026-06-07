/**
 * NexusOS Market — public-facing landing page
 * Promotes: NEXUS•WAVELENGTH Rune (NXWV) · WNUSD stablecoin · NXT token
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Zap, Bitcoin, Shield, TrendingUp, ArrowRight, ExternalLink,
  Lock, Layers, Radio, Cpu, Wallet, Coins, ChevronRight,
  CheckCircle2, Globe, Sparkles,
} from "lucide-react";

// ── CE colour helper (maps a character to its visible-spectrum hue) ───────────
function specColor(char: string) {
  const code = char.charCodeAt(0);
  const band = code % 128;
  const nm = 380 + band * (400 / 128) + (400 / 128) / 2;
  if (nm < 450) return "#8b5cf6";
  if (nm < 495) return "#3b82f6";
  if (nm < 570) return "#22d3ee";
  if (nm < 590) return "#4ade80";
  if (nm < 625) return "#facc15";
  if (nm < 700) return "#f97316";
  return "#ef4444";
}

// ── Animated spectral ticker ──────────────────────────────────────────────────
function SpectralTicker({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1 font-mono text-[11px]">
      {text.split("").map((c, i) => (
        <span key={i} style={{ color: specColor(c), textShadow: `0 0 8px ${specColor(c)}66` }}>
          {c === " " ? "\u00a0" : c}
        </span>
      ))}
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/8">
      <span className="text-xs font-mono font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({
  badge, title, subtitle, price, priceLabel, bullets, cta, ctaHref, ctaExternal,
  secondaryCta, secondaryHref, accentColor, bgGradient, icon: Icon,
}: {
  badge: string; title: string; subtitle: string;
  price?: string; priceLabel?: string;
  bullets: string[]; cta: string; ctaHref: string; ctaExternal?: boolean;
  secondaryCta?: string; secondaryHref?: string;
  accentColor: string; bgGradient: string; icon: React.ElementType;
}) {
  const Wrapper = ctaExternal ? "a" : Link;
  const SecWrapper = secondaryHref ? (secondaryCta ? Link : "span") : "span";

  return (
    <div className={`rounded-2xl border p-6 flex flex-col gap-5 ${bgGradient}`}
         style={{ borderColor: accentColor + "33" }}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: accentColor + "22", border: `1px solid ${accentColor}44` }}>
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest mb-0.5"
               style={{ color: accentColor + "aa" }}>{badge}</div>
          <h3 className="text-base font-bold text-white leading-tight">{title}</h3>
          <p className="text-xs text-white/40 mt-1 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      {/* Price */}
      {price && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
             style={{ background: accentColor + "11", border: `1px solid ${accentColor}22` }}>
          <span className="text-[11px] text-white/40">{priceLabel}</span>
          <span className="text-sm font-bold font-mono" style={{ color: accentColor }}>{price}</span>
        </div>
      )}

      {/* Bullets */}
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-white/50">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: accentColor }} />
            {b}
          </li>
        ))}
      </ul>

      {/* CTAs */}
      <div className="flex flex-col gap-2 mt-auto pt-1">
        {ctaExternal ? (
          <a href={ctaHref} target="_blank" rel="noopener noreferrer"
             className="w-full text-center text-sm font-semibold py-2.5 rounded-full transition-all flex items-center justify-center gap-2"
             style={{ background: accentColor + "25", border: `1px solid ${accentColor}55`, color: accentColor }}>
            {cta} <ArrowRight className="w-3.5 h-3.5" />
          </a>
        ) : (
          <Link href={ctaHref}
             className="w-full text-center text-sm font-semibold py-2.5 rounded-full transition-all flex items-center justify-center gap-2"
             style={{ background: accentColor + "25", border: `1px solid ${accentColor}55`, color: accentColor }}
             data-testid={`button-cta-${badge.toLowerCase().replace(/\W+/g, "-")}`}>
            {cta} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
        {secondaryCta && secondaryHref && (
          <Link href={secondaryHref}
             className="w-full text-center text-xs py-2 rounded-full text-white/35 hover:text-white/60 border border-white/8 hover:border-white/15 transition-all">
            {secondaryCta}
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Pipeline step ─────────────────────────────────────────────────────────────
function PipeStep({ n, label, sub, color }: { n: number; label: string; sub: string; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
           style={{ background: color + "22", border: `1px solid ${color}55`, color }}>
        {n}
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-white/40 mt-0.5 leading-relaxed">{sub}</div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MarketPage() {
  const [btcPrice, setBtcPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://mempool.space/api/v1/prices")
      .then(r => r.json())
      .then(d => setBtcPrice(d?.USD ?? null))
      .catch(() => {});
  }, []);

  const nxwvUsd = btcPrice ? ((100 / 1e8) * btcPrice).toFixed(4) : "—";
  const nxwvBtcDisplay = "100 sats";

  return (
    <div className="min-h-screen bg-[#07070e] text-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#07070e]/90 backdrop-blur px-4 py-3 flex items-center justify-between">
        <Link href="/wnsp" className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-bold text-white/70 tracking-wider">NexusOS</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/wnsp" className="hidden sm:block text-[11px] text-white/35 hover:text-white/60 transition-colors px-3 py-1">
            Protocol
          </Link>
          <Link href="/auth"
            className="text-xs font-semibold px-4 py-1.5 rounded-full bg-indigo-600/80 hover:bg-indigo-500 text-white border border-indigo-500/50 transition-all"
            data-testid="link-nav-register">
            Get Started
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-20">

        {/* ── Hero ── */}
        <section className="text-center space-y-6">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Supply Sealed · Registration Open · Built on Bitcoin
          </div>

          {/* Spectral ticker */}
          <div className="flex justify-center">
            <SpectralTicker text="NEXUS•WAVELENGTH · WNUSD · NXT" />
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Three assets.<br />
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent">
              One physics layer.
            </span>
          </h1>
          <p className="text-white/45 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            NexusOS is the first economy built on electromagnetic physics. A Bitcoin Rune with sealed supply,
            a BTC-backed stablecoin, and an infrastructure crowdfund token — all governed by wavelength, not software policy.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/auth"
              className="w-full sm:w-auto text-sm font-bold px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40"
              data-testid="button-hero-get-started">
              Create Free Account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/rune-pipeline"
              className="w-full sm:w-auto text-sm px-8 py-3 rounded-full border border-violet-500/35 text-violet-300 hover:bg-violet-500/10 transition-all flex items-center justify-center gap-2"
              data-testid="link-hero-buy-nxwv">
              <Bitcoin className="w-4 h-4" /> Buy NXWV
            </Link>
          </div>
        </section>

        {/* ── Key stats bar ── */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill label="NXWV Supply" value="21 Trillion" color="#a78bfa" />
            <StatPill label="Mints" value="1,000 / 1,000" color="#22d3ee" />
            <StatPill label="Ψ Channels" value="25,600" color="#4ade80" />
            <StatPill label="NXT Max Supply" value="21 Billion" color="#fbbf24" />
          </div>
          <p className="text-center text-[10px] font-mono text-white/20 mt-3">
            All 1,000 NEXUS•WAVELENGTH mints claimed · Supply is permanently sealed on Bitcoin mainnet
          </p>
        </section>

        {/* ── Products ── */}
        <section className="space-y-4">
          <div className="text-center space-y-1 mb-8">
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/25">What you can own</div>
            <h2 className="text-xl font-bold text-white">Three products. One ecosystem.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* NXWV */}
            <ProductCard
              badge="Bitcoin Rune · NXWV"
              icon={Bitcoin}
              title="NEXUS•WAVELENGTH"
              subtitle="A Bitcoin Rune with permanently sealed supply. Every unit exists on-chain. No more mints. Ever."
              price={`${nxwvBtcDisplay}${btcPrice ? ` ≈ $${nxwvUsd}` : ""}`}
              priceLabel="per 1 NXWV"
              bullets={[
                "21 trillion total · 1,000 mints, all claimed",
                "Delivered on Bitcoin mainnet via automated pipeline",
                "Pay with Lightning — receive on-chain Rune in one step",
                "Rune ID 952590:379 · verifiable on any block explorer",
              ]}
              cta="Buy NXWV via Pipeline"
              ctaHref="/rune-pipeline"
              secondaryCta="View on Ordinals"
              secondaryHref="https://ordinals.com/rune/NEXUS%E2%80%A2WAVELENGTH"
              accentColor="#a78bfa"
              bgGradient="bg-gradient-to-br from-violet-950/40 to-slate-950/60"
            />

            {/* WNUSD */}
            <ProductCard
              badge="Stablecoin · WNUSD"
              icon={Shield}
              title="WNUSD"
              subtitle="Stake your sats. Mint WNUSD at the BTC price. Redeem any time — no counterparty, no custodian."
              bullets={[
                "BTC-collateralised — every WNUSD backed by locked sats",
                "Stake sats → WNUSD auto-minted at BTC spot price",
                "Earn staking yield while collateral is locked",
                "Unstake anytime — WNUSD redeemed, sats returned",
              ]}
              cta="Stake Sats & Mint"
              ctaHref="/stablecoin"
              secondaryCta="Staking tiers →"
              secondaryHref="/lightning-wallet"
              accentColor="#22d3ee"
              bgGradient="bg-gradient-to-br from-cyan-950/40 to-slate-950/60"
            />

            {/* NXT */}
            <ProductCard
              badge="Infrastructure Token · NXT"
              icon={Cpu}
              title="NXT Token"
              subtitle="The hardware crowdfund. Funds the SNIC photonic node. 21 billion cap. Physics-signed contract."
              bullets={[
                "21 billion max supply — 8 decimal places",
                "Every holder gets a physics-signed spectral contract",
                "Name permanently recorded on-chain at purchase",
                "Governance rights over 11 live protocol parameters",
              ]}
              cta="Join the Campaign"
              ctaHref="/crowdfund"
              secondaryCta="What is WNSP? →"
              secondaryHref="/wnsp"
              accentColor="#fbbf24"
              bgGradient="bg-gradient-to-br from-amber-950/30 to-slate-950/60"
            />
          </div>
        </section>

        {/* ── Pipeline explainer ── */}
        <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-slate-950/40 p-7 space-y-7">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-violet-400/60 mb-1">How it works</div>
            <h2 className="text-lg font-bold text-white">NXWV in three steps. Under 60 seconds.</h2>
            <p className="text-xs text-white/35 mt-1 leading-relaxed">
              The pipeline is fully automated — you trigger it once, the system handles delivery.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <PipeStep n={1} color="#6366f1"
              label="Register & top up"
              sub="Create an account. Top up your Lightning wallet with sats. No KYC, no custodian." />
            <PipeStep n={2} color="#8b5cf6"
              label="Swap NXT → sats → order"
              sub="Use sats to place a NXWV order. Set your Bitcoin address for delivery." />
            <PipeStep n={3} color="#a78bfa"
              label="Runes arrive on-chain"
              sub="The pipeline signs & broadcasts a Runestone transaction. Your NXWV lands on Bitcoin mainnet." />
          </div>
          <Link href="/rune-pipeline"
            className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300 hover:text-violet-200 transition-colors"
            data-testid="link-pipeline-start">
            Start the pipeline <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* ── Why physics ── */}
        <section className="space-y-5">
          <div className="text-center space-y-1 mb-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/25">Why this is different</div>
            <h2 className="text-xl font-bold text-white">Not a promise. Physics.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: Lock, color: "#a78bfa",
                title: "Supply enforced by Bitcoin",
                body: "NXWV supply isn't enforced by a smart contract or a team — it's sealed by Bitcoin consensus. All 1,000 mints are confirmed on-chain. No more can ever exist.",
              },
              {
                icon: Radio, color: "#22d3ee",
                title: "25,600 orthogonal channels",
                body: "⟨Ψᵢ|Ψⱼ⟩ = 0. The Hilbert space channel model gives 256 WDM × 50 OAM × 2 polarisations. Orthogonality is enforced by quantum mechanics, not software.",
              },
              {
                icon: Wallet, color: "#22d3ee",
                title: "WNUSD: maths, not trust",
                body: "Every WNUSD is backed by locked sats in your staking position. The collateral ratio is enforced by the protocol. Redeem any time — no bank, no multisig.",
              },
              {
                icon: Globe, color: "#fbbf24",
                title: "Photonic hardware roadmap",
                body: "NXT funds the SNIC — the first node where CE lookups stop being RAM table scans and become physical wavelength selections. No rewrite needed: the OS already speaks in wavelengths.",
              },
            ].map((item) => (
              <div key={item.title}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                     style={{ background: item.color + "18", border: `1px solid ${item.color}33` }}>
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white mb-1">{item.title}</div>
                  <div className="text-xs text-white/40 leading-relaxed">{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live proofs ── */}
        <section className="space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/25 text-center mb-5">
            Everything below is live in your browser right now
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: "/ce-se-pipeline",     icon: Zap,     color: "#fbbf24", label: "CE-SE Pipeline",       desc: "Paste any text → WavelengthScript → bytecode → WNSP VM execution" },
              { href: "/wnsp-vm",            icon: Cpu,     color: "#22d3ee", label: "WNSP Virtual Machine", desc: "Step through bytecode in Ψ channel registers — the photonic instruction set" },
              { href: "/compression-explorer",icon: TrendingUp,color: "#4ade80",label: "Compression Explorer",desc: "Interactive Λ=hf/c² curve · authority bands · fee multipliers" },
              { href: "/hardware-spec",      icon: Shield,  color: "#6366f1", label: "Hardware Spec (AGPL)", desc: "SNIC · PHR-1 · Spectral Relay Mesh v1 · first public disclosure 2026-05-16" },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="group flex gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03] transition-all">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                     style={{ background: item.color + "18", border: `1px solid ${item.color}33` }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1">
                    {item.label}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[11px] text-white/35 mt-0.5 leading-snug">{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/50 to-violet-950/30 p-8 text-center space-y-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-400/60">Join the network</div>
          <h2 className="text-2xl font-bold text-white leading-snug">
            Your spectral wallet is waiting.<br />
            <span className="text-indigo-300">Registration is free and takes 30 seconds.</span>
          </h2>
          <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            Create an account to get your NXT wallet, your WNSP canonical address (wnsp://Ψ(wdm,oam,pol)/you),
            and access to the full pipeline. Nostr users sign in instantly — no separate registration needed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <Link href="/auth"
              className="w-full sm:w-auto text-sm font-bold px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30"
              data-testid="button-final-register">
              <Sparkles className="w-4 h-4" /> Create Account — Free
            </Link>
            <Link href="/rune-pipeline"
              className="w-full sm:w-auto text-sm px-8 py-3 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2">
              Buy NXWV <Bitcoin className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="text-center text-[10px] font-mono text-white/15 space-y-2 pb-6">
          <div>NexusOS · WNSP · NEXUS•WAVELENGTH · AGPL-3.0</div>
          <div>Rune ID 952596:379 · Bitcoin mainnet · Supply sealed June 2026</div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
            {[
              ["/wnsp",            "Protocol"],
              ["/wnsp-paper",      "Research Paper"],
              ["/hardware-spec",   "Hardware Spec"],
              ["/oscillating-quanta", "Theory"],
              ["/crowdfund",       "Campaign"],
              ["/auth",            "Register"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-white/40 transition-colors">{label}</Link>
            ))}
          </div>
        </footer>

      </div>
    </div>
  );
}
