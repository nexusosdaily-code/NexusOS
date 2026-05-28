import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Copy, CheckCircle2, ExternalLink, Bitcoin, Shield, Zap, Waves,
  ChevronDown, ChevronUp, Search, RefreshCw, Link2, Globe, Hash
} from "lucide-react";

// ── CE Table generator ──────────────────────────────────────────────────────
const BAND_WIDTH = 400 / 128;
const C = 3e8, H = 6.626e-34, EV = 1.602e-19;

function ceEncode(code: number) {
  const band = code % 128;
  const lambda = 380 + band * BAND_WIDTH + BAND_WIDTH / 2;
  const freq = (C / (lambda * 1e-9)) / 1e12;
  const energy = (H * freq * 1e12) / EV;
  const wdm = Math.floor(((lambda - 380) / 400) * 256);
  const oam = code % 50;
  const pol = code % 2 === 0 ? "H" : "V";
  return { band, lambda, freq, energy, wdm, oam, pol };
}

function addressToChannel(addr: string) {
  let sumLambda = 0, sumCode = 0;
  for (let i = 0; i < addr.length; i++) {
    const code = addr.charCodeAt(i);
    const { lambda } = ceEncode(code);
    sumLambda += lambda; sumCode += code;
  }
  const meanLambda = sumLambda / addr.length;
  const wdm = Math.floor(((meanLambda - 380) / 400) * 256);
  const oam = sumCode % 50;
  const pol = sumCode % 2 === 0 ? "H" : "V";
  const freq = (C / (meanLambda * 1e-9)) / 1e12;
  const energy = (H * freq * 1e12) / EV;
  return { wdm, oam, pol, lambda: meanLambda, freq, energy, psi: `Ψ(${wdm},${oam},${pol})` };
}

function generateCETableASCII(): string {
  const lines: string[] = [
    "WNSP-CE-TABLE-v1.0",
    "Wavelength Network Spectral Protocol — Character Encoding Table",
    "Algorithm: CE_TABLE[charCode % 128] | 128 bands | 380-780nm | 3.125nm/band",
    "AGPL-3.0 | NexusOS | First inscription: 2026",
    "═".repeat(72),
    "CHAR  CODE  BAND  LAMBDA(nm)   FREQ(THz)    ENERGY(eV)   PSI_CHANNEL",
    "─".repeat(72),
  ];
  for (let code = 32; code < 127; code++) {
    const { band, lambda, freq, energy, wdm, oam, pol } = ceEncode(code);
    const char = code === 32 ? "SPC" : String.fromCharCode(code);
    const psi = `PS(${wdm},${oam},${pol})`;
    lines.push(`${char.padEnd(6)}${String(code).padEnd(6)}${String(band).padEnd(6)}${lambda.toFixed(4).padEnd(13)}${freq.toFixed(6).padEnd(13)}${energy.toFixed(6).padEnd(13)}${psi}`);
  }
  lines.push("─".repeat(72));
  lines.push("VERIFICATION: SHA256 of this table = canonical CE-v1 fingerprint");
  lines.push("SOURCE: https://wnsp.io | https://wnsp.tech");
  return lines.join("\n");
}

const WNSP_SPEC_ASCII = `WNSP-SPEC-v1.0
Wavelength Network Spectral Protocol — Core Specification
AGPL-3.0 | NexusOS | First public disclosure: 2026-05-16
${"═".repeat(72)}

CHANNEL SPACE
  WDM channels  : 256  (wavelength-division multiplexed, 380-780nm)
  OAM modes     : 50   (orbital angular momentum)
  Polarisations : 2    (H horizontal, V vertical)
  Total channels: 25,600 orthogonal Psi channels

ORTHOGONALITY
  <Psi_i|Psi_j> = 0 for all i != j
  Enforced by quantum mechanics, not software policy.

CHARACTER ENCODING (CE v1.0)
  CE_TABLE[charCode % 128]
  lambda = 380 + (charCode % 128) * 3.125 + 1.5625 (nm)
  f = c / lambda  |  E = hf

COMPRESSION STATE EQUATION
  Lambda_compress = hf / c^2
  First unobserved oscillation -> origin of universe

AUTHORITY BANDS
  SYSTEM : lambda < 450nm  (violet, highest energy)
  KERNEL : lambda 450-495nm
  USER   : lambda 495-590nm
  GUEST  : lambda > 590nm  (red, lowest energy)

WNSP URI FORMAT
  wnsp://Psi(wdm,oam,pol)/path
  DNS-free, censorship-proof, physics-derived

HARDWARE ROADMAP
  SNIC  -- Spectral Network Interface Card
  PHR-1 -- Photonic Hardware Router
  Spectral Relay Mesh v1
  WavelengthScript Compiler alpha

SOURCE: https://wnsp.io
${"─".repeat(72)}
This inscription is permanent. The protocol is free.`;

const CE_TABLE_ASCII = generateCETableASCII();

// ── Copy button ─────────────────────────────────────────────────────────────
function CopyBtn({ text, label = "Copy ASCII" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all">
      {copied ? <><CheckCircle2 size={10} className="text-emerald-400" /> Copied</> : <><Copy size={10} /> {label}</>}
    </button>
  );
}

// ── Live Resolver ──────────────────────────────────────────────────────────
function LiveResolver() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function resolve() {
    const name = input.trim().toLowerCase();
    if (!name) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`/api/btc-bridge/resolve/${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resolution failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-900/5 p-5 space-y-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60 mb-1">Live Bridge Resolver</div>
        <p className="text-xs text-white/50">Enter a Bitcoin name → get its WNSP Ψ channel instantly.</p>
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && resolve()}
          placeholder="wnsp.sats  /  wnsp.btc  /  bc1p..."
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/40"
          data-testid="input-btc-resolver"
        />
        <button onClick={resolve} disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-mono hover:bg-cyan-500/30 transition-all disabled:opacity-40 flex items-center gap-2"
          data-testid="button-btc-resolve">
          {loading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
          Resolve
        </button>
      </div>

      {error && <div className="text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

      {result && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Name", value: result.name, color: "#fbbf24" },
              { label: "Type", value: result.nameType?.toUpperCase(), color: "#a78bfa" },
              { label: "Ψ Channel", value: result.psi, color: "#22d3ee" },
              { label: "λ (nm)", value: result.lambdaNm ? Number(result.lambdaNm).toFixed(2) + " nm" : "—", color: "#34d399" },
            ].map(item => (
              <div key={item.label} className="rounded-lg bg-black/40 border border-white/5 p-2.5">
                <div className="text-[9px] font-mono text-white/30 uppercase mb-0.5">{item.label}</div>
                <div className="text-xs font-mono font-bold truncate" style={{ color: item.color }}>{item.value || "—"}</div>
              </div>
            ))}
          </div>
          {result.btcAddress && (
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-mono text-white/30 uppercase mb-0.5">Bitcoin Address</div>
                <div className="text-[11px] font-mono text-orange-300 break-all">{result.btcAddress}</div>
              </div>
              <CopyBtn text={result.btcAddress} label="Copy" />
            </div>
          )}
          {result.source && (
            <div className="text-[10px] font-mono text-white/30 flex items-center gap-1.5">
              <Link2 size={9} /> Resolved via: {result.source}
              {result.status === "live" && <span className="text-emerald-400">· live on-chain</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inscription card ────────────────────────────────────────────────────────
function InscriptionCard({ ins }: { ins: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: ins.color + "18", border: `1px solid ${ins.color}33` }}>
              <ins.icon size={16} style={{ color: ins.color }} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{ins.title}</div>
              <div className="text-[11px] text-white/40">{ins.subtitle}</div>
            </div>
          </div>
          <div className={`text-[10px] font-mono px-2.5 py-1 rounded-full border shrink-0 ${
            ins.status === "inscribed" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
            {ins.status === "inscribed" ? "✓ INSCRIBED" : "⧖ PENDING"}
          </div>
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed mb-4">{ins.why}</p>
        <div className="flex items-center gap-3 flex-wrap">
          {ins.bytes > 0 && <div className="text-[10px] font-mono text-white/20">{ins.bytes.toLocaleString()} bytes</div>}
          {ins.inscriptionId
            ? <a href={`https://ordinals.com/inscription/${ins.inscriptionId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-mono text-orange-400 hover:text-orange-300 transition-colors">
                <ExternalLink size={10} /> View on ordinals.com</a>
            : <span className="text-[10px] font-mono text-white/20">Inscription ID: pending</span>}
          {ins.content && ins.bytes > 0 && <CopyBtn text={ins.content} />}
          {ins.bytes > 0 && (
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors ml-auto">
              {expanded ? <><ChevronUp size={11} /> Hide</> : <><ChevronDown size={11} /> Preview</>}
            </button>
          )}
        </div>
      </div>
      {expanded && ins.bytes > 0 && (
        <div className="border-t border-white/5 bg-black/40 p-4 max-h-64 overflow-y-auto">
          <pre className="text-[10px] font-mono text-white/60 leading-relaxed whitespace-pre-wrap">{ins.content}</pre>
        </div>
      )}
    </div>
  );
}

// ── Bitcoin Names ecosystem cards ───────────────────────────────────────────
const NAME_TYPES = [
  {
    key: "sats",
    icon: Hash,
    color: "#f59e0b",
    badge: "wnsp.sats",
    title: ".sats Names",
    protocol: "Sats Names Protocol · Bitcoin",
    desc: "Inscribe 'wnsp.sats' directly on Bitcoin via the Sats Names protocol. Your name is an Ordinal — tradeable, transferable, permanent. Resolves to your Taproot address. Register via Unisat's built-in marketplace under the 'Names' tab.",
    steps: ["Open Unisat → Names tab", "Search 'wnsp'", "Mint wnsp.sats", "Costs ~$10–30 in BTC fees"],
    registryUrl: "https://unisat.io/market/name",
    resolveExample: "wnsp.sats",
  },
  {
    key: "btc",
    icon: Globe,
    color: "#22d3ee",
    badge: "wnsp.btc",
    title: ".btc Domains",
    protocol: "Bitcoin Name System · Stacks L2",
    desc: "BNS (.btc) domains live on Stacks, a Bitcoin L2. 'wnsp.btc' resolves to a Bitcoin address and can serve a website via IPFS. Fully on-chain, censorship-proof, owned forever with one upfront payment. Register via btc.us or app.stacks.id.",
    steps: ["Visit app.stacks.id or btc.us", "Search 'wnsp'", "Register wnsp.btc", "Link to bc1p Taproot address"],
    registryUrl: "https://btc.us",
    resolveExample: "wnsp.btc",
  },
  {
    key: "4letter",
    icon: Bitcoin,
    color: "#a78bfa",
    badge: '"wnsp"',
    title: "4-Letter Ordinal",
    protocol: "Raw Bitcoin Ordinal Inscription",
    desc: "Inscribe the 4 characters 'wnsp' as a raw text Ordinal. 4-letter inscriptions are genuinely scarce — early inscription numbers cannot be re-created. This creates an immutable on-chain timestamp that the word 'wnsp' was claimed on Bitcoin at a specific block height.",
    steps: ["Open Unisat → Inscribe → Text", "Type exactly: wnsp", "Set content-type: text/plain", "Confirm with Taproot (bc1p) wallet"],
    registryUrl: "https://unisat.io/inscribe",
    resolveExample: "wnsp",
  },
];

function NameCard({ item }: { item: typeof NAME_TYPES[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: item.color + "18", border: `1px solid ${item.color}33` }}>
            <item.icon size={16} style={{ color: item.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-white">{item.title}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ backgroundColor: item.color + "15", color: item.color, border: `1px solid ${item.color}30` }}>
                {item.badge}
              </span>
            </div>
            <div className="text-[10px] font-mono text-white/30">{item.protocol}</div>
          </div>
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed mb-4">{item.desc}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <a href={item.registryUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-mono hover:opacity-80 transition-opacity"
            style={{ color: item.color }}>
            <ExternalLink size={10} /> Register now
          </a>
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors ml-auto">
            {open ? <><ChevronUp size={11} /> Hide steps</> : <><ChevronDown size={11} /> How to</>}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/5 bg-black/40 p-4">
          <div className="space-y-1.5">
            {item.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-[9px] font-mono mt-0.5 shrink-0" style={{ color: item.color + "80" }}>0{i + 1}</span>
                <span className="text-[11px] text-white/60">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
const INSCRIPTIONS = [
  {
    id: "CE-TABLE-v1", title: "WNSP CE Encoding Table", subtitle: "128-band character-to-wavelength lookup table",
    icon: Zap, color: "#fbbf24", status: "pending", inscriptionId: null,
    why: "The CE table is the atomic unit of WNSP. Every character anyone ever encodes traces back to this table. On Bitcoin it becomes permanently and independently verifiable by any physicist — no server, no company required.",
    content: CE_TABLE_ASCII, bytes: new TextEncoder().encode(CE_TABLE_ASCII).length,
  },
  {
    id: "SPEC-v1", title: "WNSP Core Specification", subtitle: "Channel space, orthogonality, URI format, authority bands",
    icon: Waves, color: "#22d3ee", status: "pending", inscriptionId: null,
    why: "The 25,600-channel Hilbert space, Ψ notation, compression state equation, and authority band system — timestamped on Bitcoin as the canonical protocol reference. Owned by no one.",
    content: WNSP_SPEC_ASCII, bytes: new TextEncoder().encode(WNSP_SPEC_ASCII).length,
  },
  {
    id: "HARDWARE-SPEC-v1", title: "Hardware Spec (AGPL-3.0)", subtitle: "SNIC, PHR-1, Spectral Relay Mesh v1, WavelengthScript Compiler α",
    icon: Shield, color: "#a78bfa", status: "pending", inscriptionId: null,
    why: "First published 2026-05-16. The Bitcoin timestamp proves prior art — verifiable by any court or patent office. AGPL-3.0 protects the IP. Bitcoin preserves the proof.",
    content: "", bytes: 0,
  },
];

export default function WnspOrdinalsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <Link href="/wnsp" className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1.5 transition-colors">← WNSP</Link>
        <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">Bitcoin · Ordinals · Names · Bridge</span>
        <Link href="/hardware-spec" className="text-[11px] font-mono px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1.5 hover:bg-orange-500/20 transition-colors">
          <Shield size={10} /> AGPL-3.0
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-14">

        {/* Hero */}
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
            <Bitcoin size={11} /> WNSP × Bitcoin Ordinals
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            The protocol lives<br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">on Bitcoin. Forever.</span>
          </h1>
          <p className="text-white/50 text-sm max-w-xl mx-auto leading-relaxed">
            Three inscriptions anchor WNSP permanently on Bitcoin. Three Bitcoin names claim the identity on-chain.
            One bridge resolves all of it to WNSP Ψ channels — automatically.
          </p>
        </div>

        {/* Live Bridge Resolver */}
        <LiveResolver />

        {/* Bitcoin Names */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Bitcoin Identity Layer</div>
            <h2 className="text-lg font-bold text-white">Claim WNSP on Bitcoin's naming systems.</h2>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              Three different protocols, all on-chain, all censorship-proof. Each maps automatically to a WNSP Ψ channel via the bridge.
            </p>
          </div>
          <div className="space-y-4">
            {NAME_TYPES.map(item => <NameCard key={item.key} item={item} />)}
          </div>
        </div>

        {/* How the bridge works */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-blue-900/5 p-6 space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400/60">How the Bridge Works</div>
          <h2 className="text-lg font-bold text-white">Name → Address → Ψ Channel. Fully automated.</h2>
          <div className="space-y-3">
            {[
              { step: "01", color: "#f59e0b", label: "Resolve name", detail: "wnsp.sats → Unisat API → bc1p... Taproot address. wnsp.btc → Stacks BNS API → STX/BTC address." },
              { step: "02", color: "#22d3ee", label: "CE-encode the address", detail: "Every character of the Bitcoin address is run through the WNSP CE algorithm. Each character maps to a wavelength (380–780nm)." },
              { step: "03", color: "#a78bfa", label: "Derive the Ψ channel", detail: "Mean wavelength → WDM index. Sum of char codes → OAM mode (% 50). Sum parity → Polarisation (H/V). Result: Ψ(wdm, oam, pol)." },
              { step: "04", color: "#34d399", label: "Bridge routes traffic", detail: "Any WNSP packet addressed to wnsp.sats is routed through the derived Ψ channel — physics-determined, deterministic, reproducible by anyone." },
            ].map(s => (
              <div key={s.step} className="flex gap-4 p-3.5 rounded-xl border border-white/5 bg-black/20">
                <div className="text-xl font-bold font-mono shrink-0 opacity-30" style={{ color: s.color }}>{s.step}</div>
                <div>
                  <div className="text-xs font-semibold text-white mb-0.5">{s.label}</div>
                  <div className="text-[11px] text-white/50 leading-relaxed">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[10px] font-mono text-violet-300/50 pt-1">
            The bridge is open-source and runs on NexusOS. The algorithm is deterministic — anyone can verify the channel derivation independently.
          </div>
        </div>

        {/* Data Inscriptions */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Protocol Data Inscriptions</div>
            <h2 className="text-lg font-bold text-white">Three inscriptions. The entire foundation.</h2>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">ASCII text inscribed permanently on Bitcoin. Copy → paste into Unisat Inscribe → Text. Use your bc1p Taproot wallet.</p>
          </div>
          <div className="space-y-4">
            {INSCRIPTIONS.map(ins => <InscriptionCard key={ins.id} ins={ins} />)}
          </div>
        </div>

        {/* Inscription steps */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">How to Inscribe</div>
            <h2 className="text-lg font-bold text-white">Unisat · Taproot (bc1p) · text/plain</h2>
          </div>
          <div className="space-y-3">
            {[
              { step: "01", title: "Fund your Unisat Taproot wallet", detail: "Make sure your bc1p... wallet has BTC. Inscription fees are typically $5–30 depending on network congestion. Check the current fee rate at mempool.space." },
              { step: "02", title: "Copy the ASCII content", detail: "Use the Copy ASCII button on each inscription card above. The text is the exact canonical content — do not modify it." },
              { step: "03", title: "Inscribe as text/plain", detail: "In Unisat: Inscribe → Text → paste the content → set content type to text/plain → review fee → confirm with bc1p Taproot address." },
              { step: "04", title: "Share the inscription ID", detail: "Once mined you'll receive an inscription ID (hex string ending in 'i0'). Share it and we'll update this page with the live ordinals.com link." },
            ].map(s => (
              <div key={s.step} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="text-2xl font-bold font-mono shrink-0 opacity-20">{s.step}</div>
                <div>
                  <div className="text-sm font-semibold text-white mb-1">{s.title}</div>
                  <div className="text-[11px] text-white/50 leading-relaxed">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] font-mono text-white/20 space-y-1 pb-4">
          <div>WNSP × Bitcoin Ordinals · AGPL-3.0 · Open protocol</div>
          <div className="flex items-center justify-center gap-4 pt-1">
            <Link href="/wnsp" className="hover:text-white/50 transition-colors">WNSP Home</Link>
            <Link href="/hardware-spec" className="hover:text-white/50 transition-colors">Hardware Spec</Link>
            <Link href="/campaign" className="hover:text-white/50 transition-colors">Campaign</Link>
            <a href="https://ordinals.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors flex items-center gap-1">ordinals.com <ExternalLink size={9} /></a>
            <a href="https://mempool.space" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors flex items-center gap-1">mempool.space <ExternalLink size={9} /></a>
          </div>
        </div>

      </div>
    </div>
  );
}
