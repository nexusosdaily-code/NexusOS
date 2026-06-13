/**
 * /coinsniper — NXWV Coinsniper KYC + Audit dossier
 */
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Copy, CheckCircle2, ExternalLink, Bitcoin, Lock,
  Layers, TrendingUp, Zap, ArrowLeft, ShieldCheck,
  FileText, User, Code2, GitBranch, Globe, ChevronDown, ChevronUp,
} from "lucide-react";

const RUNE_ID      = "952596:379";
const ETCH_TXID    = "03e96173f181e3323be796736cfa193b6f11bac374cc1ef7f8f8ecdf0150df3b";
const RUNE_NAME    = "NEXUS•WAVELENGTH";
const TICKER       = "NXWV";
const TOTAL_SUPPLY = "21,000,000,000,000";
const PER_MINT     = "21,000,000,000";
const MAX_MINTS    = "1,000";
const SYMBOL       = "🌈";
const DIVISIBILITY = "0";
const PREMINE      = "0 (zero premine)";
const WEBSITE      = "https://wnsp.io";
const GITHUB       = "https://github.com/nexusosdaily-code/NexusOS";
const TELEGRAM     = "https://t.me/troglodytememe";
const NOSTR        = "https://primal.net/p/NexusOS";
const WHITEPAPER   = "https://wnsp.io/wnsp-paper";
const TOKENOMICS   = "https://wnsp.io/campaign";
const AUDIT_URL    = "https://wnsp.io/coinsniper";
const ETCHED_DATE  = "2026-06-06";
const LICENSE      = "AGPL-3.0";

const DESCRIPTION =
  "NEXUS•WAVELENGTH (NXWV) is the native Rune of NexusOS — a physics-based " +
  "civilization OS built on electromagnetic wave equations. 21 trillion supply. " +
  "All 1,000 mints permanently sealed June 2026. Zero premine. No more NXWV will ever be " +
  "created. Built on the Theory of Compression States (Λ=hf/c²). " +
  "AGPL-3.0 open source. Rune ID: 952596:379 on Bitcoin mainnet.";

const FIELDS = [
  { label: "Project Name",          value: RUNE_NAME,    tip: "Full Rune name with bullet separator" },
  { label: "Ticker / Symbol",       value: TICKER,       tip: "Short symbol for the listing" },
  { label: "Chain",                 value: "Bitcoin",    tip: "Select Bitcoin — clarify Rune type in description" },
  { label: "Rune ID (Contract)",    value: RUNE_ID,      tip: "Paste as the contract / token address field" },
  { label: "Etching Transaction",   value: ETCH_TXID,    tip: "On-chain proof of etching" },
  { label: "Total Supply",          value: TOTAL_SUPPLY, tip: "21 trillion — all minted, sealed" },
  { label: "Per Mint",              value: PER_MINT,     tip: "21 billion NXWV per mint transaction" },
  { label: "Max Mints",             value: MAX_MINTS,    tip: "1,000 mints total — all 1,000 claimed" },
  { label: "Premine",               value: PREMINE,      tip: "Zero premine — fully community minted" },
  { label: "Divisibility",          value: DIVISIBILITY, tip: "Whole units only, no decimals" },
  { label: "Symbol",                value: SYMBOL,       tip: "Rainbow emoji — spectral representation" },
  { label: "Launch Date",           value: ETCHED_DATE,  tip: "Etched on Bitcoin block 952596" },
  { label: "License",               value: LICENSE,      tip: "All source code AGPL-3.0 on GitHub" },
  { label: "Website",               value: WEBSITE,      tip: "Main site — wnsp.io" },
  { label: "GitHub",                value: GITHUB,       tip: "Full open source repository" },
  { label: "Telegram",              value: TELEGRAM,     tip: "Community channel" },
  { label: "Nostr",                  value: NOSTR,        tip: "NexusOS on Nostr — Zap Goals + announcements" },
  { label: "Whitepaper",            value: WHITEPAPER,   tip: "Full WNSP technical paper — paste as whitepaper URL" },
  { label: "Tokenomics",            value: TOKENOMICS,   tip: "NXT + NXWV token distribution breakdown" },
  { label: "Audit URL",             value: AUDIT_URL,    tip: "Paste this as the audit link — on-chain verified" },
  { label: "Description (≤500 ch)", value: DESCRIPTION,  tip: "Copy directly into the description field" },
];

const AUDIT_CHECKS = [
  {
    icon: <Bitcoin size={15} />,
    title: "On-Chain Proof of Etching",
    status: "VERIFIED",
    color: "green",
    detail: `Rune NEXUS•WAVELENGTH was etched on Bitcoin mainnet at block 952596, transaction index 379. TX: ${ETCH_TXID.slice(0,16)}…${ETCH_TXID.slice(-8)}. Verifiable on ordinals.com, ordiscan.com, and mempool.space.`,
  },
  {
    icon: <Lock size={15} />,
    title: "Supply Cap — Permanently Sealed",
    status: "VERIFIED",
    color: "green",
    detail: "1,000 mints × 21,000,000,000 NXWV = 21,000,000,000,000 total. All 1,000 mints are claimed. Remaining mints: 0. Mintable: false. No further supply can ever be created by protocol enforcement.",
  },
  {
    icon: <ShieldCheck size={15} />,
    title: "Zero Premine",
    status: "VERIFIED",
    color: "green",
    detail: "Premine = 0. No tokens were reserved for team/founders. All supply was publicly mintable from block 952596. Verifiable on ordinals.com — premine field shows 0.",
  },
  {
    icon: <Code2 size={15} />,
    title: "Open Source — AGPL-3.0",
    status: "VERIFIED",
    color: "green",
    detail: `Full NexusOS source code is published on GitHub under AGPL-3.0. Repository: github.com/nexusosdaily-code/NexusOS. The Runestone encoder, WNSP protocol, and all wallet logic are public and auditable.`,
  },
  {
    icon: <GitBranch size={15} />,
    title: "Published npm Package",
    status: "VERIFIED",
    color: "green",
    detail: "CE encoder published as nexusos-ce-encoder@1.0.0 on npmjs.com (user: wnsp001). Installable: npm install nexusos-ce-encoder. Python equivalent installable via pip from GitHub.",
  },
  {
    icon: <Globe size={15} />,
    title: "Live Production Application",
    status: "LIVE",
    color: "blue",
    detail: "NexusOS is live at wnsp.io. Production deployment includes: phone auth, NXT wallet, WNSP VM, WavelengthScript compiler, spectral routing, P2P media, Lightning payments, and governance.",
  },
  {
    icon: <FileText size={15} />,
    title: "Physics Protocol Specification",
    status: "PUBLISHED",
    color: "blue",
    detail: "Formal specification (AGPL-3.0 protected) covering SNIC, PHR-1, Spectral Relay Mesh v1, WavelengthScript Compiler α. First public disclosure 2026-05-16. Available at wnsp.io/hardware-spec.",
  },
  {
    icon: <Zap size={15} />,
    title: "Runestone Encoding",
    status: "VERIFIED",
    color: "green",
    detail: "The Rune was etched using a valid OP_RETURN Runestone. Tags: divisibility=0, premine=0, symbol=🌈. Mint terms: amount=21B, cap=1000. Encoding verified against the Runes protocol specification.",
  },
];

const statusColors: Record<string, string> = {
  green: "text-green-400 bg-green-500/10 border-green-500/20",
  blue:  "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

function CopyField({ label, value, tip }: { label: string; value: string; tip: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: `${label} copied` });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/8 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-purple-300 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-sm text-white font-mono break-all leading-relaxed">{value}</p>
          <p className="text-xs text-white/40 mt-1">{tip}</p>
        </div>
        <button onClick={copy} data-testid={`copy-${label.toLowerCase().replace(/\s+/g, "-")}`}
          className="shrink-0 p-2 rounded-lg hover:bg-purple-500/20 transition-colors">
          {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
        </button>
      </div>
    </div>
  );
}

function AuditCheck({ icon, title, status, color, detail }: typeof AUDIT_CHECKS[0]) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border p-4 ${statusColors[color]} bg-black/20 border-white/10`}>
      <button className="w-full flex items-center gap-3 text-left" onClick={() => setOpen(!open)}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${statusColors[color]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">{title}</div>
        </div>
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[color]} shrink-0`}>
          {status}
        </div>
        {open ? <ChevronUp size={14} className="text-white/30 shrink-0" /> : <ChevronDown size={14} className="text-white/30 shrink-0" />}
      </button>
      {open && (
        <p className="text-xs text-white/50 leading-relaxed mt-3 pl-11">{detail}</p>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/30 p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-purple-400 shrink-0">{icon}</div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">{label}</div>
        <div className="text-sm font-semibold text-white leading-snug mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function CoinsnierPage() {
  const [tab, setTab] = useState<"audit" | "fields" | "kyc" | "listings">("audit");

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-2">
        <Link href="/market" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
          <ArrowLeft size={12} /> Back to Market
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-20 space-y-6">

        {/* hero */}
        <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-900/20 to-black p-7 text-center space-y-4">
          <div className="text-4xl">🌈</div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-purple-400/60 mb-1">
              Coinsniper KYC + Audit Dossier
            </div>
            <h1 className="text-2xl font-bold text-white">NEXUS•WAVELENGTH</h1>
            <p className="text-sm text-white/40 mt-1">
              Rune ID {RUNE_ID} · Bitcoin Mainnet · 21 Trillion · Sealed Forever · Zero Premine
            </p>
          </div>
          <a href="https://coinsniper.net/coin/91963" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold transition-colors">
            <ExternalLink size={13} /> View on Coinsniper
          </a>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<Bitcoin size={16} />}     label="Chain"         value="Bitcoin (Runes)" />
          <Stat icon={<Lock size={16} />}         label="Premine"       value="0 — Zero" />
          <Stat icon={<Layers size={16} />}       label="Total Supply"  value="21 Trillion NXWV" />
          <Stat icon={<TrendingUp size={16} />}   label="Mints"         value="1,000 / 1,000 ✓" />
        </div>

        {/* submission checklist */}
        <div className="rounded-xl border border-white/8 bg-black/30 p-5 space-y-2">
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Submission Checklist</h2>
          {[
            { done: true,  label: "Rune etched on Bitcoin mainnet",          note: "Block 952596 · ID 952596:379" },
            { done: true,  label: "Website live",                            note: "wnsp.io" },
            { done: true,  label: "Telegram channel active",                 note: "t.me/troglodytememe" },
            { done: true,  label: "Nostr presence",                          note: "Zap Goals live" },
            { done: true,  label: "GitHub open source (AGPL-3.0)",          note: "github.com/nexusosdaily-code/NexusOS" },
            { done: true,  label: "Whitepaper published",                    note: "wnsp.io/wnsp-paper" },
            { done: true,  label: "Tokenomics page live",                   note: "wnsp.io/campaign" },
            { done: true,  label: "Audit page ready",                        note: "wnsp.io/coinsniper" },
            { done: true,  label: "All submission fields prepared",          note: "See Submission Fields tab" },
            { done: true,  label: "Logo — 1024×1024 PNG ready",              note: "nexusos-icon.png — Ψ symbol, exceeds 512×512 minimum" },
            { done: false, label: "KYC — Duncan not responding, paid KYC option available", note: "Go to coinsniper.net dashboard → KYC Verification, or email support@coinsniper.net" },
          ].map(({ done, label, note }) => (
            <div key={label} className="flex items-start gap-3 py-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                done ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
              }`}>
                {done ? "✓" : "!"}
              </div>
              <div>
                <div className={`text-xs font-semibold ${done ? "text-white" : "text-yellow-300"}`}>{label}</div>
                <div className="text-[11px] text-white/35 mt-0.5">{note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
          {([["audit","Audit"],["kyc","KYC"],["fields","Fields"],["listings","Listings"]] as const).map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              data-testid={`tab-${k}`}
              className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === k ? "bg-purple-500 text-white" : "text-white/40 hover:text-white"
              }`}>{l}</button>
          ))}
        </div>

        {/* AUDIT TAB */}
        {tab === "audit" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-green-400" />
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
                Project Audit — On-Chain Verified
              </h2>
            </div>

            {AUDIT_CHECKS.map((c) => <AuditCheck key={c.title} {...c} />)}

            {/* on-chain links */}
            <div className="rounded-xl border border-white/8 bg-black/30 p-5 space-y-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Verify On-Chain</h3>
              {[
                { label: "Ordinals.com", href: "https://ordinals.com/rune/NEXUS%E2%80%A2WAVELENGTH" },
                { label: "Ordiscan",     href: "https://ordiscan.com/rune/NEXUS%E2%80%A2WAVELENGTH" },
                { label: "Mempool.space TX", href: `https://mempool.space/tx/${ETCH_TXID}` },
                { label: "GitHub Source",   href: GITHUB },
              ].map(({ label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between group p-3 rounded-lg border border-white/6 hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors">
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">{label}</span>
                  <ExternalLink size={12} className="text-white/30 group-hover:text-purple-400 transition-colors" />
                </a>
              ))}
            </div>

            {/* hardware spec */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-900/8 p-4">
              <div className="text-xs font-semibold text-blue-300 mb-1">Hardware Specification — Public Disclosure</div>
              <p className="text-[11px] text-white/40 leading-relaxed mb-3">
                AGPL-3.0 protected formal spec covering SNIC, PHR-1, Spectral Relay Mesh v1, and WavelengthScript Compiler α.
                First public disclosure 2026-05-16.
              </p>
              <Link href="/hardware-spec"
                className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 transition-colors">
                <ExternalLink size={11} /> View Hardware Spec →
              </Link>
            </div>
          </div>
        )}

        {/* KYC TAB */}
        {tab === "kyc" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-900/8 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <User size={15} className="text-yellow-400" />
                <h2 className="text-sm font-semibold text-white">KYC — Founder Identity Verification</h2>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Coinsniper requires the project founder to personally submit a government-issued ID.
                This process happens directly on their platform — no code required.
              </p>
              <div className="space-y-2">
                {[
                  "1. Open the Coinsniper KYC link from the email",
                  "2. Sign in or create a Coinsniper account",
                  "3. Select NEXUS•WAVELENGTH (NXWV) as your project",
                  "4. Upload a clear photo of your government-issued ID",
                  "5. Submit — review takes 24–48 hours",
                  "6. OR DM @duncancoinsniper on Telegram to expedite",
                ].map((step) => (
                  <div key={step} className="flex items-start gap-2 text-xs text-white/60">
                    <span className="text-yellow-400 shrink-0">›</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <a href="https://t.me/duncancoinsniper" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-semibold hover:bg-yellow-500/30 transition-colors">
                <ExternalLink size={11} /> DM @duncancoinsniper on Telegram
              </a>
            </div>

            <div className="rounded-xl border border-green-500/20 bg-green-900/8 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-green-400" />
                <h2 className="text-sm font-semibold text-white">Audit — Link This Page</h2>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                When Coinsniper asks for an audit link, use this page URL. It contains on-chain
                verifiable proof, open source code links, supply verification, and protocol specs.
              </p>
              <CopyField
                label="Audit Page URL"
                value="https://wnsp.io/coinsniper"
                tip="Paste this as the audit link in your Coinsniper submission"
              />
              <CopyField
                label="Hardware Spec URL"
                value="https://wnsp.io/hardware-spec"
                tip="Formal protocol specification — AGPL-3.0 protected, first disclosed 2026-05-16"
              />
            </div>
          </div>
        )}

        {/* FIELDS TAB */}
        {tab === "fields" && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest font-mono">
              All Fields — Copy-Ready
            </h2>
            {FIELDS.map((f) => (
              <CopyField key={f.label} label={f.label} value={f.value} tip={f.tip} />
            ))}

            {/* logo download */}
            <div className="rounded-xl border border-white/8 bg-black/30 p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-900/40 border border-purple-500/20 flex items-center justify-center text-3xl shrink-0">
                🌈
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-white">Project Logo / Symbol</div>
                <div className="text-[11px] text-white/40 mt-0.5">Use 🌈 as the symbol or download the NexusOS logo PNG</div>
              </div>
              <a href="/nexus-wavelength-logo.png" download="nexus-wavelength-logo.png"
                className="text-xs font-semibold px-4 py-2 rounded-full bg-white/8 border border-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-colors">
                Download
              </a>
            </div>
          </div>
        )}

        {/* LISTINGS TAB */}
        {tab === "listings" && (
          <div className="space-y-4">

            {/* CoinGecko */}
            <div className="rounded-xl border border-green-500/20 bg-green-950/8 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🦎</span>
                  <h2 className="text-sm font-bold text-white">CoinGecko</h2>
                </div>
                <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-2 py-0.5">Free · account needed</span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">CoinGecko lists Bitcoin Runes. Free account — just email signup. Review takes 1–4 weeks.</p>

              <div className="space-y-2">
                {[
                  { n: "1", title: "Create free account", url: "https://www.coingecko.com/en/account/sign_up", cta: "Sign up →",       note: "Email + password only. No phone, no KYC." },
                  { n: "2", title: "Submit via Request Form", url: "https://www.coingecko.com/request/coin",  cta: "Request form →", note: "Select Bitcoin chain · choose Rune type · paste fields below." },
                ].map(s => (
                  <div key={s.n} className="flex gap-3 p-3 rounded-lg bg-black/40 border border-white/5">
                    <div className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 flex items-center justify-center text-[10px] font-bold shrink-0">{s.n}</div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-white/80">{s.title}</div>
                      <div className="text-[10px] text-white/35 mt-0.5">{s.note}</div>
                    </div>
                    <a href={s.url} target="_blank" rel="noreferrer"
                      className="self-center text-[10px] font-semibold text-green-400 hover:underline shrink-0 flex items-center gap-1">
                      <ExternalLink size={9} />{s.cta}
                    </a>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Step 3 — paste these into the form</div>
                {[
                  { label: "Token Name",    value: "NEXUS•WAVELENGTH" },
                  { label: "Symbol",        value: "NXWV" },
                  { label: "Contract / ID", value: "952596:379" },
                  { label: "Chain",         value: "Bitcoin (Rune)" },
                  { label: "Website",       value: "https://wnsp.io" },
                  { label: "Whitepaper",    value: "https://wnsp.io/wnsp-paper" },
                  { label: "GitHub",        value: "https://github.com/nexusosdaily-code/NexusOS" },
                  { label: "Telegram",      value: "https://t.me/troglodytememe" },
                  { label: "Description",   value: "NEXUS•WAVELENGTH (NXWV) is the native Rune of NexusOS — a physics-based civilization OS replacing cryptographic hashing with electromagnetic wave equations. 21 trillion supply. All 1,000 mints permanently sealed June 2026. Zero premine. Rune ID: 952596:379. AGPL-3.0 open source." },
                ].map(f => <CopyField key={f.label} label={f.label} value={f.value} tip="" />)}
              </div>
            </div>

            {/* Rune-native trackers */}
            <div className="rounded-xl border border-orange-500/20 bg-orange-950/8 p-5 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Bitcoin size={14} className="text-orange-400" />
                  <h2 className="text-sm font-bold text-white">Rune-Native Trackers</h2>
                </div>
                <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full px-2 py-0.5">No account needed</span>
              </div>
              <p className="text-[11px] text-white/40">These auto-index your Rune from the Bitcoin blockchain — just check they're showing correct info:</p>
              {[
                { name: "RuneAlpha",     icon: "🔺", url: "https://runealpha.xyz",                                                         desc: "Rune explorer + holder stats. Search NEXUS•WAVELENGTH to verify.",          status: "Auto" },
                { name: "GeniiData",     icon: "📊", url: "https://www.genii.data/runes",                                                  desc: "Rune analytics + mint tracking. Holder distribution and volume.",           status: "Auto" },
                { name: "OKX Runes",     icon: "⭕", url: "https://web3.okx.com/explorer/btc/runes/NEXUS%E2%80%A2WAVELENGTH",             desc: "Large audience. Auto-lists all etched Runes from Bitcoin.",                 status: "Auto" },
                { name: "Ordiscan",      icon: "🔍", url: "https://ordiscan.com/rune/NEXUS%E2%80%A2WAVELENGTH",                           desc: "Full Rune detail — etching TX, mint progress, holders.",                    status: "Auto" },
                { name: "UniSat Market", icon: "🟠", url: "https://unisat.io/market/runes?tick=NEXUS%E2%80%A2WAVELENGTH",                 desc: "Primary trading marketplace — list NXWV here to set the floor price.",      status: "List" },
                { name: "Magic Eden",    icon: "🪄", url: "https://magiceden.io/runes/NEXUS%E2%80%A2WAVELENGTH",                         desc: "Secondary marketplace. Connect UniSat wallet to list.",                     status: "List" },
              ].map(t => (
                <a key={t.name} href={t.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/5 hover:border-orange-500/25 transition-all group">
                  <span className="text-base shrink-0">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-bold text-white/80">{t.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        t.status === "List"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-green-500/10 text-green-400 border border-green-500/20"
                      }`}>{t.status}</span>
                    </div>
                    <div className="text-[10px] text-white/35 leading-relaxed">{t.desc}</div>
                  </div>
                  <ExternalLink size={11} className="text-white/20 group-hover:text-orange-400 shrink-0 transition-colors" />
                </a>
              ))}
            </div>

            {/* DEXTools note */}
            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Note on DEXTools</div>
              <p className="text-[11px] text-white/35 leading-relaxed">
                DEXTools is built for EVM chains (Ethereum, BSC) and tracks DEX trading pairs — it doesn't support Bitcoin Runes.
                The trackers above (RuneAlpha, OKX, Ordiscan) are the Rune-native equivalent.
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
