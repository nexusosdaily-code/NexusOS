/**
 * /coinsniper — NXWV Coinsniper submission dossier
 * All submission fields are copy-ready. Logo downloadable below.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Copy, CheckCircle2, ExternalLink, Bitcoin, Lock,
  Layers, TrendingUp, Zap, ArrowLeft,
} from "lucide-react";

const RUNE_ID      = "952590:379";
const RUNE_NAME    = "NEXUS•WAVELENGTH";
const TICKER       = "NXWV";
const TOTAL_SUPPLY = "21,000,000,000,000";
const PER_MINT     = "21,000,000,000";
const MAX_MINTS    = "1,000";
const MINTS_DONE   = "1,000 / 1,000 — permanently sealed June 2026";
const WEBSITE      = "https://wnsp.io";
const BUY_URL      = "https://wnsp.io/rune-pipeline";
const TELEGRAM     = "https://t.me/NexusOSWNSP";

const DESCRIPTION =
  "NEXUS•WAVELENGTH (NXWV) is the native Rune of NexusOS — a physics-based " +
  "civilization OS built on electromagnetic wave equations. 21 trillion supply. " +
  "All 1,000 mints permanently sealed June 2026. No more NXWV will ever be " +
  "created. Acquire via the NexusOS pipeline at wnsp.io. " +
  "Rune ID: 952590:379 on Bitcoin mainnet.";

const FIELDS = [
  { label: "Project Name",          value: RUNE_NAME,    tip: "Full Rune name with bullet separator" },
  { label: "Ticker / Symbol",       value: TICKER,       tip: "Use NXWV as the short symbol" },
  { label: "Chain",                 value: "Bitcoin",    tip: "Select Bitcoin — clarify Rune type in description" },
  { label: "Rune ID (Contract)",    value: RUNE_ID,      tip: "Paste as the contract / token address field" },
  { label: "Total Supply",          value: TOTAL_SUPPLY, tip: "21 trillion — all minted, sealed" },
  { label: "Per Mint",              value: PER_MINT,     tip: "21 billion NXWV per mint transaction" },
  { label: "Max Mints",             value: MAX_MINTS,    tip: "1,000 mints total — all 1,000 claimed" },
  { label: "Mints Status",          value: MINTS_DONE,   tip: "Supply permanently locked" },
  { label: "Launch Date",           value: "June 2026",  tip: "All mints sealed June 2026" },
  { label: "Website",               value: WEBSITE,      tip: "Main site" },
  { label: "Buy / Acquire URL",     value: BUY_URL,      tip: "Direct pipeline link — use as the Buy button URL" },
  { label: "Telegram",              value: TELEGRAM,     tip: "Community channel" },
  { label: "Description (≤500 ch)", value: DESCRIPTION,  tip: "Copy directly into the description field" },
];

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
        <button
          onClick={copy}
          data-testid={`copy-${label.toLowerCase().replace(/\s+/g, "-")}`}
          className="shrink-0 p-2 rounded-lg hover:bg-purple-500/20 transition-colors"
        >
          {copied
            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
            : <Copy className="w-4 h-4 text-white/50" />}
        </button>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/30 p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-purple-400 shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">{label}</div>
        <div className="text-sm font-semibold text-white leading-snug mt-0.5">{value}</div>
      </div>
    </div>
  );
}

const STEPS = [
  { n: 1, title: "View live listing on Coinsniper", desc: "coinsniper.net/coin/91963" },
  { n: 2, title: "Select Bitcoin › Rune",       desc: "Chain = Bitcoin, type = Rune" },
  { n: 3, title: "Paste the fields below",       desc: "Every field on this page is copy-ready" },
  { n: 4, title: "Upload the logo",              desc: "Download PNG from this page and attach" },
  { n: 5, title: "Submit for review",            desc: "Goes live for community voting once approved" },
];

export default function CoinsnierPage() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-2">
        <Link
          href="/market"
          className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft size={12} /> Back to Market
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-20 space-y-6">

        {/* hero */}
        <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-900/20 to-black p-7 text-center space-y-4">
          <img
            src="/nexus-wavelength-logo.png"
            alt="NEXUS•WAVELENGTH"
            className="w-16 h-16 rounded-2xl mx-auto object-cover border border-white/10"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-purple-400/60 mb-1">
              Coinsniper Listing Dossier
            </div>
            <h1 className="text-2xl font-bold text-white">NEXUS•WAVELENGTH</h1>
            <p className="text-sm text-white/40 mt-1">
              Rune ID 952590:379 · Bitcoin Mainnet · 21 Trillion Supply · Sealed Forever
            </p>
          </div>
          <a
            href="https://coinsniper.net/coin/91963"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold transition-colors"
          >
            <ExternalLink size={13} /> View Live Listing on Coinsniper
          </a>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<Bitcoin size={16} />} label="Chain"        value="Bitcoin (Runes)" />
          <Stat icon={<Lock size={16} />}    label="Supply sealed" value="June 2026" />
          <Stat icon={<Layers size={16} />}  label="Total Supply"  value="21 Trillion NXWV" />
          <Stat icon={<TrendingUp size={16} />} label="Mints"     value="1,000 / 1,000 ✓" />
        </div>

        {/* steps */}
        <div className="rounded-xl border border-white/8 bg-black/30 p-5 space-y-2">
          <h2 className="text-sm font-semibold text-white mb-3">How to Submit</h2>
          {STEPS.map((s) => (
            <button
              key={s.n}
              onClick={() => setActiveStep(s.n === activeStep ? 0 : s.n)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                activeStep === s.n ? "bg-purple-500 text-white" : "bg-white/10 text-white/40"
              }`}>
                {s.n}
              </div>
              <div>
                <div className="text-xs font-semibold text-white">{s.title}</div>
                <div className="text-[11px] text-white/40">{s.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* copy-ready fields */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest font-mono">
            Submission Fields — All Copy-Ready
          </h2>
          {FIELDS.map((f) => (
            <CopyField key={f.label} label={f.label} value={f.value} tip={f.tip} />
          ))}
        </div>

        {/* logo download */}
        <div className="rounded-xl border border-white/8 bg-black/30 p-5 flex items-center gap-4">
          <img
            src="/nexus-wavelength-logo.png"
            alt="NXWV logo"
            className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="flex-1">
            <div className="text-xs font-semibold text-white">Project Logo</div>
            <div className="text-[11px] text-white/40 mt-0.5">PNG · Upload directly into the Coinsniper form</div>
          </div>
          <a
            href="/nexus-wavelength-logo.png"
            download="nexus-wavelength-logo.png"
            className="text-xs font-semibold px-4 py-2 rounded-full bg-white/8 border border-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-colors"
          >
            Download
          </a>
        </div>

        {/* ordiscan verify */}
        <div className="rounded-xl border border-orange-500/15 bg-orange-900/8 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-white">Verify on Ordiscan</div>
            <div className="text-[11px] text-white/40 mt-0.5">On-chain proof for Coinsniper reviewers</div>
          </div>
          <a
            href="https://ordiscan.com/rune/NEXUS%E2%80%A2WAVELENGTH"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <ExternalLink size={11} /> Ordiscan
          </a>
        </div>

        {/* pipeline tip */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-900/10 p-4 flex items-start gap-3">
          <Zap size={15} className="text-cyan-400 mt-0.5 shrink-0" />
          <div className="text-[11px] text-white/50 leading-relaxed">
            <span className="text-white font-semibold text-xs">Buy URL tip: </span>
            set <span className="font-mono text-cyan-300">wnsp.io/rune-pipeline</span> as the "Buy" link
            on the Coinsniper listing — sends traders directly into the NexusOS acquisition flow.
          </div>
        </div>

      </div>
    </div>
  );
}
